/* neop flow: Event detail, Checkout, Confirmation → window */
const { useState: useS3, useContext: useC3, useEffect: useE3 } = React;

function tiersFor(ev) {
  const b = ev.priceFrom;
  return [
    { id:"ga", name:"General Admission", desc:"Standing · general access", price:b, left:"Plenty left" },
    { id:"prem", name:"Premium", desc:"Reserved seating · great views", price:Math.round(b*1.9), left:"42 left" },
    { id:"vip", name:"VIP Experience", desc:"Front section · lounge · merch", price:Math.round(b*3.4), left:"Only 8 left", hot:true },
  ];
}

/* ---------- EVENT DETAIL ---------- */
function EventDetail({ id }) {
  const { go, dir } = useC3(NeopCtx);
  const ev = NEOP.EVENTS.find(e => e.id === id);
  const tiers = tiersFor(ev);
  const [tier, setTier] = useS3(tiers[0].id);
  const [qty, setQty] = useS3(2);
  const cat = NEOP.CATEGORIES.find(c => c.id === ev.category);
  useE3(() => { window.scrollTo(0,0); }, [id]);

  const sel = tiers.find(t => t.id === tier);
  const subtotal = sel.price * qty;
  const more = NEOP.EVENTS.filter(e => e.category===ev.category && e.id!==ev.id).slice(0,3);

  return (
    <div>
      {/* hero */}
      <div style={{ position:"relative", marginTop:"-88px" }}>
        <div style={{ position:"absolute", inset:0 }}>
          <Img src={ev.image} alt={ev.title} style={{ width:"100%", height:"100%" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, var(--bg) 1%, rgba(7,7,11,.45) 45%, rgba(7,7,11,.6))" }} />
        </div>
        <div style={{ position:"relative", maxWidth:"var(--maxw)", margin:"0 auto", padding:"128px 28px 40px" }}>
          <button onClick={()=>go({name:"browse",cat:ev.category})} className="focus-ring"
            style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"9px 16px", borderRadius:999,
              background:"rgba(255,255,255,.12)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,.2)",
              fontSize:14, fontWeight:600, marginBottom:"min(28vh,260px)" }}>
            <Icon name="arrowL" size={16}/> Back
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            {ev.hot && <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:999, background:"var(--grad)", fontSize:12.5, fontWeight:700 }}><Icon name="bolt" size={13}/> Trending</span>}
            <span style={{ padding:"6px 12px", borderRadius:999, background:"rgba(255,255,255,.12)", backdropFilter:"blur(10px)", fontSize:12.5, fontWeight:600 }}>{cat.label} · {ev.genre}</span>
          </div>
          <div style={{ fontSize:16, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.12em", color:"rgba(255,255,255,.8)", marginBottom:10 }}>{ev.artist}</div>
          <h1 className="serif" style={{ fontSize:"clamp(48px,8vw,108px)", margin:0, lineHeight:0.92, letterSpacing:"-0.02em" }}>{ev.title}</h1>
          <div style={{ display:"flex", gap:26, marginTop:24, flexWrap:"wrap", color:"rgba(255,255,255,.9)", fontSize:16 }}>
            <span style={{ display:"flex", alignItems:"center", gap:9 }}><Icon name="cal" size={19}/> {fmtDateLong(ev.date)}</span>
            <span style={{ display:"flex", alignItems:"center", gap:9 }}><Icon name="clock" size={19}/> {fmtTime(ev.date)}</span>
            <span style={{ display:"flex", alignItems:"center", gap:9 }}><Icon name="pin" size={19}/> {ev.venue}, {ev.city}</span>
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"40px 28px 0",
        display:"grid", gridTemplateColumns:"1fr 400px", gap:48, alignItems:"start" }}>
        {/* left */}
        <div>
          <h2 className="serif" style={{ fontSize:32, margin:"0 0 16px" }}>About this event</h2>
          <p style={{ fontSize:17.5, lineHeight:1.7, color:"var(--dim)", margin:0, maxWidth:620 }}>{ev.blurb}</p>
          <p style={{ fontSize:17.5, lineHeight:1.7, color:"var(--dim)", marginTop:16, maxWidth:620 }}>
            Doors open one hour before showtime. This is an all-ages event. Tickets are fully transferable and backed by neop's buyer guarantee — if anything goes wrong, you're covered.
          </p>

          {ev.lineup && ev.lineup.length > 0 && (
            <div style={{ marginTop:44 }}>
              <h3 className="serif" style={{ fontSize:26, margin:"0 0 18px" }}>Lineup</h3>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                {ev.lineup.map((a,i) => (
                  <span key={a} style={{ padding:"11px 18px", borderRadius:12, background:"var(--surface)", border:"1px solid var(--border)",
                    fontSize:15.5, fontWeight: i===0?700:500 }}>{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* venue */}
          <div style={{ marginTop:44 }}>
            <h3 className="serif" style={{ fontSize:26, margin:"0 0 18px" }}>Venue</h3>
            <div style={{ borderRadius:18, overflow:"hidden", border:"1px solid var(--border)" }}>
              <div style={{ position:"relative", height:200 }} className="imgwrap">
                <div style={{ position:"absolute", inset:0, opacity:.5,
                  background:"repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 12px, transparent 12px 24px)" }} />
                <div style={{ position:"absolute", left:24, bottom:20, display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:"var(--grad)", display:"grid", placeItems:"center" }}><Icon name="pin" size={22}/></div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700 }}>{ev.venue}</div>
                    <div style={{ fontSize:14, color:"var(--dim)" }}>{ev.city}, {ev.country}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* right — ticket picker (sticky) */}
        <aside style={{ position:"sticky", top:104 }}>
          <div style={{ borderRadius:22, background:"var(--bg-2)", border:"1px solid var(--border)", overflow:"hidden" }}>
            <div style={{ padding:"22px 22px 6px" }}>
              <div style={{ fontSize:13, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--faint)" }}>Select tickets</div>
            </div>
            <div style={{ padding:"10px 16px", display:"flex", flexDirection:"column", gap:10 }}>
              {tiers.map(t => {
                const on = tier===t.id;
                return (
                  <button key={t.id} onClick={()=>setTier(t.id)} className="focus-ring" style={{ textAlign:"left", padding:"16px 18px", borderRadius:16,
                    border: on?"1.5px solid var(--accent)":"1px solid var(--border)", background: on?"var(--surface-2)":"transparent",
                    transition:"all .2s", position:"relative" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:12 }}>
                      <span style={{ fontSize:16, fontWeight:700 }}>{t.name}</span>
                      <span style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.02em" }}>{ev.currency}{t.price}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:5 }}>
                      <span style={{ fontSize:13, color:"var(--dim)" }}>{t.desc}</span>
                      <span style={{ fontSize:12.5, fontWeight:600, color: t.hot?"var(--accent-2)":"var(--faint)" }}>{t.left}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* qty */}
            <div style={{ padding:"8px 22px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:15, fontWeight:600 }}>Quantity</span>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="focus-ring" style={qtyBtn}><Icon name="minus" size={16}/></button>
                <span style={{ fontSize:18, fontWeight:700, minWidth:20, textAlign:"center" }}>{qty}</span>
                <button onClick={()=>setQty(q=>Math.min(8,q+1))} className="focus-ring" style={qtyBtn}><Icon name="plus" size={16}/></button>
              </div>
            </div>
            <div style={{ padding:"20px 22px 22px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"16px 0", borderTop:"1px solid var(--border)", marginBottom:4 }}>
                <span style={{ fontSize:14.5, color:"var(--dim)" }}>Subtotal · {qty} × {ev.currency}{sel.price}</span>
                <span style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.02em" }}>{ev.currency}{subtotal}</span>
              </div>
              <Btn full size="lg" iconR="arrow" onClick={()=>go({ name:"checkout", order:{ id:ev.id, tier:tier, qty } })}>Continue to checkout</Btn>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:7, marginTop:14, fontSize:13, color:"var(--faint)" }}>
                <Icon name="lock" size={14}/> Protected by neop's 100% guarantee
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* more like this */}
      <section style={{ maxWidth:"var(--maxw)", margin:"0 auto", padding:"72px 28px 0" }}>
        <SecHead kicker="Keep exploring" title="More like this" />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
          {more.map((e,i) => <EventCard key={e.id} ev={e} i={i} />)}
        </div>
      </section>
    </div>
  );
}
const qtyBtn = { width:36, height:36, borderRadius:"50%", border:"1px solid var(--border-2)", background:"var(--surface)",
  display:"grid", placeItems:"center", color:"var(--text)" };

/* ---------- CHECKOUT ---------- */
function Field({ label, placeholder, value, onChange, span, type="text" }) {
  return (
    <label style={{ display:"flex", flexDirection:"column", gap:8, gridColumn: span?`span ${span}`:"auto" }}>
      <span style={{ fontSize:13, fontWeight:600, color:"var(--dim)" }}>{label}</span>
      <input type={type} placeholder={placeholder} value={value} onChange={e=>onChange&&onChange(e.target.value)} className="focus-ring"
        style={{ padding:"14px 16px", borderRadius:12, background:"var(--surface)", border:"1px solid var(--border)",
          color:"var(--text)", fontSize:15.5, outline:"none" }} />
    </label>
  );
}

function Checkout({ route }) {
  const { go } = useC3(NeopCtx);
  const order = route.order;
  const ev = NEOP.EVENTS.find(e => e.id === order.id);
  const tier = tiersFor(ev).find(t => t.id === order.tier);
  const [email,setEmail]=useS3(""); const [name,setName]=useS3("");
  useE3(()=>{ window.scrollTo(0,0); },[]);

  const sub = tier.price * order.qty;
  const fees = Math.round(sub * 0.12);
  const total = sub + fees;

  return (
    <div style={{ maxWidth:1080, margin:"0 auto", padding:"24px 28px 0" }}>
      <button onClick={()=>go({name:"event",id:ev.id})} className="focus-ring" style={{ display:"inline-flex", alignItems:"center", gap:8, color:"var(--dim)", fontSize:14.5, fontWeight:600, marginBottom:20 }}>
        <Icon name="arrowL" size={16}/> Back to event
      </button>
      <h1 className="serif" style={{ fontSize:"clamp(34px,5vw,52px)", margin:"0 0 8px", lineHeight:1 }}>Checkout</h1>
      <p style={{ color:"var(--dim)", fontSize:16, margin:"0 0 32px" }}>You're seconds away. Tickets are held for 10:00.</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:40, alignItems:"start" }}>
        {/* form */}
        <div style={{ display:"flex", flexDirection:"column", gap:32 }}>
          <section>
            <h3 style={{ fontSize:18, fontWeight:700, margin:"0 0 16px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={stepDot}>1</span> Your details</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Field label="Full name" placeholder="Alex Rivera" value={name} onChange={setName} span={2} />
              <Field label="Email" placeholder="alex@email.com" value={email} onChange={setEmail} type="email" />
              <Field label="Phone" placeholder="+1 555 000 0000" type="tel" />
            </div>
          </section>
          <section>
            <h3 style={{ fontSize:18, fontWeight:700, margin:"0 0 16px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={stepDot}>2</span> Payment</h3>
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              {["Card","Apple Pay","PayPal"].map((m,i) => (
                <div key={m} style={{ flex:1, padding:"14px", borderRadius:12, textAlign:"center", fontSize:14.5, fontWeight:600,
                  border: i===0?"1.5px solid var(--accent)":"1px solid var(--border)", background: i===0?"var(--surface-2)":"transparent", cursor:"pointer" }}>{m}</div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Field label="Card number" placeholder="1234 5678 9012 3456" span={2} />
              <Field label="Expiry" placeholder="MM / YY" />
              <Field label="CVC" placeholder="123" />
            </div>
          </section>
          <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:13.5, color:"var(--faint)" }}>
            <Icon name="lock" size={15}/> Payments are encrypted and secured. This is a demo — no card is charged.
          </div>
        </div>

        {/* summary */}
        <aside style={{ position:"sticky", top:104, borderRadius:22, background:"var(--bg-2)", border:"1px solid var(--border)", overflow:"hidden" }}>
          <div style={{ position:"relative", height:140 }}>
            <Img src={ev.image} alt={ev.title} style={{ width:"100%", height:"100%" }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, var(--bg-2), transparent 70%)" }} />
            <div className="serif" style={{ position:"absolute", left:20, bottom:14, fontSize:24, lineHeight:1 }}>{ev.title}</div>
          </div>
          <div style={{ padding:"18px 22px" }}>
            <div style={{ fontSize:13.5, color:"var(--dim)", display:"flex", flexDirection:"column", gap:7 }}>
              <span style={{ display:"flex", alignItems:"center", gap:8 }}><Icon name="cal" size={15}/> {fmtDateLong(ev.date)}</span>
              <span style={{ display:"flex", alignItems:"center", gap:8 }}><Icon name="pin" size={15}/> {ev.venue}, {ev.city}</span>
            </div>
            <div style={{ borderTop:"1px solid var(--border)", margin:"16px 0", paddingTop:16, display:"flex", flexDirection:"column", gap:11, fontSize:14.5 }}>
              <Row l={`${tier.name} × ${order.qty}`} r={`${ev.currency}${sub}`} />
              <Row l="Service fees" r={`${ev.currency}${fees}`} dim />
              <Row l="Delivery · mobile" r="Free" dim />
            </div>
            <div style={{ borderTop:"1px solid var(--border)", paddingTop:16, display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
              <span style={{ fontSize:16, fontWeight:600 }}>Total</span>
              <span style={{ fontSize:28, fontWeight:800, letterSpacing:"-0.02em" }}>{ev.currency}{total}</span>
            </div>
            <div style={{ marginTop:18 }}>
              <Btn full size="lg" icon="lock" onClick={()=>go({ name:"confirm", order:{...order, total, currency:ev.currency} })}>Pay {ev.currency}{total}</Btn>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
const stepDot = { width:26, height:26, borderRadius:"50%", background:"var(--grad)", display:"inline-grid", placeItems:"center", fontSize:13, fontWeight:700, color:"#fff" };
function Row({ l, r, dim }) {
  return <div style={{ display:"flex", justifyContent:"space-between" }}>
    <span style={{ color: dim?"var(--dim)":"var(--text)" }}>{l}</span><span style={{ fontWeight:600 }}>{r}</span></div>;
}

/* ---------- CONFIRMATION ---------- */
function Confirm({ route }) {
  const { go } = useC3(NeopCtx);
  const order = route.order;
  const ev = NEOP.EVENTS.find(e => e.id === order.id);
  const tier = tiersFor(ev).find(t => t.id === order.tier);
  const code = "NEOP-" + ev.id.slice(0,3).toUpperCase() + "-" + Math.floor(1000+Math.random()*9000);
  useE3(()=>{ window.scrollTo(0,0); },[]);

  return (
    <div style={{ maxWidth:560, margin:"0 auto", padding:"40px 28px 0", textAlign:"center" }}>
      <div className="up" style={{ width:72, height:72, borderRadius:"50%", background:"var(--grad)", display:"grid", placeItems:"center", margin:"20px auto 24px", boxShadow:"0 12px 40px -10px var(--accent)" }}>
        <Icon name="check" size={36} stroke={2.4} />
      </div>
      <h1 className="serif up" style={{ fontSize:"clamp(36px,6vw,56px)", margin:"0 0 12px", lineHeight:1, animationDelay:"60ms" }}>You're going!</h1>
      <p className="up" style={{ color:"var(--dim)", fontSize:17, margin:"0 0 32px", animationDelay:"100ms" }}>
        Confirmation sent. Your tickets are in your wallet, ready to scan.
      </p>

      {/* ticket stub */}
      <div className="up" style={{ animationDelay:"160ms", textAlign:"left", background:"var(--bg-2)", borderRadius:22, overflow:"hidden", border:"1px solid var(--border)" }}>
        <div style={{ position:"relative", height:150 }}>
          <Img src={ev.image} alt={ev.title} style={{ width:"100%", height:"100%" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, var(--bg-2), transparent 65%)" }} />
          <div style={{ position:"absolute", left:22, bottom:16 }}>
            <div style={{ fontSize:12.5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", color:"rgba(255,255,255,.8)" }}>{ev.artist}</div>
            <div className="serif" style={{ fontSize:30, lineHeight:1 }}>{ev.title}</div>
          </div>
        </div>
        <div style={{ position:"relative", borderTop:"2px dashed var(--border-2)" }}>
          <span style={{ position:"absolute", left:-9, top:-9, width:18, height:18, borderRadius:"50%", background:"var(--bg)" }}/>
          <span style={{ position:"absolute", right:-9, top:-9, width:18, height:18, borderRadius:"50%", background:"var(--bg)" }}/>
        </div>
        <div style={{ padding:"22px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
          <Stub l="Date" v={fmtDate(ev.date)} />
          <Stub l="Time" v={fmtTime(ev.date)} />
          <Stub l="Venue" v={`${ev.venue}`} />
          <Stub l="City" v={`${ev.city}, ${ev.country}`} />
          <Stub l="Ticket" v={tier.name} />
          <Stub l="Quantity" v={`${order.qty} ${order.qty>1?"tickets":"ticket"}`} />
          <div style={{ gridColumn:"span 2", display:"flex", justifyContent:"space-between", alignItems:"center", borderTop:"1px solid var(--border)", paddingTop:18 }}>
            <div>
              <div style={{ fontSize:12, color:"var(--faint)", fontWeight:600 }}>ORDER</div>
              <div style={{ fontSize:15, fontWeight:700, letterSpacing:"0.02em" }}>{code}</div>
            </div>
            <div style={{ width:56, height:56, borderRadius:10, background:"#fff", padding:6 }}>
              <div style={{ width:"100%", height:"100%", background:"repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50%/12px 12px" }} />
            </div>
          </div>
        </div>
      </div>

      <div className="up" style={{ display:"flex", gap:12, marginTop:24, animationDelay:"220ms" }}>
        <Btn full size="lg" variant="soft" onClick={()=>go({name:"home"})}>Back home</Btn>
        <Btn full size="lg" iconR="arrow" onClick={()=>go({name:"browse"})}>Find more events</Btn>
      </div>
    </div>
  );
}
function Stub({ l, v }) {
  return <div>
    <div style={{ fontSize:12, color:"var(--faint)", fontWeight:600, marginBottom:3 }}>{l.toUpperCase()}</div>
    <div style={{ fontSize:15.5, fontWeight:600 }}>{v}</div>
  </div>;
}

Object.assign(window, { EventDetail, Checkout, Confirm });
