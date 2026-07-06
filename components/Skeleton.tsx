import type { CSSProperties } from 'react';

/** Pulsing placeholder block for content that streams in after the initial paint. */
export function Skeleton({ style }: { style?: CSSProperties }) {
  return <div className="skeleton" style={style} />;
}
