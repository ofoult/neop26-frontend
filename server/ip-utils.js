'use strict';

// IP / host / protocol / country resolution for requests reaching this
// container. Deliberately synchronous and local: no DNS lookups, no network
// calls, no external services — see server/request-logger.js for why.

function stripIpv6Prefix(ip) {
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
}

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  return false;
}

// Coolify runs its reverse proxy (Traefik) as a sibling container reachable
// only over Docker's internal network, so a legitimate request's TCP peer
// (`req.socket.remoteAddress`) is always a private address — 10/8, 172.16/12,
// 192.168/16 (Docker's default bridge ranges), the IPv4 loopback, or the
// IPv6 loopback/ULA equivalents. A peer outside those ranges means the
// container is being reached directly, bypassing the proxy, so its headers
// (which any internet client can set to anything) are not trustworthy.
function isTrustedProxyPeer(remoteAddress) {
  const ip = stripIpv6Prefix(remoteAddress || '');
  if (ip === '::1') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // IPv6 ULA
  return isPrivateIpv4(ip);
}

function firstForwardedValue(headerValue) {
  if (!headerValue) return null;
  const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  const first = String(value).split(',')[0].trim();
  return first || null;
}

// Client IP: only trusted headers, only from a trusted peer.
// - `CF-Connecting-IP` (set by Cloudflare at its edge, passed through
//   untouched by Traefik) wins when present — it can't be spoofed by
//   anything short of compromising Cloudflare itself.
// - Otherwise the left-most (original client) entry of `X-Forwarded-For`,
//   which Traefik sets/appends to.
// - Falls back to the raw socket peer address when neither header is
//   present, or when the peer isn't trusted at all.
function getClientIp(req) {
  const socketIp = stripIpv6Prefix(req.socket.remoteAddress || '');
  if (!isTrustedProxyPeer(socketIp)) return socketIp || 'unknown';

  const cfIp = firstForwardedValue(req.headers['cf-connecting-ip']);
  if (cfIp) return cfIp;

  const xff = firstForwardedValue(req.headers['x-forwarded-for']);
  if (xff) return xff;

  return socketIp || 'unknown';
}

// Host: `X-Forwarded-Host` (set by Traefik from the original request) when
// the peer is trusted, else the raw `Host` header.
function getHost(req) {
  const socketIp = stripIpv6Prefix(req.socket.remoteAddress || '');
  if (isTrustedProxyPeer(socketIp)) {
    const forwardedHost = firstForwardedValue(req.headers['x-forwarded-host']);
    if (forwardedHost) return forwardedHost;
  }
  return req.headers.host || 'unknown';
}

// Protocol: `X-Forwarded-Proto` when the peer is trusted (TLS is always
// terminated upstream of this container, so the raw connection here is
// plain HTTP regardless of what the client used).
function getProto(req) {
  const socketIp = stripIpv6Prefix(req.socket.remoteAddress || '');
  if (isTrustedProxyPeer(socketIp)) {
    const forwardedProto = firstForwardedValue(req.headers['x-forwarded-proto']);
    if (forwardedProto) return forwardedProto;
  }
  return 'http';
}

// Country: only available when Cloudflare is in front and sets
// `CF-IPCountry`. No GeoIP database or lookup service is added for this —
// if the header isn't there, country is null.
function getCountry(req) {
  const socketIp = stripIpv6Prefix(req.socket.remoteAddress || '');
  if (!isTrustedProxyPeer(socketIp)) return null;
  const country = firstForwardedValue(req.headers['cf-ipcountry']);
  return country && country !== 'XX' ? country : null;
}

module.exports = {
  getClientIp,
  getHost,
  getProto,
  getCountry,
  isTrustedProxyPeer,
  stripIpv6Prefix,
};
