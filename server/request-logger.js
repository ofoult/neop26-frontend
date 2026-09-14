'use strict';

// Structured per-request access logging for this Node.js server (both the
// `output: 'standalone'` build's generated server.js in production, and
// `next dev`/`next start` locally — see package.json / Dockerfile for how
// this file is loaded).
//
// Why this lives at the raw `http` layer instead of middleware.ts:
// Next.js Edge Middleware runs before routing, never sees the final
// response (status/body), and its matcher excludes `_next` static assets
// and any path with a dot — which would hide exactly the traffic (images,
// JS/CSS chunks) that dominates crawler egress. Patching `http.createServer`
// instead covers literally every request this process serves, with no
// framework hook needed.
//
// How it's activated: this file is required via `NODE_OPTIONS=-r
// ./server/request-logger.js`, i.e. *before* Next.js (or its generated
// standalone server.js) ever calls `http.createServer(...)`. Since Node
// caches the `http` module by identity, patching `http.createServer` here
// patches the exact function object Next.js/server.js will call later in
// the same process — a standard zero-dependency instrumentation technique
// (the same one APM agents use for auto-instrumentation).
//
// What `response_bytes` measures: the sum of every chunk passed to
// `res.write()`/`res.end()` — i.e. the response body bytes this Node
// process hands to the OS socket. This app does not run gzip/Brotli
// compression itself (no `compression` middleware, no custom server), so
// this number is exactly what leaves the container. If Coolify's Traefik
// or Cloudflare in front of it re-compresses the response, the bytes that
// actually cross the public internet can be smaller than this — there is
// no in-process hook after that point to measure the true wire size, so
// this is the most accurate number available at the application layer.
// It's also why byte-summation (not a Content-Length header) is used: the
// App Router streams most responses (Suspense boundaries per CLAUDE.md's
// UX principles), and streamed/chunked responses frequently have no
// Content-Length header at all.
//
// Privacy: only user-agent, referer, host, and the specific forwarded-*/
// cf-* headers documented in ip-utils.js are ever read. Cookies,
// Authorization, and request bodies are never touched.

const http = require('http');
const { getClientIp, getHost, getProto, getCountry } = require('./ip-utils');
const { detectBot } = require('./bot-detection');

const MAX_FIELD_LENGTH = 400;

function truncate(value) {
  if (typeof value !== 'string') return value;
  return value.length > MAX_FIELD_LENGTH ? value.slice(0, MAX_FIELD_LENGTH) : value;
}

function byteLength(chunk, encoding) {
  if (chunk == null) return 0;
  if (typeof chunk === 'string') return Buffer.byteLength(chunk, encoding || 'utf8');
  return chunk.length; // Buffer or TypedArray: length is already byte length
}

function instrumentResponse(req, res) {
  const startedAt = process.hrtime.bigint();
  const startTimestamp = new Date().toISOString();
  let bytesOut = 0;
  let logged = false;

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);

  res.write = function patchedWrite(chunk, encoding, callback) {
    bytesOut += byteLength(chunk, typeof encoding === 'string' ? encoding : undefined);
    return originalWrite(chunk, encoding, callback);
  };

  res.end = function patchedEnd(chunk, encoding, callback) {
    bytesOut += byteLength(chunk, typeof encoding === 'string' ? encoding : undefined);
    return originalEnd(chunk, encoding, callback);
  };

  function emitLog() {
    if (logged) return;
    logged = true;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const userAgent = truncate(req.headers['user-agent'] || '');
    const bot = detectBot(userAgent, req);

    const entry = {
      timestamp: startTimestamp,
      type: 'http_request',
      method: req.method,
      path: truncate(req.url || ''),
      status: res.statusCode,
      response_bytes: bytesOut,
      duration_ms: Math.round(durationMs * 100) / 100,
      client_ip: getClientIp(req),
      user_agent: userAgent,
      is_bot: bot.is_bot,
      bot_name: bot.bot_name,
      bot_detection_method: bot.bot_detection_method,
      bot_verified: bot.bot_verified,
      referer: truncate(req.headers['referer'] || req.headers['referrer'] || ''),
      host: getHost(req),
      protocol: getProto(req),
      country: getCountry(req),
    };

    console.log(JSON.stringify(entry));
  }

  res.on('finish', emitLog);
  res.on('close', emitLog); // client aborted before 'finish' — still log what was sent
}

function wrapListener(listener) {
  return function wrappedRequestListener(req, res) {
    try {
      instrumentResponse(req, res);
    } catch (err) {
      // Logging must never break the actual response.
      console.error('request-logger: instrumentation failed', err);
    }
    return listener(req, res);
  };
}

const originalCreateServer = http.createServer.bind(http);

http.createServer = function patchedCreateServer(optionsOrListener, maybeListener) {
  if (typeof optionsOrListener === 'function') {
    return originalCreateServer(wrapListener(optionsOrListener));
  }
  if (typeof maybeListener === 'function') {
    return originalCreateServer(optionsOrListener, wrapListener(maybeListener));
  }
  return originalCreateServer(optionsOrListener, maybeListener);
};

module.exports = {};
