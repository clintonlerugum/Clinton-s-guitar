const path = require('path')
process.env.TS_NODE_PROJECT = path.join(process.cwd(), 'scripts', 'tsconfig.json')
require('ts-node/register/transpile-only')
require('@next/env').loadEnvConfig(process.cwd())

const assert = require('assert').strict
const fs = require('fs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { initiateStkPush, MpesaRequestError } = require('../lib/mpesa')
const prisma = new PrismaClient()
const baseUrl = process.env.MPESA_TEST_BASE_URL || 'http://localhost:3003'
const mockProviderUrl = process.env.MPESA_MOCK_PROVIDER_URL
let testUser

function assertSafeTestEnvironment() {
  const target = new URL(baseUrl)
  assert(['localhost', '127.0.0.1', '::1'].includes(target.hostname), 'Tests may only call a local server')
  assert.notEqual(process.env.PAYMENT_MODE, 'live', 'Refusing to test while PAYMENT_MODE=live')
  assert.notEqual(process.env.MPESA_ENVIRONMENT, 'production', 'Refusing to test production M-Pesa environment')
  assert.equal(process.env.MPESA_ENVIRONMENT || 'sandbox', 'sandbox', 'M-Pesa environment must remain sandbox')
  assert.match(process.env.DATABASE_URL || '', /^file:/, 'Tests require the local SQLite database')
  assert(process.env.JWT_SECRET && process.env.JWT_SECRET !== 'replace_with_a_secure_random_value', 'A local JWT_SECRET must be configured')
}

function callbackPayload({ checkoutRequestId, merchantRequestId, resultCode = 0, amount, phone, receipt }) {
  const stkCallback = { CheckoutRequestID: checkoutRequestId, MerchantRequestID: merchantRequestId, ResultCode: resultCode }
  if (resultCode === 0) {
    stkCallback.CallbackMetadata = {
      Item: [
        { Name: 'Amount', Value: amount },
        { Name: 'MpesaReceiptNumber', Value: receipt },
        { Name: 'PhoneNumber', Value: phone }
      ]
    }
  }
  return { Body: { stkCallback } }
}

function mockReceipt(checkoutRequestId) {
  return `R${Buffer.from(checkoutRequestId).toString('hex').slice(0, 10).toUpperCase()}`
}

async function api(pathname, options = {}) {
  return fetch(new URL(pathname, baseUrl), options)
}

async function sendCallback(payload, rawBody) {
  return api('/api/payments/mpesa/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody ?? JSON.stringify(payload)
  })
}

async function reconcileOrder(orderId, token) {
  const response = await api('/api/payments/mpesa/reconcile', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Cookie: `token=${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ orderId })
  })
  assert.equal(response.status, 303, `Reconciliation should redirect, got ${response.status}`)
  const location = response.headers.get('location')
  assert(location, 'Reconciliation must redirect to the owned pending order')
  return new URL(location).searchParams.get('reconciled')
}

async function mockQueryCount(checkoutRequestId) {
  const response = await fetch(new URL(`/__test__/metrics?checkoutRequestId=${encodeURIComponent(checkoutRequestId)}`, mockProviderUrl))
  assert.equal(response.status, 200)
  return (await response.json()).count
}

async function createPendingOrder(product, token, suffix) {
  const ordersBefore = await prisma.order.count({ where: { userId: testUser.id } })
  const paymentsBefore = await prisma.payment.count({ where: { order: { userId: testUser.id } } })
  const cart = encodeURIComponent(JSON.stringify([{ productId: product.id, quantity: 1 }]))
  const response = await api('/api/checkout', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Cookie: `token=${token}; cart=${cart}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ phone: '0712345678', amount: '1', total: '1' })
  })
  assert.equal(response.status, 307, `Demo checkout should redirect, got ${response.status}`)
  const location = response.headers.get('location')
  assert(location, 'Checkout must return a pending-order location')
  const url = new URL(location)
  const orderId = url.searchParams.get('orderId')
  assert(orderId, 'Checkout redirect must contain the created order ID')
  assert(url.searchParams.get('demo') === '1', 'Checkout must remain in demo mode')
  assert((response.headers.get('set-cookie') || '').includes('Max-Age=0'), 'Checkout must clear its cart cookie')

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true }
  })
  assert(order, 'Checkout must create one order')
  assert.equal(order.userId, testUser.id)
  assert.equal(order.status, 'PENDING')
  assert.equal(order.total, product.price, 'Order amount must come from the database, not submitted form values')
  assert.equal(order.items.length, 1)
  assert.equal(order.items[0].quantity, 1)
  assert.equal(order.items[0].priceAtPurchase, product.price)
  assert(order.payment, 'Checkout must create the related payment')
  assert.equal(order.payment.status, 'PENDING')
  assert.equal(order.payment.amount, product.price)
  assert.equal(order.payment.phone, '254712345678')
  assert.equal(await prisma.order.count({ where: { userId: testUser.id } }), ordersBefore + 1)
  assert.equal(await prisma.payment.count({ where: { order: { userId: testUser.id } } }), paymentsBefore + 1)

  const merchantRequestId = `TEST-MERCHANT-${suffix}`
  const checkoutRequestId = `TEST-CHECKOUT-${suffix}`
  await prisma.payment.update({
    where: { orderId },
    data: { merchantRequestId, checkoutRequestId }
  })
  return { order, merchantRequestId, checkoutRequestId }
}

