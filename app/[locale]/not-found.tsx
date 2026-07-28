import { Btn } from '@/components/ui';

export default function NotFound() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '120px 28px', textAlign: 'center' }}>
      <h1 className="serif" style={{ fontSize: 'clamp(40px,7vw,72px)', margin: '0 0 12px', lineHeight: 1 }}>
        Lost the thread
      </h1>
      <p style={{ color: 'var(--dim)', fontSize: 17, margin: '0 0 28px' }}>
        We couldn&apos;t find that page or event. It may have sold out or moved.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Btn href="/" variant="soft" size="lg">
          Back home
        </Btn>
        <Btn href="/browse" size="lg" iconR="arrow">
          Browse events
        </Btn>
      </div>
    </div>
  );
}
