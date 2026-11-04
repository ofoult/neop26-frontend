import { gzipSync } from 'node:zlib';
import { API_BASE } from '@/lib/api';

/**
 * Data for the /map events globe (components/EventsGlobe.tsx): proxies the
 * backend's GET /geo/events so the browser only ever talks to us (the backend
 * is never called from the client — see CLAUDE.md "Backend API").
 *
 * The payload (~18k events, ~1.5 MB of JSON) is over Next's 2 MB-per-entry
 * comfort zone for the fetch cache, so it's held in a module-level memory
 * cache instead: the standalone server is one long-lived Node process, so all
 * visitors share one backend call per TTL. A failed refresh keeps serving the
 * last good copy for up to a day.
 *
 * `next start` doesn't compress route-handler responses, so the body is
 * gzipped here once per refresh (~4x smaller) and served as-is to clients
 * that accept gzip.
 */
const TTL_MS = 10 * 60 * 1000;
const STALE_MAX_MS = 24 * 60 * 60 * 1000;

interface Cached {
  body: string;
  gzip: Buffer;
  at: number;
}

let cached: Cached | null = null;
let inflight: Promise<Cached> | null = null;

async function refresh(): Promise<Cached> {
  const res = await fetch(`${API_BASE}/geo/events`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`backend /geo/events responded ${res.status}`);
  const body = await res.text();
  cached = { body, gzip: gzipSync(body), at: Date.now() };
  return cached;
}

export const dynamic = 'force-dynamic';

function serve(c: Cached, req: Request): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
    Vary: 'Accept-Encoding',
  };
  if (/\bgzip\b/.test(req.headers.get('accept-encoding') ?? '')) {
    return new Response(new Uint8Array(c.gzip), { headers: { ...headers, 'Content-Encoding': 'gzip' } });
  }
  return new Response(c.body, { headers });
}

export async function GET(req: Request): Promise<Response> {
  const age = cached ? Date.now() - cached.at : Infinity;
  if (cached && age <= TTL_MS) return serve(cached, req);

  inflight ??= refresh().finally(() => {
    inflight = null;
  });
  if (cached && age <= STALE_MAX_MS) {
    // Serve the slightly stale copy now; the refresh completes in the background.
    inflight.catch((err) => console.error('[geo] refresh failed:', err instanceof Error ? err.message : err));
    return serve(cached, req);
  }
  try {
    return serve(await inflight, req);
  } catch (err) {
    console.error('[geo] failed:', err instanceof Error ? err.message : err);
    return Response.json({ error: 'Map data unavailable' }, { status: 502 });
  }
}