async function testAmbiguousStkTimeout() {
  const environmentKeys = [
    'MPESA_CONSUMER_KEY',
    'MPESA_CONSUMER_SECRET',
    'MPESA_SHORTCODE',
    'MPESA_PASSKEY',
    'MPESA_CALLBACK_URL',
    'MPESA_ENVIRONMENT'
  ]
  const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]))
  const originalFetch = global.fetch
  const requestedHosts = []
  try {
    process.env.MPESA_CONSUMER_KEY = 'local-test-key'
    process.env.MPESA_CONSUMER_SECRET = 'local-test-secret'
    process.env.MPESA_SHORTCODE = '000000'
    process.env.MPESA_PASSKEY = 'local-test-passkey'
    process.env.MPESA_CALLBACK_URL = 'https://localhost.invalid/callback'
    process.env.MPESA_ENVIRONMENT = 'sandbox'
    let requestBody
    global.fetch = async (input, init) => {
      const url = new URL(String(input))
      requestedHosts.push(url.hostname)
      assert.equal(url.origin, mockProviderUrl, 'A test attempted to contact a non-local provider')
      if (url.pathname.startsWith('/oauth/')) {
        return new Response(JSON.stringify({ access_token: 'local-test-token' }), { status: 200 })
      }
      requestBody = JSON.parse(init.body)
      throw new TypeError('Simulated network timeout after STK submission')
    }

    await assert.rejects(
      initiateStkPush({
        amount: 100,
        phone: '254712345678',
        accountReference: 'LOCAL-TEST-ORDER',
        transactionDescription: 'Local timeout simulation'
      }),
      (error) => error instanceof MpesaRequestError && error.outcome === 'ambiguous'
    )
    assert.deepEqual(requestedHosts, [new URL(mockProviderUrl).hostname, new URL(mockProviderUrl).hostname])
    assert.equal(requestBody.Amount, 100, 'STK request amount must be the server-provided amount')

    requestedHosts.length = 0
    global.fetch = async (input) => {
      const url = new URL(String(input))
      requestedHosts.push(url.hostname)
      assert.equal(url.origin, mockProviderUrl)
      if (url.pathname.startsWith('/oauth/')) {
        return new Response(JSON.stringify({ access_token: 'local-test-token' }), { status: 200 })
      }
      return new Response(JSON.stringify({
        ResponseCode: '0',
        MerchantRequestID: 'LOCAL-MERCHANT-ID',
        CheckoutRequestID: 'LOCAL-CHECKOUT-ID'
      }), { status: 200 })
    }
    const accepted = await initiateStkPush({
      amount: 100,
      phone: '254712345678',
      accountReference: 'LOCAL-TEST-ORDER',
      transactionDescription: 'Local accepted-request simulation'
    })
    assert.equal(accepted.CheckoutRequestID, 'LOCAL-CHECKOUT-ID')
    assert.equal(requestedHosts.length, 2)

    global.fetch = async (input) => {
      const url = new URL(String(input))
      assert.equal(url.origin, mockProviderUrl)
      if (url.pathname.startsWith('/oauth/')) {
        return new Response(JSON.stringify({ access_token: 'local-test-token' }), { status: 200 })
      }
      return new Response(JSON.stringify({ ResponseCode: '1', ResponseDescription: 'Rejected in local simulation' }), { status: 200 })
    }
    await assert.rejects(
      initiateStkPush({
        amount: 100,
        phone: '254712345678',
        accountReference: 'LOCAL-TEST-ORDER',
        transactionDescription: 'Local rejection simulation'
      }),
      (error) => error instanceof MpesaRequestError && error.outcome === 'failed'
    )

    global.fetch = async (input) => {
      const url = new URL(String(input))
      assert.equal(url.origin, mockProviderUrl)
      if (url.pathname.startsWith('/oauth/')) {
        return new Response(JSON.stringify({ access_token: 'local-test-token' }), { status: 200 })
      }
      return new Response(JSON.stringify({
        ResponseCode: '1',
        MerchantRequestID: 'LOCAL-AMBIGUOUS-MERCHANT',
        CheckoutRequestID: 'LOCAL-AMBIGUOUS-CHECKOUT'
      }), { status: 503 })
    }
    await assert.rejects(
      initiateStkPush({
        amount: 100,
        phone: '254712345678',
        accountReference: 'LOCAL-TEST-ORDER',
        transactionDescription: 'Local HTTP 503 simulation'
      }),
      (error) => error instanceof MpesaRequestError &&
        error.outcome === 'ambiguous' &&
        error.checkoutRequestId === 'LOCAL-AMBIGUOUS-CHECKOUT' &&
        error.merchantRequestId === 'LOCAL-AMBIGUOUS-MERCHANT'
    )
    console.log('PASS: sandbox STK acceptance, rejection, network timeout, and HTTP 503 with recoverable IDs were mocked locally')
  } finally {
    global.fetch = originalFetch
    for (const key of environmentKeys) {
      if (originalEnvironment[key] === undefined) delete process.env[key]
      else process.env[key] = originalEnvironment[key]
    }
  }
}

