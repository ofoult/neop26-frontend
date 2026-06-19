'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { suggestLocations } from '@/app/actions';
import type { LocationSuggestion } from '@/lib/types';
import { Icon, type IconName } from './Icon';
import { Btn } from './ui';

function Divider(): ReactNode {
  return <span style={{ width: 1, height: 32, background: 'var(--border)' }} />;
}

/**
 * Free-text search with a "What" term and a "Where" location (with country/town
 * autocomplete). Submitting navigates to /browse?q=…&where=… which runs the
 * hybrid full-text + typo-tolerant + date-aware search on the backend.
 */
export function SearchBar({
  compact,
  defaultQuery = '',
  defaultWhere = '',
  defaultFrom = '',
  defaultTo = '',
  autoFocus = false,
}: {
  compact?: boolean;
  defaultQuery?: string;
  defaultWhere?: string;
  defaultFrom?: string;
  defaultTo?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);
  const [where, setWhere] = useState(defaultWhere);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const whatRef = useRef<HTMLInputElement>(null);

  // One-shot focus when arriving from the nav search (?focus=1). Focus without
  // scrolling, then strip the param so it can't linger and keep re-grabbing
  // focus on later re-renders. Reads window.location to avoid useSearchParams,
  // which would de-opt the static homepage that also renders this bar.
  useEffect(() => {
    if (!autoFocus) return;
    whatRef.current?.focus({ preventScroll: true });
    const url = new URL(window.location.href);
    if (url.searchParams.has('focus')) {
      url.searchParams.delete('focus');
      router.replace(`${url.pathname}${url.search}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  function submit(nextWhere = where) {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (nextWhere.trim()) params.set('where', nextWhere.trim());
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    router.push(qs ? `/browse?${qs}` : '/browse');
  }

  const fieldPad = compact ? '0 16px' : '0 20px';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      style={{
        position: 'relative',
        // Lift the bar above the results grid so the autocomplete dropdown (which
        // is trapped in this bar's backdrop-filter stacking context) isn't
        // painted under the event cards.
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(13,13,20,0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-2)',
        borderRadius: 999,
        padding: '8px',
        gap: 0,
        boxShadow: '0 24px 60px -24px rgba(0,0,0,.7)',
      }}
    >
      <SearchField
        id="neop-search-what"
        icon="search"
        label="What"
        placeholder="Search events, artists…"
        value={q}
        onChange={setQ}
        onEnter={() => submit()}
        inputRef={whatRef}
        pad={fieldPad}
        flex={1.4}
      />
      <Divider />
      <SearchField
        id="neop-search-where"
        icon="pin"
        label="Where"
        placeholder="Anywhere"
        value={where}
        onChange={setWhere}
        onEnter={() => submit()}
        onPick={(v) => {
          setWhere(v);
          submit(v);
        }}
        pad={fieldPad}
        flex={1}
      />
      <Divider />
      <DateRangeField
        from={from}
        to={to}
        onChange={(f, t) => {
          setFrom(f);
          setTo(t);
        }}
        pad={fieldPad}
        flex={1}
      />
      <Btn type="submit" icon="search" style={{ flexShrink: 0 }}>
        Search
      </Btn>
    </form>
  );
}

function SearchField({
  id,
  icon,
  label,
  placeholder,
  value,
  onChange,
  onEnter,
  onPick,
  inputRef,
  pad,
  flex,
}: {
  id: string;
  icon: IconName;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  /** When set, this field shows location autocomplete; called on selection. */
  onPick?: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement>;
  pad: string;
  flex: number;
}) {
  const [items, setItems] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const reqId = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const justPicked = useRef(false);

  // Debounced suggestion fetch (only for the autocomplete field).
  useEffect(() => {
    if (!onPick) return;
    if (debounce.current) clearTimeout(debounce.current);
    // Selecting a suggestion sets `value`; don't reopen the dropdown for it.
    if (justPicked.current) {
      justPicked.current = false;
      setItems([]);
      setOpen(false);
      return;
    }
    const term = value.trim();
    if (term.length < 1) {
      setItems([]);
      setOpen(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      const id = ++reqId.current;
      const res = await suggestLocations(term);
      if (id !== reqId.current) return; // a newer keystroke superseded this one
      setItems(res);
      setActive(-1);
      setOpen(res.length > 0);
    }, 180);
    return () => debounce.current && clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function pick(s: LocationSuggestion) {
    justPicked.current = true;
    setOpen(false);
    setItems([]);
    onPick?.(s.value);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (open && items.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (a + 1) % items.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        pick(items[active]);
        return;
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: pad, flex, minWidth: 0 }}>
      <Icon name={icon} size={18} style={{ color: 'var(--faint)', flexShrink: 0 }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <label
          htmlFor={id}
          style={{ display: 'block', fontSize: 11, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          {label}
        </label>
        <input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          autoComplete="off"
          role={onPick ? 'combobox' : undefined}
          aria-expanded={onPick ? open : undefined}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 15, padding: 0 }}
        />
      </div>

      {onPick && open && items.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 16px)',
            left: 0,
            right: 0,
            minWidth: 260,
            margin: 0,
            padding: 6,
            listStyle: 'none',
            // Opaque background — --surface is nearly transparent, which let the
            // page show through the dropdown.
            background: '#12121b',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-2)',
            borderRadius: 16,
            boxShadow: '0 24px 60px -20px rgba(0,0,0,.7)',
            zIndex: 60,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {items.map((s, i) => (
            <li key={`${s.type}:${s.value}:${s.country ?? ''}`}>
              <button
                type="button"
                // onMouseDown fires before input blur, so the pick registers.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setActive(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  textAlign: 'left',
                  background: i === active ? 'var(--surface-2)' : 'transparent',
                  color: 'var(--text)',
                  transition: 'background .12s',
                }}
              >
                <Icon name={s.type === 'country' ? 'globe' : 'pin'} size={16} style={{ color: 'var(--faint)', flexShrink: 0 }} />
                <span style={{ fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.value}
                  {s.type === 'city' && s.country ? (
                    <span style={{ color: 'var(--dim)' }}>{`, ${s.country}`}</span>
                  ) : null}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--faint)', flexShrink: 0 }}>
                  {s.type === 'country' ? 'Country' : 'City'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Formats a YYYY-MM-DD date as "Jun 20" without timezone drift.
function fmtDay(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return d;
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function rangeLabel(from: string, to: string): string {
  if (from && to) return `${fmtDay(from)} – ${fmtDay(to)}`;
  if (from) return `From ${fmtDay(from)}`;
  if (to) return `Until ${fmtDay(to)}`;
  return 'Any dates';
}

/** "When" field: a popover with start/end date inputs (dates only, no time). */
function DateRangeField({
  from,
  to,
  onChange,
  pad,
  flex,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  pad: string;
  flex: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside the field/popover.
  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const hasValue = Boolean(from || to);
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 11px',
    borderRadius: 9,
    border: '1px solid var(--border)',
    background: 'var(--surface-2)',
    color: 'var(--text)',
    fontSize: 14,
    colorScheme: 'dark', // dark native calendar popup
  };
  const dateLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    color: 'var(--faint)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 5,
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11, padding: pad, flex, minWidth: 0 }}>
      <Icon name="cal" size={18} style={{ color: 'var(--faint)', flexShrink: 0 }} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ textAlign: 'left', background: 'transparent', border: 'none', padding: 0, minWidth: 0, flex: 1, cursor: 'pointer' }}
      >
        <span style={{ display: 'block', fontSize: 11, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          When
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 15,
            color: hasValue ? 'var(--text)' : 'var(--dim)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {rangeLabel(from, to)}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 16px)',
            right: 0,
            width: 320,
            padding: 16,
            background: '#12121b',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-2)',
            borderRadius: 16,
            boxShadow: '0 24px 60px -20px rgba(0,0,0,.7)',
            zIndex: 60,
          }}
        >
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ flex: 1 }}>
              <span style={dateLabel}>Start</span>
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => onChange(e.target.value, to)}
                style={inputStyle}
              />
            </label>
            <label style={{ flex: 1 }}>
              <span style={dateLabel}>End</span>
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => onChange(from, e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
            <button
              type="button"
              onClick={() => onChange('', '')}
              disabled={!hasValue}
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: hasValue ? 'var(--dim)' : 'var(--faint)',
                background: 'transparent',
                border: 'none',
                cursor: hasValue ? 'pointer' : 'default',
                padding: '6px 4px',
              }}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: 'var(--text)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 999,
                cursor: 'pointer',
                padding: '8px 18px',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
