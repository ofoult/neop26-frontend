interface CountryFlagProps {
  code: string;
  width?: number;
}

// react-world-flags bundled all 256 flags as inline SVG data URIs in one
// ~3.7MB JS chunk, loaded on every page regardless of how many (usually one
// or two) flags actually render — see the PageSpeed audit that flagged it.
// flagcdn.com serves one small SVG per country on request instead, so the
// browser only ever fetches the flags a given page actually shows.
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
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      style={{ width, height, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
    />
  );
}