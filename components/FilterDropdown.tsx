'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

/** A "select box" that, on hover (or click/focus for touch + keyboard), opens a floating checkbox list. */
export function FilterDropdown({
  label,
  active,
  badge,
  wide,
  className = 'ticket-filter',
  ariaLabel,
  children,
}: {
  label: string;
  /** Whether the trigger should render in its "filter applied" state. */
  active: boolean;
  /** Value shown in the badge — a filter count for multi-select groups, or the selected value itself for single-select ones. Only rendered while `active`. */
  badge?: number;
  /** Wider panel + multi-column grid, used for the quantity list. */
  wide?: boolean;
  /** Class on the root; the default gets the mobile "share the filter row" sizing from globals.css. */
  className?: string;
  ariaLabel?: string;
  /** Pass a function to get a `close` callback (e.g. to dismiss the panel after a pick). */
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // When the panel last opened, so a tap's click can tell it apart from a real toggle.
  const openedAt = useRef(0);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (!open) openedAt.current = Date.now();
    setOpen(true);
  }
  // A tap (or a click right as the pointer arrives) fires the emulated
  // mouseenter, which opens the panel, and then the click — which would
  // immediately toggle it shut again. Ignore a click that follows the open
  // by a moment.
  function toggle() {
    if (open && Date.now() - openedAt.current > 400) setOpen(false);
    else openNow();
  }
  // Small delay so moving the mouse from the trigger into the panel doesn't
  // flicker it closed.
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return (
    <div ref={rootRef} className={className} onMouseEnter={openNow} onMouseLeave={closeSoon} style={{ position: 'relative', minWidth: 0 }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={ariaLabel}
        className="focus-ring"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '11px 16px',
          borderRadius: 12,
          border: `1px solid ${active ? 'var(--accent)' : open ? 'var(--border-2)' : 'var(--border)'}`,
          background: active ? 'rgba(139,92,246,.12)' : 'var(--surface)',
          color: 'var(--text)',
          fontSize: 13.5,
          fontWeight: 600,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          transition: 'border-color .15s, background .15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{label}</span>
        {active && badge !== undefined && (
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              background: 'var(--grad)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {badge}
          </span>
        )}
        <Icon name="chevronDown" size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', opacity: 0.7 }} />
      </button>

      {open && (
        <div
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            insetInlineStart: 0,
            width: wide ? 260 : 220,
            padding: 10,
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
          <div style={wide ? { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 } : { display: 'flex', flexDirection: 'column', gap: 2 }}>
            {typeof children === 'function' ? children(() => setOpen(false)) : children}
          </div>
        </div>
      )}
    </div>
  );
}

/** The grid of seat-count buttons shown in a `wide` FilterDropdown. Radio-like: one value at a time. */
export function QuantityOptions({
  options,
  selected,
  onSelect,
  name,
}: {
  options: number[];
  selected: number | null;
  onSelect: (n: number) => void;
  /** Radio group name — must be unique per dropdown on the page. */
  name: string;
}) {
  return (
    <>
      {options.map((n) => {
        const checked = selected === n;
        return (
          <label
            key={n}
            className="focus-ring"
            style={{
              display: 'grid',
              placeItems: 'center',
              aspectRatio: '1',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: checked ? 700 : 500,
              color: checked ? '#fff' : 'var(--dim)',
              background: checked ? 'var(--grad)' : 'var(--surface)',
              border: `1px solid ${checked ? 'transparent' : 'var(--border)'}`,
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            {/*
              onClick lives on the input, not the label: clicking the label
              text fires a click on the label AND a browser-forwarded click
              on this input, but never the reverse — putting the handler
              here means exactly one call per user click instead of two
              (which would otherwise toggle the selection on and back off).
            */}
            <input
              type="radio"
              name={name}
              checked={checked}
              onClick={() => onSelect(n)}
              readOnly
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
            {n}
          </label>
        );
      })}
    </>
  );
}
