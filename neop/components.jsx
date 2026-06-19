/* neop shared components → window */
const { useState, useEffect, useRef, useContext, createContext } = React;

const NeopCtx = createContext({ go: () => {}, dir: "editorial", route: { name: "home" } });

/* ---------- helpers ---------- */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function parseDate(s){ return new Date(s); }
function fmtDate(s){ const d=parseDate(s); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; }
function fmtDateLong(s){ const d=parseDate(s); return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
function fmtTime(s){ const d=parseDate(s); let h=d.getHours(); const m=d.getMinutes(); const ap=h>=12?"PM":"AM"; h=h%12||12; return `${h}:${m.toString().padStart(2,"0")} ${ap}`; }
function dayNum(s){ return parseDate(s).getDate(); }
function monStr(s){ return MONTHS[parseDate(s).getMonth()].toUpperCase(); }

/* ---------- icons ---------- */
function Icon({ name, size = 18, stroke = 1.7, style }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", style };
  const paths = {
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>,
    cal: <><rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    arrowL: <><path d="M19 12H5M11 18l-6-6 6-6"/></>,
    heart: <><path d="M12 20s-7-4.5-9.5-9C1 8 2.5 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 6.5C19 15.5 12 20 12 20Z"/></>,
    bolt: <><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></>,
    check: <><path d="M20 6 9 17l-5-5"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    minus: <><path d="M5 12h14"/></>,
    star: <><path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9 6.7 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></>,
    lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></>,
    ticket: <><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2v0a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4 2 2 0 0 1 0-4Z"/><path d="M9 6v12" strokeDasharray="1 3"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></>,
    play: <><path d="M7 4v16l13-8z" fill="currentColor" stroke="none"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  };
  return <svg {...p}>{paths[name]}</svg>;
}

/* ---------- smart image with graceful fallback ---------- */
function Img({ src, alt, className = "", style, zoom }) {
  const [ok, setOk] = useState(true);
  return (
    <div className={"imgwrap " + className} style={style}>
      {ok && <img src={src} alt={alt} onError={() => setOk(false)}
        style={{ width:"100%", height:"100%", objectFit:"cover", transform: zoom ? "scale(1.06)" : "none" }} />}
    </div>
  );
}

/* ---------- wordmark ---------- */
function Logo({ size = 24, onClick }) {
  return (
    <button onClick={onClick} className="focus-ring" style={{ display:"flex", alignItems:"center", gap:9, padding:0 }} aria-label="neop home">
      <span style={{ width:size*0.78, height:size*0.78, borderRadius:7, background:"var(--grad)",
        display:"grid", placeItems:"center", boxShadow:"0 4px 18px -6px var(--accent)" }}>
        <span style={{ width:size*0.30, height:size*0.30, borderRadius:"50%", background:"#fff" }} />
      </span>
      <span style={{ fontSize:size, fontWeight:800, letterSpacing:"-0.04em" }}>neop</span>
    </button>
  );
}

/* ---------- buttons ---------- */
function Btn({ children, onClick, variant = "solid", size = "md", full, icon, iconR, style }) {
  const [h, setH] = useState(false);
  const sizes = { sm:{p:"9px 16px",f:14}, md:{p:"13px 22px",f:15}, lg:{p:"17px 30px",f:16.5} };
  const s = sizes[size];
  const base = { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:9,
    padding:s.p, fontSize:s.f, fontWeight:600, borderRadius:999, letterSpacing:"-0.01em",
    width: full?"100%":"auto", transition:"transform .2s, box-shadow .25s, background .2s, border-color .2s",
    transform: h?"translateY(-1px)":"none", whiteSpace:"nowrap" };
  const variants = {
    solid: { background:"var(--grad)", color:"var(--accent-ink)",
      boxShadow: h?"0 12px 30px -8px var(--accent)":"0 6px 18px -8px var(--accent)" },
    light: { background:"var(--text)", color:"#0a0a0f" },
    ghost: { background: h?"var(--surface-2)":"transparent", color:"var(--text)", border:"1px solid var(--border-2)" },
    soft:  { background: h?"var(--surface-2)":"var(--surface)", color:"var(--text)", border:"1px solid var(--border)" },
  };
  return (
    <button className="focus-ring" onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ ...base, ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={s.f+2} />}{children}{iconR && <Icon name={iconR} size={s.f+2} />}
    </button>
  );
}

