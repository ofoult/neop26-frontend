// import {fetchTrendingEvents} from "@/lib/api";

// This is a temporary mock of trending events. The real data is fetched from the backend but currently not working because of client issue , delete this when resolve and uncoment the fetching of trending events from the backend.
const MOCK_TRENDING_EVENTS = [
  { artist: "Bon Jovi", city: "New York" },
  { artist: "Jay-Z", city: "Brooklyn" },
  { artist: "Morrissey", city: "London" },
  { artist: "Coldplay", city: "Paris" },
  { artist: "Taylor Swift", city: "Los Angeles" },
  { artist: "Metallica", city: "Berlin" },
  { artist: "The Weeknd", city: "Toronto" },
  { artist: "Beyoncé", city: "Houston" },
  { artist: "Ed Sheeran", city: "Dublin" },
  { artist: "Imagine Dragons", city: "Las Vegas" },
  { artist: "Dua Lipa", city: "London" },
  { artist: "Foo Fighters", city: "Seattle" },
];

export  function BestSalesMarquee() {

  // const trendingEvents = await fetchTrendingEvents();
  // const row = [...trendingEvents, ...trendingEvents];

  const row = [...MOCK_TRENDING_EVENTS, ...MOCK_TRENDING_EVENTS];

  return (
    <div
      style={{
        overflow: "hidden",
        borderBottom: "1px solid transparent",
        padding: "1px 0",
        maskImage:
          "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)",
        background:
          "linear-gradient(rgba(7,7,11,0.92), rgba(7,7,11,0.12)), var(--grad)",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        className="serif ital"
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "0.1em",
          color: "var(--text)",
          whiteSpace: "nowrap",
          paddingLeft: 50,
          paddingRight: 30,
        }}
      >
        Selling Fast:
      </div>

      <div
        style={{
          overflow: "hidden",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 48,
            width: "max-content",
            animation: "marquee 38s linear infinite",
          }}
        >
          {row.map((trendingEvent, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                fontSize: 24,
                fontWeight: 600,
                color: "var(--dim)",
                letterSpacing: "-0.02em",
              }}
            >
              <span className="serif ital" style={{ color: "var(--text)" }}>
                {trendingEvent.artist} — {trendingEvent.city}
              </span>

              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  marginLeft: 35,
                }}
              />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
