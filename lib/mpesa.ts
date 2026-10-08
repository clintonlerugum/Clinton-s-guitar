const sandboxBaseUrl = 'https://sandbox.safaricom.co.ke'
const productionBaseUrl = 'https://api.safaricom.co.ke'

function getBaseUrl() {
  const override = process.env.MPESA_API_BASE_URL
  if (override) {
    if (process.env.NODE_ENV === 'production') throw new Error('MPESA_API_BASE_URL override is not allowed in production.')
    const url = new URL(override)
    if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || url.protocol !== 'http:') {
      throw new Error('MPESA_API_BASE_URL must be a local HTTP URL outside production.')
    }
    return url.origin
  }
  return process.env.MPESA_ENVIRONMENT === 'production' ? productionBaseUrl : sandboxBaseUrl
}

export class MpesaRequestError extends Error {
  constructor(
    message: string,
    readonly outcome: 'failed' | 'ambiguous',
    readonly merchantRequestId?: string,
    readonly checkoutRequestId?: string,
    readonly diagnostics: {
      stage: 'configuration' | 'oauth' | 'stk'
      errorType: string
      httpStatus?: number
      providerErrorCode?: string | number
      providerErrorMessage?: string
      oauthTokenRequestSucceeded: boolean
      stkRequestAttempted: boolean
    } = {
      stage: 'stk',
      errorType: 'MpesaRequestError',
      oauthTokenRequestSucceeded: false,
      stkRequestAttempted: false
    }
  ) {
    super(message)
    this.name = 'MpesaRequestError'
  }
}

function getErrorType(error: unknown) {
  if (error instanceof Error && ['AbortError', 'TypeError', 'SyntaxError'].includes(error.name)) return error.name
  return error instanceof MpesaRequestError ? error.name : 'Error'
}

function getProviderError(data: Record<string, unknown>) {
  const code = data.errorCode ?? data.ErrorCode ?? data.ResponseCode
  const message = data.errorMessage ?? data.error_description ?? data.ResponseDescription
  return {
    providerErrorCode: typeof code === 'string' || typeof code === 'number' ? code : undefined,
    providerErrorMessage: typeof message === 'string' ? message : undefined
  }
}

function sanitizeDiagnosticText(value: string) {
  let sanitized = value
    .replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/\bBasic\s+\S+/gi, 'Basic [REDACTED]')
    .replace(/\b(?:\+?254|0)?7\d{8}\b/g, '[REDACTED PHONE]')
    .replace(/\b[A-Za-z0-9+/=_-]{40,}\b/g, '[REDACTED TOKEN]')
    .replace(/\b(?:access[_ -]?token|consumer[_ -]?secret|passkey|password|authorization)\s*[:=]\s*\S+/gi, '[REDACTED CREDENTIAL]')

  for (const secret of [
    process.env.MPESA_CONSUMER_KEY,
    process.env.MPESA_CONSUMER_SECRET,
    process.env.MPESA_PASSKEY
  ]) {
    if (secret) sanitized = sanitized.split(secret).join('[REDACTED CREDENTIAL]')
  }

  return sanitized.slice(0, 240)
}

export function getMpesaCheckoutFailureDiagnostics(error: unknown) {
  const mpesaError = error instanceof MpesaRequestError ? error : null
  const details = mpesaError?.diagnostics
  const providerErrorCode = details?.providerErrorCode
  const safeCode = typeof providerErrorCode === 'string'
    ? /^[A-Za-z0-9_.-]{1,64}$/.test(sanitizeDiagnosticText(providerErrorCode))
      ? sanitizeDiagnosticText(providerErrorCode)
      : '[REDACTED]'
    : providerErrorCode

  return {
    errorType: details?.errorType ?? getErrorType(error),
    stage: details?.stage ?? 'unknown',
    httpStatus: details?.httpStatus,
    providerErrorCode: safeCode,
    providerErrorMessage: details?.providerErrorMessage
      ? sanitizeDiagnosticText(details.providerErrorMessage)
      : undefined,
    oauthTokenRequestSucceeded: details?.oauthTokenRequestSucceeded ?? false,
    stkRequestAttempted: details?.stkRequestAttempted ?? false,
    merchantRequestIdReceived: Boolean(mpesaError?.merchantRequestId),
    checkoutRequestIdReceived: Boolean(mpesaError?.checkoutRequestId),
    outcome: mpesaError?.outcome ?? 'failed'
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

export function normalizeKenyanPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('254')) return digits
  if (digits.startsWith('0')) return `254${digits.slice(1)}`
  if (digits.startsWith('7')) return `254${digits}`
  return digits
}

export function isValidKenyanPhone(phone: string) {
  return /^2547\d{8}$/.test(phone)
}

