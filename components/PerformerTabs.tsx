'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { CountryFlag } from '@/components/Flag';
import { Icon } from '@/components/Icon';
import { SecHead } from '@/components/SecHead';
import { combineDateTime } from '@/lib/api';
import { countryCodeFor } from '@/lib/countryCodes';
import { fmtDateLong, fmtTime, relativeDayBucket, type RelativeDayBucket } from '@/lib/format';
import { eventHref } from '@/lib/slug';
import type { ApiPerformerComment, ApiPerformerEventItem } from '@/lib/types';

/** Background tint for the "how far out" pastille — nearer dates stand out more. */
function pastilleStyle(bucket: RelativeDayBucket | { year: number }): { background: string; color: string } {
  if (bucket === 'today' || bucket === 'tomorrow') {
    return { background: 'var(--grad)', color: 'var(--accent-ink)' };
  }
  return { background: 'var(--surface-2)', color: 'var(--dim)' };
}

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '10px 20px',
    borderRadius: 12,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'rgba(139,92,246,.12)' : 'var(--surface)',
    color: active ? 'var(--text)' : 'var(--dim)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .15s',
  };
}

function EventsPanel({ name, events }: { name: string; events: ApiPerformerEventItem[] }) {
  const locale = useLocale();
  const tDate = useTranslations('DateLabels');
  const t = useTranslations('Performer');

  if (events.length === 0) {
    return <p style={{ color: 'var(--dim)', fontSize: 15 }}>{t('noUpcomingEvents', { name })}</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {events.map((e) => {
        const dt = combineDateTime(e.event_date, e.event_time);
        const bucket = relativeDayBucket(dt);
        const when = typeof bucket === 'string' ? tDate(bucket) : String(bucket.year);
        const whenStyle = pastilleStyle(bucket);
        const countryCode = countryCodeFor(e.country);
        return (
          <Link
            key={e.id}
            href={eventHref({ id: e.id, title: e.name ?? '', artist: name, city: e.city ?? '' })}
            className="focus-ring performer-row perf-event-row"
            style={{
              padding: '20px 22px',
              borderRadius: 16,
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 17, fontWeight: 600 }}>{e.name}</span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '4px 10px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                    ...whenStyle,
                  }}
                >
                  {when}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8, color: 'var(--dim)', fontSize: 14.5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon name="cal" size={15} /> {fmtDateLong(dt, locale)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon name="clock" size={15} /> {fmtTime(dt, locale)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon name="pin" size={15} /> {[e.venue, e.city].filter(Boolean).join(', ')}
                </span>
                {e.country && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {countryCode && <CountryFlag code={countryCode} width={16} />}
                    {e.country}
                  </span>
                )}
              </div>
            </div>
            {/* Decorative — the whole card is the click target (same destination). */}
            <span
              aria-hidden
              className="perf-event-ticket"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                padding: '13px 22px',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 999,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                background: 'var(--grad)',
                color: 'var(--accent-ink)',
              }}
            >
              {t('tickets')}
              <Icon name="arrow" size={17} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function AboutPanel({
  name,
  bio,
  bioSource,
  bioSourceUrl,
  videoId,
  videoTitle,
  comments,
}: {
  name: string;
  bio: string | null;
  bioSource: 'lastfm' | 'wikipedia' | null;
  bioSourceUrl: string | null;
  videoId: string | null;
  videoTitle: string | null;
  comments: ApiPerformerComment[];
}) {
  const t = useTranslations('Performer');

  return (
    <div>
      {bio && (
        <div style={{ marginBottom: 40, maxWidth: 720 }}>
          <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--dim)' }}>{bio}</p>
          {bioSourceUrl && (
            <a href={bioSourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--faint)' }}>
              {t('source', { source: bioSource === 'lastfm' ? 'Last.fm' : 'Wikipedia' })}
            </a>
          )}
        </div>
      )}

      {videoId && (
        <div style={{ marginBottom: 40, maxWidth: 720 }}>
          <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 16, overflow: 'hidden' }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={videoTitle ?? name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          </div>
        </div>
      )}

      {comments?.length > 0 && (
        <div style={{ maxWidth: 720 }}>
          <SecHead kicker={t('fromYoutube')} title={t('fansSaying')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {comments.map((c, i) => (
              <div key={i} style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>{c.author}</div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--dim)', margin: 0 }}>{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Events" (default) / "About" tabs for the performer page — keeps the event
 * list (the actual pick-a-show/buy-tickets UI) visible immediately, with
 * bio/video/comments tucked behind an explicit tab instead of pushing the
 * events list down the page.
 */
export function PerformerTabs({
  name,
  events,
  bio,
  bioSource,
  bioSourceUrl,
  videoId,
  videoTitle,
  comments,
}: {
  name: string;
  events: ApiPerformerEventItem[];
  bio: string | null;
  bioSource: 'lastfm' | 'wikipedia' | null;
  bioSourceUrl: string | null;
  videoId: string | null;
  videoTitle: string | null;
  comments: ApiPerformerComment[];
}) {
  const t = useTranslations('Performer');
  const hasAbout = Boolean(bio || videoId || comments?.length > 0);
  const [tab, setTab] = useState<'events' | 'about'>('events');

  if (!hasAbout) return <EventsPanel name={name} events={events} />;

  return (
    <div>
      <div role="tablist" style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
        <button
          type="button"
          role="tab"
          id="performer-tab-events"
          aria-selected={tab === 'events'}
          aria-controls="performer-panel-events"
          className="focus-ring"
          style={tabButtonStyle(tab === 'events')}
          onClick={() => setTab('events')}
        >
          {t('eventsTab')}
        </button>
        <button
          type="button"
          role="tab"
          id="performer-tab-about"
          aria-selected={tab === 'about'}
          aria-controls="performer-panel-about"
          className="focus-ring"
          style={tabButtonStyle(tab === 'about')}
          onClick={() => setTab('about')}
        >
          {t('aboutTab')}
        </button>
      </div>

      {/*
        Both panels stay mounted at all times — only visually toggled via the
        `hidden` attribute — rather than conditionally rendering one or the
        other. Search engine crawlers render JS but never click buttons, so a
        panel that only mounts on click would never appear in the DOM they
        index; keeping both panels present (just hidden) is what makes the
        bio/video/comments crawlable while still only showing one at a time.
      */}
      <div role="tabpanel" id="performer-panel-events" aria-labelledby="performer-tab-events" hidden={tab !== 'events'}>
        <EventsPanel name={name} events={events} />
      </div>
      <div role="tabpanel" id="performer-panel-about" aria-labelledby="performer-tab-about" hidden={tab !== 'about'}>
        <AboutPanel
          name={name}
          bio={bio}
          bioSource={bioSource}
          bioSourceUrl={bioSourceUrl}
          videoId={videoId}
          videoTitle={videoTitle}
          comments={comments}
        />
      </div>
    </div>
  );
}
