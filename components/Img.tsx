'use client';

import { useState, type CSSProperties } from 'react';

interface ImgProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: CSSProperties;
  zoom?: boolean;
}

// Smart image with a graceful gradient fallback (the `.imgwrap` background shows
// through when there is no src or the image fails to load). Ported from the
// reference; uses a plain <img> because event artwork comes from arbitrary hosts.
export function Img({ src, alt, className = '', style, zoom }: ImgProps) {
  const [ok, setOk] = useState(true);
  return (
    <div className={'imgwrap ' + className} style={style}>
      {ok && src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setOk(false)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: zoom ? 'scale(1.06)' : 'none',
          }}
        />
      )}
    </div>
  );
}
