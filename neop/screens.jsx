/* neop screens: Home + Browse → window */
const { useState: useS2, useEffect: useE2, useContext: useC2, useRef: useR2 } = React;

/* ---------- search / date bar ---------- */
function SearchBar({ compact }) {
  const { go } = useC2(NeopCtx);
  const field = (icon, label, val) => (
    <div style={{ display:"flex", alignItems:"center", gap:11, padding: compact?"0 16px":"0 20px", flex:1, minWidth:0 }}>
      <Icon name={icon} size={18} style={{ color:"var(--faint)", flexShrink:0 }} />
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:11, color:"var(--faint)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
        <div style={{ fontSize:15, color: val?"var(--text)":"var(--dim)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{val||"Anything"}</div>
      </div>
    </div>
  );
  return (
    <div style={{ display:"flex", alignItems:"center", background:"rgba(13,13,20,0.7)", backdropFilter:"blur(20px)",
      border:"1px solid var(--border-2)", borderRadius:999, padding:"8px", gap:0, boxShadow:"0 24px 60px -24px rgba(0,0,0,.7)" }}>
      {field("search","What","Search events & artists")}
      <span style={{ width:1, height:32, background:"var(--border)" }} />
      {field("pin","Where","Anywhere")}
      <span style={{ width:1, height:32, background:"var(--border)" }} />
      {field("cal","When","Any dates")}
      <Btn onClick={() => go({ name:"browse" })} icon="search" style={{ flexShrink:0 }}>Search</Btn>
    </div>
  );
}

/* ---------- city marquee ---------- */
function CityMarquee() {
  const cities = ["New York","Tokyo","London","Berlin","Paris","Rio","Madrid","Sydney","Los Angeles","Amsterdam","Seoul","Mexico City"];
  const row = [...cities, ...cities];
  return (
    <div style={{ overflow:"hidden", borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)", padding:"18px 0", maskImage:"linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}>
      <div style={{ display:"flex", gap:48, width:"max-content", animation:"marquee 38s linear infinite" }}>
        {row.map((c,i) => (
          <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:14, fontSize:24, fontWeight:600, color:"var(--dim)", letterSpacing:"-0.02em" }}>
            <span className="serif ital" style={{ color:"var(--text)" }}>{c}</span>
            <span style={{ width:7, height:7, borderRadius:"50%", background:"var(--accent)" }} />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- HERO ---------- */
function Hero() {
  const { go, dir } = useC2(NeopCtx);
  const feat = NEOP.EVENTS.find(e => e.hot);

  if (dir === "kinetic") {
    const hots = NEOP.EVENTS.filter(e => e.hot).slice(0,3);
    return (
      <section style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"40px 28px 20px" }}>
        <div className="up" style={{ display:"inline-flex", alignItems:"center", gap:9, padding:"8px 15px", borderRadius:999,
          background:"var(--surface)", border:"1px solid var(--border)", fontSize:13.5, color:"var(--dim)", marginBottom:28 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#34d399" }} /> 2,481 events live across 90 countries
        </div>
        <h1 className="up" style={{ fontSize:"clamp(48px, 8vw, 104px)", fontWeight:800, lineHeight:0.95, letterSpacing:"-0.04em", margin:"0 0 8px", maxWidth:980 }}>
          Every great night<br/>starts with a <span className="serif ital" style={{ fontWeight:400, background:"var(--grad)", WebkitBackgroundClip:"text", backgroundClip:"text", color:"transparent" }}>ticket</span>.
        </h1>
        <p className="up" style={{ fontSize:19, color:"var(--dim)", maxWidth:560, lineHeight:1.55, margin:"18px 0 30px", animationDelay:"60ms" }}>
          Concerts, festivals, sport and theater — secured by neop's 100% buyer guarantee. Find your seat anywhere on Earth.
        </p>
        <div className="up" style={{ animationDelay:"120ms", maxWidth:880, marginBottom:46 }}><SearchBar /></div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:18 }}>
          {hots.map((e,i) => <EventCard key={e.id} ev={e} i={i} />)}
        </div>
      </section>
    );
  }

  // editorial — full-bleed immersive feature
  return (
    <section style={{ position:"relative", minHeight:"86vh", display:"flex", flexDirection:"column", justifyContent:"flex-end",
      marginTop:"-88px", paddingTop:88 }}>
      <div style={{ position:"absolute", inset:0, zIndex:-1 }}>
        <Img src={feat.image} alt={feat.title} style={{ width:"100%", height:"100%" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, var(--bg) 2%, rgba(7,7,11,.4) 40%, rgba(7,7,11,.55))" }} />
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(120% 80% at 80% 10%, transparent 40%, var(--bg))" }} />
      </div>
      <div style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"0 28px 4px", width:"100%" }}>
        <div className="up" style={{ display:"inline-flex", alignItems:"center", gap:9, padding:"8px 15px", borderRadius:999,
          background:"rgba(255,255,255,.1)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,.2)",
          fontSize:13.5, fontWeight:600, marginBottom:24 }}>
          <Icon name="bolt" size={14}/> Featured · {feat.city}
        </div>
        <h1 className="up" style={{ margin:0, animationDelay:"40ms" }}>
          <span style={{ display:"block", fontSize:16, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.14em", color:"rgba(255,255,255,.75)", marginBottom:14 }}>{feat.artist}</span>
          <span className="serif" style={{ fontSize:"clamp(52px, 9vw, 128px)", lineHeight:0.92, letterSpacing:"-0.02em", display:"block" }}>{feat.title}</span>
        </h1>
        <p className="up" style={{ fontSize:19, color:"rgba(255,255,255,.85)", maxWidth:540, lineHeight:1.55, margin:"22px 0 26px", animationDelay:"100ms" }}>{feat.blurb}</p>
        <div className="up" style={{ display:"flex", gap:14, alignItems:"center", flexWrap:"wrap", animationDelay:"140ms" }}>
          <Btn size="lg" iconR="arrow" onClick={() => go({ name:"event", id:feat.id })}>Get tickets · from {feat.currency}{feat.priceFrom}</Btn>
          <Btn size="lg" variant="ghost" icon="play">Watch trailer</Btn>
          <div style={{ display:"flex", alignItems:"center", gap:18, color:"rgba(255,255,255,.85)", fontSize:14.5, marginLeft:6 }}>
            <span style={{ display:"flex", alignItems:"center", gap:7 }}><Icon name="cal" size={16}/> {fmtDate(feat.date)}</span>
            <span style={{ display:"flex", alignItems:"center", gap:7 }}><Icon name="pin" size={16}/> {feat.venue}</span>
          </div>
        </div>
        <div className="up" style={{ margin:"42px 0 56px", maxWidth:920, animationDelay:"200ms" }}><SearchBar /></div>
      </div>
    </section>
  );
}

/* ---------- section header ---------- */
function SecHead({ kicker, title, action, onAction }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:20, marginBottom:24 }}>
      <div>
        {kicker && <div style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", color:"var(--accent)", marginBottom:10 }}>{kicker}</div>}
        <h2 className="serif" style={{ fontSize:"clamp(30px,4vw,46px)", margin:0, lineHeight:1, letterSpacing:"-0.01em" }}>{title}</h2>
      </div>
      {action && <button onClick={onAction} className="focus-ring" style={{ display:"flex", alignItems:"center", gap:8, fontSize:15, fontWeight:600, color:"var(--dim)", flexShrink:0 }}>{action} <Icon name="arrow" size={16}/></button>}
    </div>
  );
}

/* ---------- HOME ---------- */
function Home() {
  const { go } = useC2(NeopCtx);
  const trending = NEOP.EVENTS.filter(e => e.hot);
  const fests = NEOP.EVENTS.filter(e => e.category === "festivals");
  const weekend = NEOP.EVENTS.slice(3, 9);

  return (
    <div>
      <Hero />
      <CityMarquee />

      {/* categories */}
      <section style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"48px 28px 0" }}>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {NEOP.CATEGORIES.map(c => (
            <CatPill key={c.id} cat={c} onClick={() => go({ name:"browse", cat:c.id })} />
          ))}
        </div>
      </section>

      {/* trending */}
      <section style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"56px 28px 0" }}>
        <SecHead kicker="Selling fast" title="Trending right now" action="See all" onAction={() => go({ name:"browse" })} />
        <div style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr", gap:18 }}>
          <div style={{ gridRow:"span 2" }}><EventCard ev={trending[0]} i={0} wide /></div>
          {trending.slice(1,5).map((e,i) => <EventCard key={e.id} ev={e} i={i+1} />)}
        </div>
      </section>

      {/* this weekend */}
      <section style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"72px 28px 0" }}>
        <SecHead kicker="Don't miss out" title="On this weekend" action="Browse dates" onAction={() => go({ name:"browse" })} />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
          {weekend.map((e,i) => <EventCard key={e.id} ev={e} i={i} />)}
        </div>
      </section>

      {/* guarantee band */}
      <section style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"80px 28px 0" }}>
        <div style={{ borderRadius:24, overflow:"hidden", position:"relative", border:"1px solid var(--border)" }}>
          <div style={{ position:"absolute", inset:0, background:"var(--grad)", opacity:0.16 }} />
          <div style={{ position:"relative", padding:"54px 48px", display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:36 }}>
            {[["lock","Every seat guaranteed","If your event is cancelled or tickets don't arrive, you're covered — full refund, no questions."],
              ["globe","90+ countries","From Tokyo to Rio, browse and book verified tickets to events on every continent."],
              ["ticket","Instant mobile entry","Tickets land in your wallet seconds after checkout. Scan and walk straight in."]].map(([ic,t,d]) => (
              <div key={t}>
                <div style={{ width:48, height:48, borderRadius:14, background:"var(--surface-2)", border:"1px solid var(--border)", display:"grid", placeItems:"center", marginBottom:18, color:"var(--accent)" }}>
                  <Icon name={ic} size={22} />
                </div>
                <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-0.01em", marginBottom:8 }}>{t}</div>
                <p style={{ fontSize:14.5, color:"var(--dim)", lineHeight:1.6, margin:0 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* festivals spotlight */}
      <section style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"80px 28px 0" }}>
        <SecHead kicker="Season highlights" title="Festivals worth the flight" action="All festivals" onAction={() => go({ name:"browse", cat:"festivals" })} />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
          {fests.map((e,i) => <EventCard key={e.id} ev={e} i={i} wide />)}
        </div>
      </section>
    </div>
  );
}

