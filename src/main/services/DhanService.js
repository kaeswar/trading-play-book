const https = require('https');

/**
 * Promise-based HTTPS POST request.
 */
function httpRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const parsed  = new URL(url);

    const options = {
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method,
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
        ...headers,
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const httpPost = (url, headers, body) => httpRequest('POST', url, headers, body);
const httpGet  = (url, headers)       => httpRequest('GET',  url, headers, null);

async function testConnection(broker) {
  if (!broker?.access_token || !broker?.client_id) {
    return { ok: false, error: 'Credentials not configured.' };
  }
  try {
    const res = await httpGet('https://api.dhan.co/v2/fundlimit', {
      'access-token': broker.access_token,
      'client-id':    broker.client_id,
    });
    if (res.status === 200) return { ok: true, msg: 'Connected to Dhan API successfully.' };
    return { ok: false, error: `Auth check failed: ${res.status} — ${JSON.stringify(res.body)}` };
  } catch (e) {
    return { ok: false, error: `Network error: ${e.message}` };
  }
}

/**
 * Convert a date string ("2026-06-03") + time string ("09:15") in IST
 * to a Unix timestamp (seconds since epoch, UTC).
 * IST = UTC+5:30 → subtract 19800 seconds.
 */
function makeIstUnix(date, time) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min]  = time.split(':').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d, h, min) / 1000) - 19800;
}

/**
 * Add minutes to a "HH:MM" string and return "HH:MM".
 */
function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total  = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Fetch OHLC data for a single TPO period from Dhan API.
 * Dhan v2 supports intervals: 1, 5, 15, 25, 60 — NOT 30.
 * We fetch 15-min candles and aggregate all candles within [time_from, time_to].
 *
 * @param {object} params
 * @param {string} params.date       - "YYYY-MM-DD"
 * @param {string} params.time_from  - "HH:MM" (IST)
 * @param {string} params.time_to    - "HH:MM" (IST)
 * @param {object} params.symbol     - symbol row from DB (may be null)
 * @param {object} params.broker     - { client_id, access_token }
 * @returns {Promise<{high, low, close} | {error: string}>}
 */
async function fetchTpoOhlc({ date, time_from, time_to, symbol, broker }) {
  if (!broker || !broker.access_token) {
    return { error: 'No access token — configure in Settings → Broker Integration' };
  }
  if (!broker.client_id) {
    return { error: 'No Client ID — configure in Settings → Broker Integration' };
  }
  if (!symbol || !symbol.dhan_security_id) {
    return { error: 'Security ID not set for this symbol — configure in Settings → Symbols' };
  }

  const isFutures = (symbol.dhan_instrument_type || '').startsWith('FUT');
  const VALID_SEGMENTS = ['NSE_FNO', 'IDX_I', 'NSE_EQ', 'BSE_EQ', 'BSE_FNO', 'NSE_CURRENCY', 'MCX_COMM'];
  const rawSegment = symbol.dhan_exchange_segment;
  const exchangeSegment = VALID_SEGMENTS.includes(rawSegment) ? rawSegment : 'NSE_FNO';
  // Dhan intraday API requires full datetime: "YYYY-MM-DD HH:MM:SS"
  const requestBody = {
    securityId:      String(symbol.dhan_security_id),
    exchangeSegment: exchangeSegment,
    instrument:      symbol.dhan_instrument_type  || 'FUTIDX',
    interval:        '15',
    oi:              isFutures,
    fromDate:        `${date} 09:15:00`,
    toDate:          `${date} 15:30:00`,
  };

  let response;
  try {
    response = await httpPost(
      'https://api.dhan.co/v2/charts/intraday',
      { 'access-token': broker.access_token, 'client-id': broker.client_id },
      requestBody,
    );
  } catch (err) {
    return { error: `Network error: ${err.message}` };
  }

  if (response.status < 200 || response.status >= 300) {
    return { error: `Dhan API ${response.status}\n\nResponse: ${JSON.stringify(response.body, null, 2)}\n\nSent: ${JSON.stringify(requestBody)}` };
  }

  const data = response.body;
  const tsArr = Array.isArray(data.timestamp) ? data.timestamp : null;

  if (!tsArr || tsArr.length === 0) {
    return { error: `No candle data returned from Dhan for ${date}.\n\nRaw response: ${JSON.stringify(data)}` };
  }

  const effectiveTo = time_to || addMinutes(time_from, 15);
  const fromTs      = makeIstUnix(date, time_from);
  const toTs        = makeIstUnix(date, effectiveTo);

  const candles = tsArr
    .map((ts, i) => ({ ts, high: data.high[i], low: data.low[i], close: data.close[i] }))
    .filter(c => c.ts >= fromTs && c.ts < toTs);

  if (candles.length === 0) {
    return { error: `No 15-min candles found between ${time_from} and ${effectiveTo}.\n\nRaw timestamps: ${JSON.stringify(tsArr.slice(0, 5))}` };
  }

  return {
    high:  Math.max(...candles.map(c => c.high)),
    low:   Math.min(...candles.map(c => c.low)),
    close: candles[candles.length - 1].close,
  };
}

module.exports = { fetchTpoOhlc, testConnection };
