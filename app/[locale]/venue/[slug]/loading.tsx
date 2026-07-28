import { Skeleton } from '@/components/Skeleton';

// Shown instantly on navigation while fetchVenue() resolves, mirroring
// app/event/[slug]/loading.tsx's pattern for the simpler single-column layout
// this page (and the performer page, which has no skeleton of its own) share.
export default function Loading() {
  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '48px 28px 100px' }}>
      <Skeleton style={{ height: 16, width: 140, marginBottom: 24 }} />

      <div style={{ marginBottom: 48 }}>
        <Skeleton style={{ height: 13, width: 70, marginBottom: 12 }} />
        <Skeleton style={{ height: 52, width: '50%', marginBottom: 16 }} />
        <Skeleton style={{ height: 18, width: 200, marginBottom: 8 }} />
        <Skeleton style={{ height: 18, width: 160 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ borderRadius: 16, border: '1px solid var(--border)', padding: '20px 22px' }}>
            <Skeleton style={{ height: 18, width: '40%', marginBottom: 12 }} />
            <Skeleton style={{ height: 14, width: '60%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