/* ---------- category chip ---------- */
function CatPill({ cat, active, onClick }) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} className="focus-ring"
      style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:999,
        fontSize:14.5, fontWeight:500, whiteSpace:"nowrap",
        border: active?"1px solid transparent":"1px solid var(--border)",
        background: active?"var(--grad)":(h?"var(--surface-2)":"var(--surface)"),
        color: active?"#fff":"var(--text)", transition:"all .2s" }}>
      <span style={{ opacity: active?1:.7 }}>{cat.emoji}</span>{cat.label}
    </button>
  );
}

/* ---------- top nav ---------- */
function Nav() {
  const { go, route } = useContext(NeopCtx);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f(); window.addEventListener("scroll", f); return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header style={{ position:"sticky", top:0, zIndex:50,
      background: scrolled?"rgba(7,7,11,0.82)":"transparent",
      backdropFilter: scrolled?"blur(18px)":"none",
      borderBottom: scrolled?"1px solid var(--border)":"1px solid transparent",
      transition:"all .3s" }}>
      <div style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"16px 28px",
        display:"flex", alignItems:"center", gap:24 }}>
        <Logo onClick={() => go({ name:"home" })} />
        <nav style={{ display:"flex", gap:4, marginLeft:8 }}>
          {[["Browse","browse"],["Music","music"],["Sports","sports"]].map(([label,cat]) => (
            <button key={label} onClick={() => go({ name:"browse", cat: cat==="browse"?null:cat })} className="focus-ring"
              style={{ padding:"8px 14px", fontSize:14.5, fontWeight:500, borderRadius:999,
                color: route.name==="browse"&&label==="Browse"?"var(--text)":"var(--dim)" }}>{label}</button>
          ))}
        </nav>
        <button onClick={() => go({ name:"browse" })} className="focus-ring"
          style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10, padding:"10px 18px",
            borderRadius:999, background:"var(--surface)", border:"1px solid var(--border)",
            color:"var(--faint)", fontSize:14, minWidth:230, justifyContent:"flex-start" }}>
          <Icon name="search" size={17} /> Search events, artists, cities…
        </button>
        <button className="focus-ring" style={{ display:"flex", alignItems:"center", gap:7, color:"var(--dim)", fontSize:14.5, fontWeight:500 }}>
          <Icon name="globe" size={18} /> EN · USD
        </button>
        <Btn size="sm" variant="soft" icon="user">Sign in</Btn>
      </div>
    </header>
  );
}

