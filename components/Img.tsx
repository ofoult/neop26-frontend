'use client';

import Image from 'next/image';
import { useState, type CSSProperties } from 'react';

interface ImgProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: CSSProperties;
  zoom?: boolean;
  /** Set for the single above-the-fold image that's the page's LCP candidate
   * (the hero) — skips lazy-loading and preloads at high fetch priority. */
  priority?: boolean;
  /** Passed through to next/image for responsive srcset generation; defaults
   * to a full-bleed assumption since most call sites are hero-style fills. */
  sizes?: string;
}

// Smart image with a graceful gradient fallback (the `.imgwrap` background
// shows through when there is no src or the image fails to load). All
// artwork is served from Gigsberg (see next.config.mjs's remotePatterns),
// so next/image can optimize/resize/reformat it instead of the browser
// fetching whatever byte size Gigsberg happens to serve.
export function Img({ src, alt, className = '', style, zoom, priority, sizes = '100vw' }: ImgProps) {
  const [ok, setOk] = useState(true);
  return (
    <div className={'imgwrap ' + className} style={style}>
      {ok && src && (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setOk(false)}
          style={{
            objectFit: 'cover',
            transform: zoom ? 'scale(1.06)' : 'none',
          }}
        />
      )}
    </div>
  );
}
