import type { CSSProperties, ReactNode } from 'react';

export type IconName =
  | 'search' | 'pin' | 'cal' | 'arrow' | 'arrowL' | 'heart' | 'bolt' | 'check'
  | 'plus' | 'minus' | 'star' | 'user' | 'lock' | 'ticket' | 'globe' | 'play' | 'clock';

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  style?: CSSProperties;
}

// Inline SVG icon set, ported verbatim from the neop HTML reference.
export function Icon({ name, size = 18, stroke = 1.7, style }: IconProps) {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    style,
  };
  const paths: Record<IconName, ReactNode> = {
    search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
    pin: (<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>),
    cal: (<><rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></>),
    arrow: (<><path d="M5 12h14M13 6l6 6-6 6" /></>),
    arrowL: (<><path d="M19 12H5M11 18l-6-6 6-6" /></>),
    heart: (<><path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20Z" /></>),
    bolt: (<><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></>),
    check: (<><path d="M20 6 9 17l-5-5" /></>),
    plus: (<><path d="M12 5v14M5 12h14" /></>),
    minus: (<><path d="M5 12h14" /></>),
    star: (<><path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9 6.7 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" /></>),
    user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
    lock: (<><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>),
    ticket: (<><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2v0a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 1 0-4Z" /><path d="M9 6v12" strokeDasharray="1 3" /></>),
    globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></>),
    play: (<><path d="M7 4v16l13-8z" fill="currentColor" stroke="none" /></>),
    clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  };
  return <svg {...p}>{paths[name]}</svg>;
}
