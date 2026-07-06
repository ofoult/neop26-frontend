import { Skeleton } from '@/components/Skeleton';

// Shown instantly on navigation (Next.js wraps the whole route in a Suspense
// using this as the fallback), while fetchEvent() resolves — so clicking an
// event card never leaves the browser looking frozen, even before the page's
// own nested Suspense boundaries (tickets/seating plan, more like this) exist.
export default function Loading() {
  return (
    <div>
      {/* hero */}
      <div style={{ position: 'relative', marginTop: '-88px', padding: '128px 28px 40px' }}>
        <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto' }}>
          <Skeleton style={{ height: 32, width: 96, borderRadius: 999, marginBottom: 'min(28vh,260px)' }} />
          <Skeleton style={{ height: 24, width: 160, borderRadius: 999, marginBottom: 14 }} />
          <Skeleton style={{ height: 18, width: 220, marginBottom: 14 }} />
          <Skeleton style={{ height: 72, width: '70%', marginBottom: 20 }} />
          <div style={{ display: 'flex', gap: 26 }}>
            <Skeleton style={{ height: 20, width: 160 }} />
            <Skeleton style={{ height: 20, width: 140 }} />
            <Skeleton style={{ height: 20, width: 180 }} />
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '40px 28px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 48, alignItems: 'start' }}>
          <div style={{ borderRadius: 22, background: 'var(--bg-2)', border: '1px solid var(--border)', padding: 22 }}>
            <Skeleton style={{ height: 13, width: 110, marginBottom: 18 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ borderRadius: 16, border: '1px solid var(--border)', padding: '16px 18px' }}>
                  <Skeleton style={{ height: 16, width: '55%', marginBottom: 10 }} />
                  <Skeleton style={{ height: 12, width: '35%' }} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <Skeleton style={{ height: 26, width: 170, marginBottom: 18 }} />
            <Skeleton style={{ height: 520, borderRadius: 18 }} />
          </div>
        </div>

        <div style={{ maxWidth: 760, marginTop: 56 }}>
          <Skeleton style={{ height: 26, width: 100, marginBottom: 18 }} />
          <Skeleton style={{ height: 200, borderRadius: 18 }} />
        </div>
      </div>
    </div>
  );
}
