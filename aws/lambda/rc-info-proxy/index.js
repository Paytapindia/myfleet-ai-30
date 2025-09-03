// AWS Lambda - Node.js 18.x
// Handler: index.handler
// Purpose: Proxy RC verification requests to APIClub, handling errors robustly and always
// returning a valid API Gateway proxy response. By default, returns HTTP 200 to avoid
// upstream 5xx breaking callers (configurable).

// Environment variables to configure in Lambda:
// - APICLUB_API_KEY        (required) Example: apclb_xxx
// - APICLUB_BASE_URL       (optional) Default: https://uat.apiclub.in
// - APICLUB_RC_PATH        (optional) Default: /api/v1/rc_info
// - APICLUB_FASTAG_PATH    (optional) Default: /api/v1/fastag_info
// - FORCE_STATUS_200       (optional) "true" to always return 200 regardless of upstream
// - TIMEOUT_MS             (optional) default 25000
// - PROXY_TOKEN            (optional) if set, require an 'x-proxy-token' header to match

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-proxy-token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json'
}

function response(statusCode, bodyObj, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...extraHeaders },
    body: JSON.stringify(bodyObj ?? {})
  }
}

function ok(bodyObj, extraHeaders = {}) {
  return response(200, bodyObj, extraHeaders)
}

exports.handler = async (event) => {
  // CORS preflight
  if (event?.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    }
  }

  const FORCE_200 = String(process.env.FORCE_STATUS_200 ?? 'true').toLowerCase() === 'true'
  const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 25000)
  const API_KEY = process.env.APICLUB_API_KEY
  const BASE_URL = process.env.APICLUB_BASE_URL || 'https://uat.apiclub.in'
  const RC_PATH = process.env.APICLUB_RC_PATH || '/api/v1/rc_info'
  const FASTAG_PATH = process.env.APICLUB_FASTAG_PATH || '/api/v1/fastag_info'
  const CHALLANS_PATH = process.env.APICLUB_CHALLANS_PATH || '/api/v1/challan_info_v2'

  try {
    if (!API_KEY) {
      const errBody = { code: 500, status: 'error', message: 'APICLUB_API_KEY not configured', response: null }
      return FORCE_200 ? ok(errBody) : response(500, errBody)
    }

    // Optional proxy token check
    const requiredToken = process.env.PROXY_TOKEN
    if (requiredToken) {
      const provided = (event?.headers?.['x-proxy-token'] || event?.headers?.['X-Proxy-Token'] || '').trim()
      if (provided !== requiredToken) {
        const errBody = { code: 401, status: 'error', message: 'Unauthorized proxy token', response: null }
        return FORCE_200 ? ok(errBody) : response(401, errBody)
      }
    }

    // Parse incoming body safely
    let payload = {}
    try {
      if (typeof event?.body === 'string' && event.body.length > 0) {
        payload = JSON.parse(event.body)
      } else if (event?.body && typeof event.body === 'object') {
        payload = event.body
      }
    } catch (_) {
      // ignore malformed JSON, will handle later
    }

    // Accept multiple possible keys and normalize vehicleId
    const vehicleIdRaw = (payload.vehicleId || payload.rc_number || payload.registrationNumber || event?.queryStringParameters?.vehicleId || '')
      .toString()
      .trim()
    const vehicleId = vehicleIdRaw
    const normalizedId = vehicleIdRaw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const service = (payload.service || event?.queryStringParameters?.service || 'rc').toLowerCase() // Default to RC

    if (!vehicleIdRaw) {
      const errBody = { code: 400, status: 'error', message: 'vehicleId is required', response: null }
      return FORCE_200 ? ok(errBody) : response(400, errBody)
    }

    // For challans service, validate all required fields
    if (service === 'challans') {
      const chassis = (payload.chassis || '').toString().trim()
      const engine_no = (payload.engine_no || '').toString().trim()
      
      const missing = {}
      if (!chassis) missing.chassis = true
      if (!engine_no) missing.engine = true
      
      if (Object.keys(missing).length > 0) {
        const errBody = { 
          code: 422, 
          status: 'error', 
          message: 'Missing required fields for challans verification', 
          missing,
          response: null 
        }
        return FORCE_200 ? ok(errBody) : response(422, errBody)
      }
    }

    // Determine API path based on service type
    let apiPath
    if (service === 'fastag') {
      apiPath = FASTAG_PATH
    } else if (service === 'challans') {
      apiPath = CHALLANS_PATH
    } else {
      apiPath = RC_PATH // Default to RC
    }

    // Prepare upstream request
    const url = `${BASE_URL}${apiPath}`
    console.log('[rc-info-proxy] service:', service, 'apiPath:', apiPath, 'url:', url, 'vehicleIdRaw:', vehicleId, 'normalizedId:', normalizedId)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let upstream
    try {
      upstream = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Api-Key': API_KEY,
          // Provide a referer if required by APIClub docs/examples
          'Referer': 'docs.apiclub.in'
        },
        body: JSON.stringify(service === 'challans' ? {
          vehicleId: normalizedId,
          chassis: payload.chassis || '',
          engine_no: payload.engine_no || ''
        } : { vehicleId: normalizedId }),
        signal: controller.signal
      })
    } finally {
      clearTimeout(timer)
    }

    const contentType = upstream.headers.get('content-type') || ''
    let upstreamJson = null
    let upstreamText = null

    if (contentType.includes('application/json')) {
      try { upstreamJson = await upstream.json() } catch (_) {
        // fall back to text
        upstreamText = await upstream.text().catch(() => null)
      }
    } else {
      upstreamText = await upstream.text().catch(() => null)
      // Some gateways wrap JSON in text; attempt extraction
      if (upstreamText) {
        const match = upstreamText.match(/\{[\s\S]*\}/)
        if (match) {
          try { upstreamJson = JSON.parse(match[0]) } catch (_) {}
        }
      }
    }

    // Build normalized body
    if (upstream.ok && upstreamJson) {
      // Pass-through success from APIClub
      const body = {
        code: upstreamJson.code ?? 200,
        status: upstreamJson.status || 'success',
        message: upstreamJson.message || 'Success',
        request_id: upstreamJson.request_id,
        response: upstreamJson.response ?? upstreamJson
      }
      return ok(body)
    }

    // Non-200 or parse failure
    const preview = (upstreamText || JSON.stringify(upstreamJson || {})).slice(0, 500)
    const errBody = {
      code: upstream.status || 502,
      status: 'error',
      message: `Upstream API error ${upstream.status}`,
      response: null,
      upstream: {
        status: upstream.status,
        contentType,
        bodyPreview: preview
      }
    }
    return FORCE_200 ? ok(errBody) : response(502, errBody)
  } catch (err) {
    const errBody = {
      code: 500,
      status: 'error',
      message: 'Lambda internal error',
      response: null,
      details: String(err?.message || err)
    }
    return FORCE_200 ? ok(errBody) : response(500, errBody)
  }
}
