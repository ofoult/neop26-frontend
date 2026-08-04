interface CountryFlagProps {
  code: string;
  width?: number;
}

// react-world-flags bundled all 256 flags as inline SVG data URIs in one
// ~3.7MB JS chunk, loaded on every page regardless of how many (usually one
// or two) flags actually render — see the PageSpeed audit that flagged it.
// flagcdn.com serves one small image per country on request instead, so the
// browser only ever fetches the flags a given page actually shows.
//
// Raster (w80 PNG), not flagcdn's .svg endpoint: a live PSI trace showed
// flagcdn's vector flags scaling with the flag's real-world design
// complexity rather than our ~14-25px display size — Spain's coat of arms
// is 153KB of SVG paths, Croatia's checkerboard is 81KB, all for an icon
// rendered smaller than a favicon. That was competing for bandwidth against
// the actual LCP image on PSI's throttled mobile run. w80 (80px wide, ~3x
// headroom over our largest 25px call site) covers retina screens and comes
// back under 1KB even for Spain/Croatia — verified via curl against
// flagcdn.com/{w20,w40,w80}/{es,hr}.png.
// Standard landscape "flag chip" ratio (4:3) — flags are always wider than
// tall, so height is derived from width rather than using a fixed height
// that would squash narrower call sites (width=14) into a portrait box.
const ASPECT_RATIO = 3 / 4;

export function CountryFlag({ code, width = 25 }: CountryFlagProps) {
  const height = Math.round(width * ASPECT_RATIO);
  return (
    // Always paired with visible place/language text in every call site, so
    // the flag itself is decorative rather than needing its own alt text.
    <img
      src={`https://flagcdn.com/w80/${code.toLowerCase()}.png`}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      style={{ width, height, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
    />
  );
}