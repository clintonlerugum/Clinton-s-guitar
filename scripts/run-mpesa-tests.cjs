const path = require('path')
require('@next/env').loadEnvConfig(process.cwd())

const assert = require('assert').strict
const fs = require('fs')
const { spawn } = require('child_process')
const http = require('http')
const net = require('net')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function isSet(value) {
  return Boolean(value && value.trim())
}

function assertSafeEnvironment() {
  assert.notEqual(process.env.PAYMENT_MODE, 'live', 'Refusing tests while PAYMENT_MODE=live')
  assert.notEqual(process.env.MPESA_ENVIRONMENT, 'production', 'Refusing tests while MPESA_ENVIRONMENT=production')
  assert.equal(process.env.MPESA_ENVIRONMENT || 'sandbox', 'sandbox')
  assert.match(process.env.DATABASE_URL || '', /^file:/, 'Tests require the existing SQLite database')
  assert(
    !['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY'].some((key) => isSet(process.env[key])),
    'Refusing tests when M-Pesa credentials are configured; this suite uses fake local credentials only'
  )
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Could not allocate a local test port'))
        return
      }
      const { port } = address
      server.close((error) => error ? reject(error) : resolve(port))
    })
  })
}

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk.toString() })
    child.stderr.on('data', (chunk) => { output += chunk.toString() })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve({ code, signal, output }))
    return child
  })
}

function startProcess(command, args, env) {
  const child = spawn(command, args, { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk.toString() })
  child.stderr.on('data', (chunk) => { output += chunk.toString() })
  return { child, getOutput: () => output }
}

async function waitForServer(url, processHandle) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (processHandle.child.exitCode !== null) {
      throw new Error(`Local Next.js test server exited early:\n${processHandle.getOutput()}`)
    }
    try {
      const response = await fetch(url)
      if (response.status < 500) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out starting local Next.js test server:\n${processHandle.getOutput()}`)
}

async function closeServer(server) {
  if (!server) return
  await new Promise((resolve) => server.close(resolve))
}

async function main() {
  assertSafeEnvironment()
  const providerRequests = new Map()
  let testBuildDirectory
  const mockServer = http.createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const rawBody = Buffer.concat(chunks).toString()

    res.setHeader('Content-Type', 'application/json')
    if (req.url?.startsWith('/oauth/v1/generate')) {
      res.writeHead(200).end(JSON.stringify({ access_token: 'local-mock-access-token' }))
      return
    }
    if (req.url?.startsWith('/__test__/metrics')) {
      const checkoutRequestId = new URL(req.url, 'http://localhost').searchParams.get('checkoutRequestId')
      res.writeHead(200).end(JSON.stringify({ count: providerRequests.get(checkoutRequestId) || 0 }))
      return
    }
    if (req.url !== '/mpesa/stkpushquery/v1/query') {
      res.writeHead(404).end(JSON.stringify({ error: 'Not found' }))
      return
    }

    let query
    try {
      query = JSON.parse(rawBody)
    } catch {
      res.writeHead(400).end(JSON.stringify({ error: 'Invalid query' }))
      return
    }
    const checkoutRequestId = query.CheckoutRequestID
    providerRequests.set(checkoutRequestId, (providerRequests.get(checkoutRequestId) || 0) + 1)
    if (checkoutRequestId.includes('RECON-QUERY-AMBIGUOUS')) {
      res.writeHead(503).end(JSON.stringify({ ResponseDescription: 'Mock provider temporarily unavailable' }))
      return
    }
    const payment = await prisma.payment.findUnique({ where: { checkoutRequestId } })
    const resultCode = checkoutRequestId.includes('RECON-FAIL') ? '1032'
      : checkoutRequestId.includes('RECON-PENDING') ? '500.001.1001'
        : '0'
    const statusResponse = {
      ResponseCode: '0',
      CheckoutRequestID: checkoutRequestId.includes('RECON-WRONG-ID') ? `WRONG-${checkoutRequestId}` : checkoutRequestId,
      ResultCode: resultCode
    }
    if (resultCode === '0' && payment) {
      statusResponse.Amount = checkoutRequestId.includes('RECON-WRONG-AMOUNT') ? payment.amount + 1 : payment.amount
      statusResponse.PhoneNumber = payment.phone
      statusResponse.MpesaReceiptNumber = `R${Buffer.from(checkoutRequestId).toString('hex').slice(0, 10).toUpperCase()}`
    }
    res.writeHead(200).end(JSON.stringify(statusResponse))
  })

  let nextProcess
  try {
    await new Promise((resolve, reject) => {
      mockServer.once('error', reject)
      mockServer.listen(0, '127.0.0.1', resolve)
    })
    const mockAddress = mockServer.address()
    assert(mockAddress && typeof mockAddress !== 'string')
    const mockUrl = `http://127.0.0.1:${mockAddress.port}`
    const appPort = await findFreePort()
    const appUrl = `http://127.0.0.1:${appPort}`
    testBuildDirectory = `.next-mpesa-test-${process.pid}-${Date.now()}`
    const testEnvironment = {
      ...process.env,
      PAYMENT_MODE: 'demo',
      MPESA_ENVIRONMENT: 'sandbox',
      MPESA_API_BASE_URL: mockUrl,
      MPESA_TEST_BASE_URL: appUrl,
      MPESA_MOCK_PROVIDER_URL: mockUrl,
      MPESA_CONSUMER_KEY: 'local-test-key',
      MPESA_CONSUMER_SECRET: 'local-test-secret',
      MPESA_SHORTCODE: '000000',
      MPESA_PASSKEY: 'local-test-passkey',
      MPESA_CALLBACK_URL: 'https://localhost.invalid/callback',
      NEXT_DIST_DIR: testBuildDirectory,
      NODE_ENV: 'development'
    }

    const nextCli = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
    nextProcess = startProcess(process.execPath, [nextCli, 'dev', '-p', String(appPort)], testEnvironment)
    await waitForServer(`${appUrl}/api/auth/me`, nextProcess)

    const testRun = await run(process.execPath, [path.join(process.cwd(), 'scripts', 'test-mpesa-flow.cjs')], testEnvironment)
    if (testRun.output) process.stdout.write(testRun.output)
    assert.equal(testRun.code, 0, `Payment flow tests failed with exit code ${testRun.code}`)
  } finally {
    if (nextProcess && nextProcess.child.exitCode === null) {
      nextProcess.child.kill()
      await new Promise((resolve) => nextProcess.child.once('exit', resolve))
    }
    await closeServer(mockServer)
    if (testBuildDirectory) fs.rmSync(path.join(process.cwd(), testBuildDirectory), { recursive: true, force: true })
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Could not run isolated local payment tests')
  process.exitCode = 1
})