function requiredConfig() {
  const values = {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    shortcode: process.env.MPESA_SHORTCODE,
    passkey: process.env.MPESA_PASSKEY,
    callbackUrl: process.env.MPESA_CALLBACK_URL
  }
  const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key)
  if (missing.length) throw new Error(`Missing M-Pesa configuration: ${missing.join(', ')}`)
  const callbackUrl = new URL(values.callbackUrl!)
  if (!['http:', 'https:'].includes(callbackUrl.protocol)) {
    throw new Error('MPESA_CALLBACK_URL must use HTTP or HTTPS.')
  }
  if (process.env.MPESA_ENVIRONMENT === 'production' && callbackUrl.protocol !== 'https:') {
    throw new Error('MPESA_CALLBACK_URL must use HTTPS in production.')
  }
  return values as Record<keyof typeof values, string>
}

async function getAccessToken() {
  const { consumerKey, consumerSecret } = requiredConfig()
  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
  let response: Response
  try {
    response = await fetchWithTimeout(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${credentials}` }
    })
  } catch (error) {
    throw new MpesaRequestError(
      'M-Pesa OAuth token request failed before an STK request was attempted.',
      'failed',
      undefined,
      undefined,
      {
        stage: 'oauth',
        errorType: getErrorType(error),
        oauthTokenRequestSucceeded: false,
        stkRequestAttempted: false
      }
    )
  }

  let data: Record<string, unknown>
  try {
    const parsed: unknown = await response.json()
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid response shape')
    data = parsed as Record<string, unknown>
  } catch (error) {
    throw new MpesaRequestError(
      'M-Pesa OAuth returned an unreadable response before an STK request was attempted.',
      'failed',
      undefined,
      undefined,
      {
        stage: 'oauth',
        errorType: getErrorType(error),
        httpStatus: response.status,
        oauthTokenRequestSucceeded: false,
        stkRequestAttempted: false
      }
    )
  }
  if (!response.ok || typeof data.access_token !== 'string' || data.access_token.length === 0) {
    const providerError = getProviderError(data)
    throw new MpesaRequestError(
      'M-Pesa OAuth did not provide an access token; no STK request was attempted.',
      'failed',
      undefined,
      undefined,
      {
        stage: 'oauth',
        errorType: 'MpesaOAuthError',
        httpStatus: response.status,
        ...providerError,
        oauthTokenRequestSucceeded: false,
        stkRequestAttempted: false
      }
    )
  }
  return data.access_token
}

export async function initiateStkPush(input: {
  amount: number
  phone: string
  accountReference: string
  transactionDescription: string
}) {
  let config: ReturnType<typeof requiredConfig>
  try {
    config = requiredConfig()
  } catch (error) {
    throw new MpesaRequestError(
      'M-Pesa configuration validation failed before any provider request.',
      'failed',
      undefined,
      undefined,
      {
        stage: 'configuration',
        errorType: getErrorType(error),
        oauthTokenRequestSucceeded: false,
        stkRequestAttempted: false
      }
    )
  }
  const { shortcode, passkey, callbackUrl } = config
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
  const accessToken = await getAccessToken()

  let response: Response
  try {
    response = await fetchWithTimeout(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: input.amount,
        PartyA: input.phone,
        PartyB: shortcode,
        PhoneNumber: input.phone,
        CallBackURL: callbackUrl,
        AccountReference: input.accountReference,
        TransactionDesc: input.transactionDescription
      })
    })
  } catch (error) {
    throw new MpesaRequestError(
      'The M-Pesa request outcome is unknown; the provider may have received it.',
      'ambiguous',
      undefined,
      undefined,
      {
        stage: 'stk',
        errorType: getErrorType(error),
        oauthTokenRequestSucceeded: true,
        stkRequestAttempted: true
      }
    )
  }

  let data: Record<string, unknown>
  try {
    const parsed: unknown = await response.json()
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid response shape')
    data = parsed as Record<string, unknown>
  } catch (error) {
    throw new MpesaRequestError(
      'M-Pesa returned an unreadable response; the payment outcome is unknown.',
      'ambiguous',
      undefined,
      undefined,
      {
        stage: 'stk',
        errorType: getErrorType(error),
        httpStatus: response.status,
        oauthTokenRequestSucceeded: true,
        stkRequestAttempted: true
      }
    )
  }

  if (!response.ok) {
    const providerError = getProviderError(data)
    throw new MpesaRequestError(
      'M-Pesa rejected the STK Push request.',
      response.status >= 500 ? 'ambiguous' : 'failed',
      typeof data.MerchantRequestID === 'string' ? data.MerchantRequestID : undefined,
      typeof data.CheckoutRequestID === 'string' ? data.CheckoutRequestID : undefined,
      {
        stage: 'stk',
        errorType: 'MpesaHttpError',
        httpStatus: response.status,
        ...providerError,
        oauthTokenRequestSucceeded: true,
        stkRequestAttempted: true
      }
    )
  }
  if (data.ResponseCode !== '0') {
    const providerError = getProviderError(data)
    throw new MpesaRequestError(
      'M-Pesa returned a non-success STK response code.',
      'failed',
      undefined,
      undefined,
      {
        stage: 'stk',
        errorType: 'MpesaResponseError',
        httpStatus: response.status,
        ...providerError,
        oauthTokenRequestSucceeded: true,
        stkRequestAttempted: true
      }
    )
  }
  if (
    typeof data.MerchantRequestID !== 'string' ||
    data.MerchantRequestID.length === 0 ||
    typeof data.CheckoutRequestID !== 'string' ||
    data.CheckoutRequestID.length === 0
  ) {
    throw new MpesaRequestError(
      'M-Pesa accepted the request without returning all payment identifiers.',
      'ambiguous',
      typeof data.MerchantRequestID === 'string' ? data.MerchantRequestID : undefined,
      typeof data.CheckoutRequestID === 'string' ? data.CheckoutRequestID : undefined,
      {
        stage: 'stk',
        errorType: 'MpesaIdentifierError',
        httpStatus: response.status,
        oauthTokenRequestSucceeded: true,
        stkRequestAttempted: true
      }
    )
  }

  return data as {
    MerchantRequestID: string
    CheckoutRequestID: string
    ResponseCode: string
    CustomerMessage?: string
  }
}

export type StkStatusResult =
  | {
      state: 'paid' | 'failed'
      checkoutRequestId: string
      resultCode: number
      amount?: number
      phone?: string
      receiptNumber?: string
      rawResponse: string
    }
  | { state: 'pending'; reason: string }
  | { state: 'invalid'; reason: string }

const definitiveFailureCodes = new Set([1, 1032, 1037, 2001])

function parseProviderAmount(value: unknown) {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const amount = Number(value)
    return Number.isSafeInteger(amount) ? amount : undefined
  }
  return undefined
}

export async function queryStkPushStatus(checkoutRequestId: string): Promise<StkStatusResult> {
  if (!checkoutRequestId) return { state: 'invalid', reason: 'Missing CheckoutRequestID' }

  let response: Response
  try {
    const { shortcode, passkey } = requiredConfig()
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')
    const accessToken = await getAccessToken()
    response = await fetchWithTimeout(`${getBaseUrl()}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      })
    })
  } catch (error) {
    return {
      state: 'pending',
      reason: error instanceof Error ? error.message : 'M-Pesa status request outcome is unknown'
    }
  }

  let data: Record<string, unknown>
  try {
    const parsed: unknown = await response.json()
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { state: 'pending', reason: 'M-Pesa status response has an invalid shape' }
    }
    data = parsed as Record<string, unknown>
  } catch {
    return { state: 'pending', reason: 'M-Pesa status response could not be read' }
  }

  if (!response.ok || data.ResponseCode !== '0') {
    return { state: 'pending', reason: `M-Pesa status is not confirmed (HTTP ${response.status})` }
  }
  if (data.CheckoutRequestID !== checkoutRequestId) {
    return { state: 'invalid', reason: 'M-Pesa status response CheckoutRequestID does not match' }
  }

  const resultCode = typeof data.ResultCode === 'number'
    ? data.ResultCode
    : typeof data.ResultCode === 'string' && /^\d+$/.test(data.ResultCode)
      ? Number(data.ResultCode)
      : undefined
  if (resultCode === undefined || !Number.isSafeInteger(resultCode)) {
    return { state: 'pending', reason: 'M-Pesa has not returned a final transaction result' }
  }

  const amount = data.Amount === undefined ? undefined : parseProviderAmount(data.Amount)
  const rawPhone = data.PhoneNumber
  const rawPhoneString = rawPhone === undefined ? undefined : String(rawPhone)
  const phone = rawPhoneString === undefined
    ? undefined
    : /^\+?(?:2547\d{8}|07\d{8}|7\d{8})$/.test(rawPhoneString)
      ? normalizeKenyanPhone(rawPhoneString)
      : ''
  const receiptNumber = data.MpesaReceiptNumber === undefined
    ? undefined
    : typeof data.MpesaReceiptNumber === 'string'
      ? data.MpesaReceiptNumber.trim()
      : ''

  if (
    (data.Amount !== undefined && amount === undefined) ||
    (rawPhone !== undefined && (!phone || !isValidKenyanPhone(phone))) ||
    (data.MpesaReceiptNumber !== undefined && (!receiptNumber || !/^[A-Z0-9]{8,20}$/i.test(receiptNumber)))
  ) {
    return { state: 'invalid', reason: 'M-Pesa status response contains invalid payment details' }
  }

  const rawResponse = JSON.stringify(data).slice(0, 10000)
  if (resultCode === 0) {
    if (amount === undefined || phone === undefined || !receiptNumber) {
      return { state: 'pending', reason: 'M-Pesa success response is missing payment verification details' }
    }
    return { state: 'paid', checkoutRequestId, resultCode, amount, phone, receiptNumber, rawResponse }
  }
  if (definitiveFailureCodes.has(resultCode)) {
    return { state: 'failed', checkoutRequestId, resultCode, amount, phone, receiptNumber, rawResponse }
  }
  return { state: 'pending', reason: 'M-Pesa returned a result that does not clearly establish a final outcome' }
}

export function getCallbackItem(items: unknown, name: string): unknown {
  if (!Array.isArray(items)) return undefined
  const item = items.find((candidate) =>
    typeof candidate === 'object' &&
    candidate !== null &&
    'Name' in candidate &&
    candidate.Name === name
  )
  return typeof item === 'object' && item !== null && 'Value' in item ? item.Value : undefined
}