/* ---------- event card (direction-aware) ---------- */
function EventCard({ ev, i = 0, wide }) {
  const { go, dir } = useContext(NeopCtx);
  const [h, setH] = useState(false);
  const cat = NEOP.CATEGORIES.find(c => c.id === ev.category);
  const open = () => go({ name:"event", id: ev.id });

  if (dir === "kinetic") {
    // ticket-stub style
    return (
      <button onClick={open} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} className="focus-ring up"
        style={{ textAlign:"left", display:"block", width:"100%", animationDelay:`${i*60}ms`,
          background:"var(--bg-2)", borderRadius:20, overflow:"hidden", border:"1px solid var(--border)",
          transition:"transform .3s, border-color .3s", transform: h?"translateY(-6px)":"none",
          borderColor: h?"var(--border-2)":"var(--border)" }}>
        <div style={{ position:"relative" }}>
          <Img src={ev.image} alt={ev.title} zoom={h} style={{ aspectRatio: wide?"16/9":"5/4" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(7,7,11,.85), transparent 55%)" }} />
          {ev.hot && <span style={{ position:"absolute", top:14, left:14, display:"inline-flex", alignItems:"center", gap:5,
            padding:"6px 11px", borderRadius:999, background:"var(--grad)", color:"#fff", fontSize:12, fontWeight:700 }}>
            <Icon name="bolt" size={13}/> HOT</span>}
          <span style={{ position:"absolute", top:14, right:14, padding:"6px 11px", borderRadius:999,
            background:"rgba(0,0,0,.5)", backdropFilter:"blur(8px)", fontSize:12, fontWeight:600, color:"#fff" }}>{cat.label}</span>
          <div style={{ position:"absolute", left:16, bottom:14, right:16 }}>
            <div style={{ fontSize:12.5, fontWeight:600, color:"rgba(255,255,255,.85)", display:"flex", gap:7, alignItems:"center" }}>
              <Icon name="pin" size={13}/> {ev.city}, {ev.country}
            </div>
          </div>
        </div>
        {/* perforation */}
        <div style={{ position:"relative", borderTop:"2px dashed var(--border-2)", margin:"0 -1px" }}>
          <span style={{ position:"absolute", left:-9, top:-9, width:18, height:18, borderRadius:"50%", background:"var(--bg)" }}/>
          <span style={{ position:"absolute", right:-9, top:-9, width:18, height:18, borderRadius:"50%", background:"var(--bg)" }}/>
        </div>
        <div style={{ padding:"16px 18px 18px", display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:12 }}>
          <div>
            <div style={{ fontSize:19, fontWeight:700, letterSpacing:"-0.02em", lineHeight:1.1 }}>{ev.title}</div>
            <div style={{ fontSize:13.5, color:"var(--dim)", marginTop:4 }}>{fmtDate(ev.date)} · {ev.venue}</div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontSize:11, color:"var(--faint)", fontWeight:600 }}>FROM</div>
            <div style={{ fontSize:19, fontWeight:800, letterSpacing:"-0.02em" }}>{ev.currency}{ev.priceFrom}</div>
          </div>
        </div>
      </button>
    );
  }

  // editorial style — image-forward, serif title
  return (
    <button onClick={open} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} className="focus-ring up"
      style={{ textAlign:"left", display:"block", width:"100%", animationDelay:`${i*60}ms` }}>
      <div style={{ position:"relative", borderRadius:18, overflow:"hidden", border:"1px solid var(--border)",
        transition:"border-color .3s", borderColor: h?"var(--border-2)":"var(--border)" }}>
        <Img src={ev.image} alt={ev.title} zoom={h} style={{ aspectRatio: wide?"16/10":"4/5" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(7,7,11,.9) 4%, rgba(7,7,11,.15) 45%, transparent)" }} />
        {ev.hot && <span style={{ position:"absolute", top:14, left:14, display:"inline-flex", alignItems:"center", gap:5,
          padding:"6px 11px", borderRadius:999, background:"rgba(255,255,255,.14)", backdropFilter:"blur(8px)",
          border:"1px solid rgba(255,255,255,.25)", color:"#fff", fontSize:12, fontWeight:600 }}>
          <Icon name="bolt" size={13}/> Trending</span>}
        <div style={{ position:"absolute", left:18, right:18, bottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12.5, fontWeight:600,
            color:"rgba(255,255,255,.8)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>
            <span>{cat.label}</span><span style={{opacity:.5}}>·</span><span>{ev.genre}</span>
          </div>
          <div className="serif" style={{ fontSize:wide?34:25, lineHeight:1.04, letterSpacing:"-0.01em" }}>{ev.title}</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12, gap:12 }}>
            <div style={{ fontSize:13.5, color:"rgba(255,255,255,.82)", display:"flex", alignItems:"center", gap:6 }}>
              <Icon name="pin" size={14}/> {ev.city} · {fmtDate(ev.date)}
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", gap:6,
              opacity: h?1:.85, transition:"opacity .2s" }}>
              from {ev.currency}{ev.priceFrom} <Icon name="arrow" size={15}/>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ---------- footer ---------- */
function Footer() {
  const cols = [
    ["Discover", ["Concerts","Festivals","Sports","Theater","Comedy"]],
    ["Company", ["About neop","Careers","Press","Partners"]],
    ["Support", ["Help center","Buyer guarantee","Refunds","Contact"]],
  ];
  return (
    <footer style={{ borderTop:"1px solid var(--border)", marginTop:100, background:"var(--bg-2)" }}>
      <div style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"64px 28px 40px",
        display:"grid", gridTemplateColumns:"1.6fr 1fr 1fr 1fr", gap:40 }}>
        <div>
          <Logo />
          <p style={{ color:"var(--dim)", fontSize:14.5, lineHeight:1.6, marginTop:16, maxWidth:280 }}>
            Tickets to the world's best live events. Verified sellers, every seat guaranteed.
          </p>
          <div style={{ display:"flex", gap:8, marginTop:20 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 13px", borderRadius:999,
              background:"var(--surface)", border:"1px solid var(--border)", fontSize:13, color:"var(--dim)" }}>
              <Icon name="lock" size={14}/> 100% guarantee</span>
          </div>
        </div>
        {cols.map(([h, items]) => (
          <div key={h}>
            <div style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--faint)", marginBottom:16 }}>{h}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
              {items.map(it => <a key={it} href="#" style={{ fontSize:14.5, color:"var(--dim)" }}>{it}</a>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"22px 28px",
        borderTop:"1px solid var(--border)", display:"flex", justifyContent:"space-between", color:"var(--faint)", fontSize:13.5 }}>
        <span>© 2026 neop. All rights reserved.</span>
        <span style={{ display:"flex", gap:22 }}><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a></span>
      </div>
    </footer>
  );
}

Object.assign(window, { NeopCtx, Icon, Img, Logo, Btn, CatPill, Nav, EventCard, Footer,
  fmtDate, fmtDateLong, fmtTime, dayNum, monStr, parseDate });