/* ---------- BROWSE ---------- */
function Browse({ route }) {
  const { go } = useC2(NeopCtx);
  const [cat, setCat] = useS2(route.cat || null);
  const [sort, setSort] = useS2("trending");
  useE2(() => { setCat(route.cat || null); }, [route.cat]);

  let list = NEOP.EVENTS.filter(e => !cat || e.category === cat);
  if (sort === "price") list = [...list].sort((a,b)=>a.priceFrom-b.priceFrom);
  if (sort === "date") list = [...list].sort((a,b)=>parseDate(a.date)-parseDate(b.date));
  if (sort === "trending") list = [...list].sort((a,b)=>(b.hot?1:0)-(a.hot?1:0));

  const catObj = NEOP.CATEGORIES.find(c=>c.id===cat);

  return (
    <div style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"32px 28px 0" }}>
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:13.5, color:"var(--faint)", marginBottom:10 }}>
          <button onClick={()=>go({name:"home"})} style={{color:"var(--dim)"}}>Home</button> / Browse{catObj?` / ${catObj.label}`:""}
        </div>
        <h1 className="serif" style={{ fontSize:"clamp(36px,5vw,58px)", margin:0, lineHeight:1 }}>
          {catObj ? catObj.label : <>Discover events <span className="ital" style={{color:"var(--dim)"}}>worldwide</span></>}
        </h1>
      </div>

      <div style={{ marginBottom:22 }}><SearchBar compact /></div>

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <CatPill cat={{label:"All",emoji:"✺"}} active={!cat} onClick={()=>setCat(null)} />
        {NEOP.CATEGORIES.map(c => <CatPill key={c.id} cat={c} active={cat===c.id} onClick={()=>setCat(c.id)} />)}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13.5, color:"var(--faint)" }}>Sort</span>
          <div style={{ display:"flex", gap:4, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:999, padding:4 }}>
            {[["trending","Trending"],["price","Price"],["date","Date"]].map(([k,l]) => (
              <button key={k} onClick={()=>setSort(k)} className="focus-ring" style={{ padding:"7px 14px", borderRadius:999, fontSize:13.5, fontWeight:600,
                background: sort===k?"var(--text)":"transparent", color: sort===k?"#0a0a0f":"var(--dim)", transition:"all .2s" }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ fontSize:14, color:"var(--dim)", marginBottom:18 }}>{list.length} events</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
        {list.map((e,i) => <EventCard key={e.id} ev={e} i={i} />)}
      </div>
    </div>
  );
}

Object.assign(window, { Home, Browse, SearchBar, Hero, SecHead, CityMarquee });
