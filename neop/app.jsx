/* neop app root → router, tweaks, providers */
const { useState: useS4, useEffect: useE4, useCallback } = React;

const ACCENTS = {
  "Nebula":   ["#7c3aed", "#ec4899"],
  "Voltage":  ["#c4f000", "#00d6e6"],
  "Ember":    ["#ff5b29", "#ff2d78"],
  "Lagoon":   ["#19c8a0", "#f5a623"],
  "Magma":    ["#ff006e", "#8b00ff"],
};
const ACCENT_LIST = Object.values(ACCENTS);

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": ["#7c3aed", "#ec4899"],
  "direction": "editorial"
}/*EDITMODE-END*/;

function inkFor(hex) {
  // luminance check for accent button text
  const c = hex.replace("#","");
  const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  const lum = (0.299*r + 0.587*g + 0.114*b)/255;
  return lum > 0.62 ? "#0a0a0f" : "#ffffff";
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useS4({ name: "home" });

  const go = useCallback((r) => {
    setRoute(r);
    if (r.name === "home" || r.name === "browse") window.scrollTo(0, 0);
  }, []);

  // apply accent palette to CSS vars
  useE4(() => {
    const [a, a2] = t.accent || ACCENT_LIST[0];
    const root = document.documentElement.style;
    root.setProperty("--accent", a);
    root.setProperty("--accent-2", a2);
    root.setProperty("--accent-ink", inkFor(a));
  }, [t.accent]);

  const dir = t.direction || "editorial";

  let screen;
  if (route.name === "home") screen = <Home />;
  else if (route.name === "browse") screen = <Browse route={route} />;
  else if (route.name === "event") screen = <EventDetail id={route.id} />;
  else if (route.name === "checkout") screen = <Checkout route={route} />;
  else if (route.name === "confirm") screen = <Confirm route={route} />;

  const hideChrome = route.name === "confirm";

  return (
    <NeopCtx.Provider value={{ go, dir, route }}>
      <Nav />
      <main key={route.name + (route.id||"") + (route.cat||"")} style={{ minHeight:"60vh" }}>
        {screen}
      </main>
      {!hideChrome && <Footer />}
      {hideChrome && <div style={{ height:80 }} />}

      <TweaksPanel>
        <TweakSection label="Brand accent" />
        <TweakColor label="Accent" value={t.accent} options={ACCENT_LIST}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Visual direction" />
        <TweakRadio label="Layout" value={t.direction} options={["editorial", "kinetic"]}
          onChange={(v) => setTweak("direction", v)} />
        <div style={{ fontSize:12.5, lineHeight:1.5, color:"rgba(255,255,255,0.5)", padding:"2px 2px 0" }}>
          <b style={{color:"rgba(255,255,255,0.75)"}}>Editorial</b> — immersive full-bleed photography, elegant serif headlines.<br/>
          <b style={{color:"rgba(255,255,255,0.75)"}}>Kinetic</b> — bold typographic hero, ticket-stub cards.
        </div>
      </TweaksPanel>
    </NeopCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