async function main() {
  assertSafeTestEnvironment()
  const products = await prisma.product.findMany({
    where: { published: true, currency: 'KES', fullPdf: { not: null } },
    take: 2
  })
  assert.equal(products.length, 2, 'Two published KES products with protected PDFs are required')
  for (const product of products) {
    const protectedRoot = path.resolve(process.cwd(), process.env.STORAGE_ROOT || './storage', 'protected')
    const filePath = path.resolve(process.cwd(), product.fullPdf.replace(/^\//, ''))
    assert(filePath.startsWith(`${protectedRoot}${path.sep}`), 'Test product PDF must be inside protected storage')
    assert(fs.existsSync(filePath), 'Test product PDF must exist')
  }

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`
  testUser = await prisma.user.create({
    data: {
      email: `mpesa-flow-${suffix}@example.invalid`,
      password: 'not-used-by-test',
      name: 'Temporary M-Pesa flow test'
    }
  })
  const token = jwt.sign({ id: testUser.id, email: testUser.email, role: 'CUSTOMER' }, process.env.JWT_SECRET, { expiresIn: '1h' })
  const authCookie = `token=${token}`

  const beforePayment = await api(`/api/download/${products[0].id}`, { headers: { Cookie: authCookie } })
  assert.equal(beforePayment.status, 403, `Download must be denied before payment: ${await beforePayment.text()}`)

  const reconciledSuccess = await createPendingOrder(products[0], token, `${suffix}-RECON-SUCCESS`)
  assert.equal(await reconcileOrder(reconciledSuccess.order.id, token), 'paid')
  const reconciledPaidOrder = await prisma.order.findUnique({
    where: { id: reconciledSuccess.order.id },
    include: { payment: true }
  })
  assert.equal(reconciledPaidOrder.status, 'PAID')
  assert.equal(reconciledPaidOrder.payment.status, 'PAID')
  assert.equal(reconciledPaidOrder.payment.receiptNumber, mockReceipt(reconciledSuccess.checkoutRequestId))
  assert.equal(await prisma.download.count({ where: { userId: testUser.id, productId: products[0].id } }), 1)
  const reconciliationCount = await mockQueryCount(reconciledSuccess.checkoutRequestId)
  assert.equal(await reconcileOrder(reconciledSuccess.order.id, token), 'paid')
  assert.equal(await mockQueryCount(reconciledSuccess.checkoutRequestId), reconciliationCount, 'Already-paid orders must not query provider again')
  assert.equal(await prisma.download.count({ where: { userId: testUser.id, productId: products[0].id } }), 1)

  const reconciledFailure = await createPendingOrder(products[1], token, `${suffix}-RECON-FAIL`)
  assert.equal(await reconcileOrder(reconciledFailure.order.id, token), 'failed')
  const failedReconciliationOrder = await prisma.order.findUnique({
    where: { id: reconciledFailure.order.id },
    include: { payment: true }
  })
  assert.equal(failedReconciliationOrder.status, 'FAILED')
  assert.equal(failedReconciliationOrder.payment.status, 'FAILED')
  assert.equal(await prisma.download.count({ where: { userId: testUser.id, productId: products[1].id } }), 0)

  const stillProcessing = await createPendingOrder(products[0], token, `${suffix}-RECON-PENDING`)
  assert.equal(await reconcileOrder(stillProcessing.order.id, token), 'pending')
  let stillPending = await prisma.order.findUnique({ where: { id: stillProcessing.order.id }, include: { payment: true } })
  assert.equal(stillPending.status, 'PENDING')
  assert.equal(stillPending.payment.status, 'PENDING')

  const wrongReconciliationId = await createPendingOrder(products[0], token, `${suffix}-RECON-WRONG-ID`)
  assert.equal(await reconcileOrder(wrongReconciliationId.order.id, token), 'unverified')
  stillPending = await prisma.order.findUnique({ where: { id: wrongReconciliationId.order.id }, include: { payment: true } })
  assert.equal(stillPending.status, 'PENDING')
  assert.equal(stillPending.payment.status, 'PENDING')

  const wrongReconciliationAmount = await createPendingOrder(products[0], token, `${suffix}-RECON-WRONG-AMOUNT`)
  assert.equal(await reconcileOrder(wrongReconciliationAmount.order.id, token), 'unverified')
  stillPending = await prisma.order.findUnique({ where: { id: wrongReconciliationAmount.order.id }, include: { payment: true } })
  assert.equal(stillPending.status, 'PENDING')
  assert.equal(stillPending.payment.status, 'PENDING')

  const ambiguousQuery = await createPendingOrder(products[0], token, `${suffix}-RECON-QUERY-AMBIGUOUS`)
  assert.equal(await reconcileOrder(ambiguousQuery.order.id, token), 'pending')
  stillPending = await prisma.order.findUnique({ where: { id: ambiguousQuery.order.id }, include: { payment: true } })
  assert.equal(stillPending.status, 'PENDING')
  assert.equal(stillPending.payment.status, 'PENDING')

  const race = await createPendingOrder(products[0], token, `${suffix}-RECON-RACE`)
  const raceCallback = callbackPayload({
    checkoutRequestId: race.checkoutRequestId,
    merchantRequestId: race.merchantRequestId,
    amount: race.order.total,
    phone: race.order.payment.phone,
    receipt: mockReceipt(race.checkoutRequestId)
  })
  const [raceReconciliation, raceCallbackResponse] = await Promise.all([
    reconcileOrder(race.order.id, token),
    sendCallback(raceCallback)
  ])
  assert.equal(raceReconciliation, 'paid')
  assert.equal(raceCallbackResponse.status, 200)
  const racePaidOrder = await prisma.order.findUnique({ where: { id: race.order.id }, include: { payment: true } })
  assert.equal(racePaidOrder.status, 'PAID')
  assert.equal(racePaidOrder.payment.status, 'PAID')
  assert.equal(await prisma.download.count({ where: { userId: testUser.id, productId: products[0].id } }), 1)

  const successful = await createPendingOrder(products[0], token, `${suffix}-SUCCESS`)
  const wrongId = await sendCallback(callbackPayload({
    checkoutRequestId: `WRONG-${suffix}`,
    merchantRequestId: successful.merchantRequestId,
    amount: successful.order.total,
    phone: successful.order.payment.phone,
    receipt: `TST${suffix.slice(-7)}`
  }))
  assert.equal(wrongId.status, 404, 'Wrong CheckoutRequestID must not find or pay an order')

  const malformedJson = await sendCallback(null, '{invalid')
  assert.equal(malformedJson.status, 400, 'Malformed JSON callback must be rejected')
  const malformedShape = await sendCallback({ Body: { stkCallback: { CheckoutRequestID: successful.checkoutRequestId } } })
  assert.equal(malformedShape.status, 400, 'Malformed callback shape must be rejected')

  const wrongMerchant = await sendCallback(callbackPayload({
    checkoutRequestId: successful.checkoutRequestId,
    merchantRequestId: `WRONG-${suffix}`,
    amount: successful.order.total,
    phone: successful.order.payment.phone,
    receipt: `TST${suffix.slice(-7)}`
  }))
  assert.equal(wrongMerchant.status, 400, 'Wrong MerchantRequestID must be rejected')

  const wrongAmount = await sendCallback(callbackPayload({
    checkoutRequestId: successful.checkoutRequestId,
    merchantRequestId: successful.merchantRequestId,
    amount: successful.order.total + 1,
    phone: successful.order.payment.phone,
    receipt: `TST${suffix.slice(-7)}`
  }))
  assert.equal(wrongAmount.status, 400, 'Wrong amount must be rejected')
  stillPending = await prisma.order.findUnique({ where: { id: successful.order.id }, include: { payment: true } })
  assert.equal(stillPending.status, 'PENDING', 'Invalid callback must not finalize the order')
  assert.equal(stillPending.payment.status, 'PENDING')

  const wrongPhone = await sendCallback(callbackPayload({
    checkoutRequestId: successful.checkoutRequestId,
    merchantRequestId: successful.merchantRequestId,
    amount: successful.order.total,
    phone: '254700000001',
    receipt: `TST${suffix.slice(-7)}`
  }))
  assert.equal(wrongPhone.status, 400, 'Wrong callback phone must be rejected')

  const invalidReceipt = await sendCallback(callbackPayload({
    checkoutRequestId: successful.checkoutRequestId,
    merchantRequestId: successful.merchantRequestId,
    amount: successful.order.total,
    phone: successful.order.payment.phone,
    receipt: '!'
  }))
  assert.equal(invalidReceipt.status, 400, 'Invalid receipt number must be rejected')
  stillPending = await prisma.order.findUnique({ where: { id: successful.order.id }, include: { payment: true } })
  assert.equal(stillPending.status, 'PENDING', 'Invalid callback fields must leave the pending payment untouched')
  assert.equal(stillPending.payment.status, 'PENDING')

  const successCallback = callbackPayload({
    checkoutRequestId: successful.checkoutRequestId,
    merchantRequestId: successful.merchantRequestId,
    amount: successful.order.total,
    phone: successful.order.payment.phone,
    receipt: `TST${suffix.slice(-7)}`
  })
  const successResponse = await sendCallback(successCallback)
  assert.equal(successResponse.status, 200, 'Valid successful callback must be accepted')
  const duplicateSuccess = await sendCallback(successCallback)
  assert.equal(duplicateSuccess.status, 200, 'Duplicate successful callback must be idempotently acknowledged')
  assert.equal((await sendCallback(callbackPayload({
    checkoutRequestId: successful.checkoutRequestId,
    merchantRequestId: successful.merchantRequestId,
    resultCode: 1032
  }))).status, 409, 'A late failed callback must be rejected without changing a paid order')
  assert.equal((await prisma.order.findUnique({ where: { id: successful.order.id } })).status, 'PAID')

  const paidOrder = await prisma.order.findUnique({ where: { id: successful.order.id }, include: { payment: true, items: true } })
  assert.equal(paidOrder.status, 'PAID')
  assert.equal(paidOrder.payment.status, 'PAID')
  assert.equal(paidOrder.payment.receiptNumber, `TST${suffix.slice(-7)}`)
  assert.equal(await prisma.download.count({ where: { userId: testUser.id, productId: products[0].id } }), 1)

  const afterPayment = await api(`/api/download/${products[0].id}`, { headers: { Cookie: authCookie } })
  assert.equal(afterPayment.status, 200, 'Download must be allowed after payment')
  assert.match(afterPayment.headers.get('content-type') || '', /application\/pdf/)

  const failed = await createPendingOrder(products[1], token, `${suffix}-FAILED`)
  const failureCallback = callbackPayload({
    checkoutRequestId: failed.checkoutRequestId,
    merchantRequestId: failed.merchantRequestId,
    resultCode: 1032
  })
  const failureResponse = await sendCallback(failureCallback)
  assert.equal(failureResponse.status, 200, 'Failed/cancelled callback must be accepted')
  assert.equal((await sendCallback(failureCallback)).status, 200, 'Duplicate failure callback must be idempotently acknowledged')
  const failedOrder = await prisma.order.findUnique({ where: { id: failed.order.id }, include: { payment: true } })
  assert.equal(failedOrder.status, 'FAILED')
  assert.equal(failedOrder.payment.status, 'FAILED')
  assert.equal(await prisma.download.count({ where: { userId: testUser.id, productId: products[1].id } }), 0)

  const restoreResponse = await api('/api/cart/restore', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Cookie: authCookie,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ orderId: failed.order.id })
  })
  assert.equal(restoreResponse.status, 303, 'Failed orders must retain the existing cart restoration flow')
  const restoredCookie = restoreResponse.headers.get('set-cookie') || ''
  const restoredValue = restoredCookie.match(/^cart=([^;]*)/)
  assert(restoredValue, 'Failed order should restore a cart cookie')
  assert.deepEqual(JSON.parse(decodeURIComponent(restoredValue[1])), [{ productId: products[1].id, quantity: 1 }])

  console.log('PASS: checkout created one pending order/payment using server product price; customer-supplied amount was ignored')
  console.log('PASS: wrong checkout/merchant IDs, amount, phone, receipt, and malformed callbacks were rejected safely')
  console.log('PASS: successful payment and duplicate callback marked PAID and created exactly one download')
  console.log('PASS: failed/cancelled payment and duplicate callback marked FAILED without granting a download; cart restoration works')
  console.log('PASS: download denied before payment and served after payment')
  console.log('PASS: status reconciliation paid/failed/pending outcomes, wrong ID/amount, duplicate run, callback race, and already-paid state')
  await testAmbiguousStkTimeout()
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'M-Pesa flow test failed')
    process.exitCode = 1
  })
  .finally(async () => {
    if (testUser) {
      await prisma.$transaction([
        prisma.download.deleteMany({ where: { userId: testUser.id } }),
        prisma.payment.deleteMany({ where: { order: { userId: testUser.id } } }),
        prisma.orderItem.deleteMany({ where: { order: { userId: testUser.id } } }),
        prisma.order.deleteMany({ where: { userId: testUser.id } }),
        prisma.user.delete({ where: { id: testUser.id } })
      ])
    }
    await prisma.$disconnect()
  })
