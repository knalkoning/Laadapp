import { useState, useEffect, useMemo } from "react";

const STORAGE_KEY = "laadtracker-v1";
const MAANDEN = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
const MAANDEN_LANG = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];

const fEuro  = (v) => `€ ${Number(v).toFixed(2).replace(".", ",")}`;
const fKwh   = (v) => `${Number(v).toFixed(2)} kWh`;
const today  = () => new Date().toISOString().split("T")[0];
const fDatum = (d) => { const dt = new Date(d); return `${dt.getDate()} ${MAANDEN[dt.getMonth()]} ${dt.getFullYear()}`; };
const EMPTY  = { datum: today(), locatie: "", beginProcent: "", eindProcent: "", kwh: "", prijsPerKwh: "", kosten: "", notitie: "" };

function Badge({ children, color }) {
  return <span style={{ background:`${color}22`, color, border:`1px solid ${color}44`, borderRadius:4, padding:"2px 8px", fontSize:11, fontFamily:"monospace", letterSpacing:1, fontWeight:700 }}>{children}</span>;
}
function SLabel({ children }) {
  return <div style={{ fontSize:10, color:"var(--muted)", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>{children}</div>;
}
function FLabel({ children }) {
  return <label style={{ fontSize:10, color:"var(--muted)", letterSpacing:1, textTransform:"uppercase", marginBottom:5, display:"block" }}>{children}</label>;
}
function FInput(props) {
  return <input style={{ width:"100%", background:"#0d1620", border:"1px solid var(--border)", borderRadius:8, color:"var(--text)", padding:"10px 12px", fontSize:14, fontFamily:"inherit", marginBottom:10, outline:"none", WebkitAppearance:"none" }} {...props} />;
}
function Pill({ active, onClick, children }) {
  return <button onClick={onClick} style={{ padding:"4px 10px", borderRadius:6, fontSize:10, fontFamily:"monospace", cursor:"pointer", fontWeight:700, background:active?"#00e5ff22":"#0d1620", border:`1px solid ${active?"var(--accent)":"var(--border)"}`, color:active?"var(--accent)":"var(--muted)", transition:"all .15s" }}>{children}</button>;
}

export default function LaadTracker() {
  const [sessies, setSessies]         = useState([]);
  const [form, setForm]               = useState(EMPTY);
  const [tab, setTab]                 = useState("overzicht");
  const [filterJaar, setFilterJaar]   = useState(new Date().getFullYear());
  const [filterMaand, setFilterMaand] = useState(null);
  const [deleteId, setDeleteId]       = useState(null);
  const [saved, setSaved]             = useState(false);

  useEffect(() => { try { setSessies(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessies)); } catch {} }, [sessies]);

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const next = { ...prev, [name]: value };
      const kwh   = parseFloat(name === "kwh"         ? value : next.kwh);
      const prijs = parseFloat(name === "prijsPerKwh" ? value : next.prijsPerKwh);
      const kost  = parseFloat(name === "kosten"      ? value : next.kosten);
      if (name === "kwh" || name === "prijsPerKwh") {
        if (kwh > 0 && prijs > 0) next.kosten = (kwh * prijs).toFixed(2);
      } else if (name === "kosten") {
        if (kost > 0 && kwh > 0)        next.prijsPerKwh = (kost / kwh).toFixed(4);
        else if (kost > 0 && prijs > 0) next.kwh         = (kost / prijs).toFixed(2);
      }
      return next;
    });
  };

  const calcHint = useMemo(() => {
    const k = parseFloat(form.kwh), p = parseFloat(form.prijsPerKwh), c = parseFloat(form.kosten);
    if (k > 0 && c > 0) return `${k.toFixed(2)} kWh × € ${(p>0?p:c/k).toFixed(4)}/kWh = € ${c.toFixed(2)}`;
    return null;
  }, [form.kwh, form.prijsPerKwh, form.kosten]);

  const handleSave = () => {
    const kwh = parseFloat(form.kwh), kosten = parseFloat(form.kosten);
    if (!form.datum || isNaN(kwh) || isNaN(kosten)) return;
    setSessies(s => [{ id:Date.now().toString(), datum:form.datum, locatie:form.locatie||"Onbekend",
      beginProcent: form.beginProcent!==""?Number(form.beginProcent):null,
      eindProcent:  form.eindProcent !==""?Number(form.eindProcent) :null,
      kwh, kosten, prijsPerKwh:parseFloat(form.prijsPerKwh)||null, notitie:form.notitie,
    }, ...s]);
    setForm(EMPTY);
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
    setTab("overzicht");
  };

  const jaren = useMemo(() => {
    const js = [...new Set(sessies.map(s=>new Date(s.datum).getFullYear()))].sort((a,b)=>b-a);
    if (!js.includes(new Date().getFullYear())) js.unshift(new Date().getFullYear());
    return js;
  }, [sessies]);

  const sesJaar   = useMemo(() => sessies.filter(s=>new Date(s.datum).getFullYear()===filterJaar), [sessies,filterJaar]);
  const perMaand  = useMemo(() => {
    const m={};
    sesJaar.forEach(s=>{ const i=new Date(s.datum).getMonth(); if(!m[i])m[i]={kwh:0,kosten:0,sessies:0}; m[i].kwh+=s.kwh; m[i].kosten+=s.kosten; m[i].sessies++; });
    return m;
  }, [sesJaar]);
  const tot       = useMemo(() => ({ kwh:sesJaar.reduce((a,s)=>a+s.kwh,0), kosten:sesJaar.reduce((a,s)=>a+s.kosten,0), sessies:sesJaar.length }), [sesJaar]);
  const gemPrijs  = tot.kwh>0?(tot.kosten/tot.kwh).toFixed(3):null;
  const maxKwh    = Math.max(...Object.values(perMaand).map(m=>m.kwh),1);
  const gefiltered= filterMaand!==null ? sessies.filter(s=>{const d=new Date(s.datum);return d.getFullYear()===filterJaar&&d.getMonth()===filterMaand;}) : sesJaar;
  const batB=parseFloat(form.beginProcent), batE=parseFloat(form.eindProcent), hasBat=!isNaN(batB)&&!isNaN(batE);

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
    :root{--bg:#0a0e14;--surface:#111820;--border:#1e3040;--accent:#00e5ff;--green:#00ff88;--amber:#ffb700;--text:#e8f0f8;--muted:#5a7a94}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    body{background:var(--bg)}
    input,textarea{outline:none;-webkit-appearance:none}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  `;

  return (
    <>
      <style>{css}</style>
      <div style={{fontFamily:"'Sora',sans-serif",background:"var(--bg)",minHeight:"100vh",color:"var(--text)",maxWidth:480,margin:"0 auto",paddingBottom:76}}>

        {/* HEADER */}
        <div style={{padding:"20px 16px 0",borderBottom:"1px solid var(--border)",position:"sticky",top:0,zIndex:50,background:"var(--bg)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <span style={{color:"var(--accent)",fontSize:22}}>⚡</span>
            <span style={{fontFamily:"'Space Mono',monospace",fontSize:18,fontWeight:700,color:"var(--accent)"}}>LaadTracker</span>
            {saved&&<span style={{marginLeft:"auto",color:"var(--green)",fontSize:11,fontFamily:"monospace"}}>✓ Opgeslagen</span>}
          </div>
          <div style={{fontSize:10,color:"var(--muted)",letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>EV Laadkosten &amp; Energie</div>
          <div style={{display:"flex"}}>
            {[["overzicht","📋 Sessies"],["invoer","⚡ Invoer"],["statistieken","📊 Stats"]].map(([k,lbl])=>(
              <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:"10px 4px",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",textAlign:"center",cursor:"pointer",background:"none",border:"none",borderBottom:`2px solid ${tab===k?"var(--accent)":"transparent"}`,color:tab===k?"var(--accent)":"var(--muted)",fontFamily:"'Space Mono',monospace",transition:"all .2s"}}>{lbl}</button>
            ))}
          </div>
        </div>

        <div style={{padding:"14px 14px 0"}}>

          {/* OVERZICHT */}
          {tab==="overzicht"&&<div style={{animation:"fadeUp .3s ease"}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              {jaren.map(j=><Pill key={j} active={filterJaar===j} onClick={()=>{setFilterJaar(j);setFilterMaand(null);}}>{j}</Pill>)}
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:14,marginBottom:12}}>
              <SLabel>Totaal {filterJaar}</SLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                {[["Kosten",fEuro(tot.kosten),"var(--amber)"],["kWh",fKwh(tot.kwh),"var(--accent)"],["Sessies",tot.sessies,"var(--green)"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"#0d1620",border:"1px solid var(--border)",borderRadius:8,padding:"10px 8px",textAlign:"center"}}>
                    <div style={{fontFamily:"monospace",fontSize:14,fontWeight:700,color:c}}>{v}</div>
                    <div style={{fontSize:9,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginTop:3}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:11,color:"var(--muted)"}}>Gem. prijs: <span style={{color:"var(--amber)",fontFamily:"monospace",fontWeight:700}}>{gemPrijs?`€ ${gemPrijs}/kWh`:"–"}</span></div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              <Pill active={filterMaand===null} onClick={()=>setFilterMaand(null)}>Alle</Pill>
              {MAANDEN.map((m,i)=>perMaand[i]?<Pill key={i} active={filterMaand===i} onClick={()=>setFilterMaand(filterMaand===i?null:i)}>{m}</Pill>:null)}
            </div>
            {gefiltered.length===0
              ?<div style={{textAlign:"center",color:"var(--muted)",padding:"50px 0",fontSize:13}}>Geen sessies.<br/><span style={{fontSize:11}}>Voeg je eerste toe →</span></div>
              :gefiltered.map(s=>{
                const hp=s.beginProcent!==null&&s.eindProcent!==null;
                return(<div key={s.id} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",marginBottom:8,animation:"fadeUp .25s ease"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <div>
                      <div style={{fontFamily:"monospace",fontSize:12,color:"var(--accent)"}}>{fDatum(s.datum)}</div>
                      <div style={{fontSize:13,fontWeight:600,marginTop:2}}>{s.locatie}</div>
                    </div>
                    <button onClick={()=>setDeleteId(s.id)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:16,padding:4}}>🗑</button>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                    <Badge color="var(--green)">{fKwh(s.kwh)}</Badge>
                    <Badge color="var(--amber)">{fEuro(s.kosten)}</Badge>
                    {hp&&<Badge color="var(--accent)">{s.beginProcent}% → {s.eindProcent}%</Badge>}
                    <Badge color="var(--muted)">€ {(s.kosten/s.kwh).toFixed(3).replace(".",",")}/kWh</Badge>
                  </div>
                  {hp&&<div style={{marginTop:10,position:"relative",height:6,background:"#0d1620",borderRadius:3}}><div style={{position:"absolute",left:`${s.beginProcent}%`,width:`${Math.max(0,s.eindProcent-s.beginProcent)}%`,height:"100%",background:"linear-gradient(90deg,var(--accent),var(--green))",borderRadius:3,minWidth:3}}/></div>}
                  {s.notitie&&<div style={{marginTop:8,fontSize:11,color:"var(--muted)"}}>{s.notitie}</div>}
                </div>);
              })
            }
          </div>}

          {/* INVOER */}
          {tab==="invoer"&&<div style={{animation:"fadeUp .3s ease",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:14,marginBottom:12}}>
            <FLabel>Datum</FLabel><FInput type="date" name="datum" value={form.datum} onChange={handleForm}/>
            <FLabel>Locatie</FLabel><FInput type="text" name="locatie" placeholder="Thuis, Lidl, Fastned..." value={form.locatie} onChange={handleForm}/>
            <FLabel>Batterij begin % → eind %</FLabel>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <FInput type="number" name="beginProcent" placeholder="Begin %" min="0" max="100" value={form.beginProcent} onChange={handleForm}/>
              <FInput type="number" name="eindProcent"  placeholder="Eind %"  min="0" max="100" value={form.eindProcent}  onChange={handleForm}/>
            </div>
            {hasBat&&<div style={{marginBottom:10}}>
              <div style={{position:"relative",height:8,background:"#0d1620",borderRadius:4}}>
                <div style={{position:"absolute",left:`${Math.min(batB,100)}%`,width:`${Math.max(0,Math.min(batE,100)-Math.min(batB,100))}%`,height:"100%",background:"linear-gradient(90deg,var(--accent),var(--green))",borderRadius:4,minWidth:3}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--muted)",marginTop:4}}>
                <span>{batB}%</span><span style={{color:"var(--green)",fontFamily:"monospace"}}>+{Math.max(0,batE-batB)}%</span><span>{batE}%</span>
              </div>
            </div>}
            <div style={{background:"#0d1620",border:"1px solid var(--border)",borderRadius:10,padding:12,marginBottom:10}}>
              <div style={{fontSize:10,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Vul 2 van de 3 in — de derde wordt berekend</div>
              <FLabel>Geladen energie (kWh)</FLabel>
              <FInput type="number" name="kwh" placeholder="kWh" step="0.01" min="0" value={form.kwh} onChange={handleForm}/>
              <FLabel>Prijs per kWh (€)</FLabel>
              <FInput type="number" name="prijsPerKwh" placeholder="bijv. 0.29" step="0.0001" min="0" value={form.prijsPerKwh} onChange={handleForm}/>
              <FLabel>Totale kosten (€)</FLabel>
              <FInput type="number" name="kosten" placeholder="wordt berekend" step="0.01" min="0" value={form.kosten} onChange={handleForm}/>
              {calcHint&&<div style={{fontSize:12,color:"var(--amber)",fontFamily:"monospace",marginTop:-4}}>✓ {calcHint}</div>}
            </div>
            <FLabel>Notitie (optioneel)</FLabel>
            <textarea name="notitie" placeholder="Extra info..." value={form.notitie} onChange={handleForm} style={{width:"100%",background:"#0d1620",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",padding:"10px 12px",fontSize:14,fontFamily:"inherit",marginBottom:10,outline:"none",resize:"vertical",minHeight:60}}/>
            <button onClick={handleSave} disabled={!form.kwh||!form.kosten} style={{width:"100%",padding:13,borderRadius:10,border:"none",cursor:"pointer",fontFamily:"'Space Mono',monospace",fontWeight:700,fontSize:13,letterSpacing:1,background:"linear-gradient(135deg,var(--accent),#0077aa)",color:"#000",opacity:(!form.kwh||!form.kosten)?0.4:1}}>
              SESSIE OPSLAAN
            </button>
          </div>}

          {/* STATISTIEKEN */}
          {tab==="statistieken"&&<div style={{animation:"fadeUp .3s ease"}}>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              {jaren.map(j=><Pill key={j} active={filterJaar===j} onClick={()=>setFilterJaar(j)}>{j}</Pill>)}
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:14,marginBottom:12}}>
              <SLabel>Jaar {filterJaar} — Samenvatting</SLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[["Totale kosten",fEuro(tot.kosten),"var(--amber)"],["Totaal kWh",fKwh(tot.kwh),"var(--accent)"],["Sessies",tot.sessies,"var(--green)"],["Gem. €/kWh",gemPrijs?`€ ${gemPrijs}`:"–","var(--muted)"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"#0d1620",border:"1px solid var(--border)",borderRadius:8,padding:12}}>
                    <div style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:c}}>{v}</div>
                    <div style={{fontSize:9,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginTop:4}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:14,marginBottom:12}}>
              <SLabel>kWh per maand</SLabel>
              <div style={{display:"flex",alignItems:"flex-end",gap:3,height:80}}>
                {MAANDEN.map((m,i)=>{const v=perMaand[i]?.kwh||0;const h=v>0?Math.max(5,(v/maxKwh)*68):2;return(
                  <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{width:"100%",height:h,background:v>0?"linear-gradient(180deg,var(--accent),#007799)":"var(--border)",borderRadius:"2px 2px 0 0",transition:"height .4s"}}/>
                    <div style={{fontSize:8,color:"var(--muted)"}}>{m}</div>
                  </div>
                );})}
              </div>
            </div>
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:14,marginBottom:12}}>
              <SLabel>Kosten per maand</SLabel>
              {Object.keys(perMaand).length===0
                ?<div style={{color:"var(--muted)",fontSize:12,textAlign:"center",padding:"20px 0"}}>Geen data voor {filterJaar}</div>
                :MAANDEN.map((m,i)=>!perMaand[i]?null:(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--border)"}}>
                    <div><div style={{fontWeight:600,fontSize:13}}>{MAANDEN_LANG[i]}</div><div style={{fontSize:10,color:"var(--muted)"}}>{perMaand[i].sessies} sessie{perMaand[i].sessies!==1?"s":""}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontFamily:"monospace",fontSize:13,color:"var(--amber)"}}>{fEuro(perMaand[i].kosten)}</div><div style={{fontFamily:"monospace",fontSize:11,color:"var(--accent)"}}>{fKwh(perMaand[i].kwh)}</div></div>
                  </div>
                ))
              }
            </div>
          </div>}
        </div>

        {/* DELETE DIALOG */}
        {deleteId&&<div onClick={e=>e.target===e.currentTarget&&setDeleteId(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:24,maxWidth:300,width:"100%"}}>
            <div style={{fontWeight:700,marginBottom:8}}>Sessie verwijderen?</div>
            <div style={{fontSize:12,color:"var(--muted)",marginBottom:20}}>Dit kan niet ongedaan worden gemaakt.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setDeleteId(null)} style={{flex:1,padding:10,borderRadius:8,background:"#0d1620",border:"1px solid var(--border)",color:"var(--muted)",cursor:"pointer"}}>Annuleer</button>
              <button onClick={()=>{setSessies(s=>s.filter(x=>x.id!==deleteId));setDeleteId(null);}} style={{flex:1,padding:10,borderRadius:8,background:"#ff445522",border:"1px solid #ff445555",color:"#ff6060",cursor:"pointer",fontWeight:700}}>Verwijder</button>
            </div>
          </div>
        </div>}

        {/* NAVBAR */}
        <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"var(--surface)",borderTop:"1px solid var(--border)",display:"flex",zIndex:100}}>
          {[["overzicht","📋","Sessies"],["invoer","⚡","Invoer"],["statistieken","📊","Stats"]].map(([k,icon,lbl])=>(
            <button key={k} onClick={()=>setTab(k)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 0 8px",cursor:"pointer",background:"none",border:"none",color:tab===k?"var(--accent)":"var(--muted)",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",gap:3,fontFamily:"'Space Mono',monospace"}}>
              <span style={{fontSize:20}}>{icon}</span>{lbl}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
    }
