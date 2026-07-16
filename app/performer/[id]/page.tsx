import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { Img } from '@/components/Img';
import { Btn } from '@/components/ui';
import { combineDateTime, fetchPerformerEvents } from '@/lib/api';
import { fmtDateLong, fmtTime } from '@/lib/format';

export const revalidate = 120;

export default async function PerformerPage({ params }: { params: { id: string } }) {
  const data = await fetchPerformerEvents(params.id, revalidate).catch(() => null);
  if (!data) notFound();

  const { performer, events } = data;
  const name = performer.name || 'Artist';

  return (
    <div style={{ maxWidth: 'var(--maxw)', margin: '0 auto', padding: '48px 28px 100px' }}>
      <div style={{ fontSize: 13.5, color: 'var(--faint)', marginBottom: 24 }}>
        <Link href="/" style={{ color: 'var(--dim)' }}>
          Home
        </Link>{' '}
        / {name}
      </div>

      {/* One image for the performer, shared across every event below. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 48 }}>
        <div style={{ width: 120, height: 120, borderRadius: 20, overflow: 'hidden', flexShrink: 0 }}>
          <Img src={performer.image} alt={name} style={{ width: '100%', height: '100%' }} />
        </div>
        <div>
          <div
            style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 8 }}
          >
            Artist
          </div>
          <h1 className="serif" style={{ fontSize: 'clamp(32px,5vw,52px)', margin: 0, lineHeight: 1, letterSpacing: '-0.01em' }}>
            {name}
          </h1>
          <p style={{ color: 'var(--dim)', marginTop: 10, fontSize: 15 }}>
            {events.length} upcoming event{events.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {events.map((e) => {
          const dt = combineDateTime(e.event_date, e.event_time);
          return (
            <div
              key={e.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                padding: '22px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>{e.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8, color: 'var(--dim)', fontSize: 14.5 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Icon name="cal" size={15} /> {fmtDateLong(dt)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Icon name="clock" size={15} /> {fmtTime(dt)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Icon name="pin" size={15} /> {[e.venue, e.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              </div>
              <Btn href={`/event/${e.id}`} size="md" iconR="arrow" style={{ flexShrink: 0 }}>
                Tickets
              </Btn>
            </div>
          );
        })}
      </div>
    </div>
  );
}
