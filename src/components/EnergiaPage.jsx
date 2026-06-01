import { useMemo } from "react";
import { STAGE_META } from "../constants/stages";

const fmtEuro = (v, dec = 2) =>
  v == null || !Number.isFinite(v) ? "—" :
  v.toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtNum = (v, dec = 0) =>
  v == null || !Number.isFinite(v) ? "—" :
  v.toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const PRICE_PRESETS = [0.12, 0.18, 0.22, 0.28, 0.35];

export default function EnergiaPage({ t, sim, price, onPrice, stages: stagesProp }) {
  const stages = stagesProp || STAGE_META;

  const kw  = sim.energy?.kw  ?? 0;
  const kwh = sim.energy?.kwh ?? 0;
  const Q   = sim.output?.Q ?? sim.inlet?.Q ?? 0;
  const stageEnergy = Array.isArray(sim.stageEnergy) ? sim.stageEnergy : [];

  const m = useMemo(() => {
    const costHour    = kw * price;
    const costDay     = costHour * 24;
    const costMonth   = costDay * 30;
    const costYear    = costDay * 365;
    const specEnergy  = Q > 0 ? kw * 1000 / Q : 0;       // Wh/m³
    const specCost    = Q > 0 ? (kw / Q) * price : 0;     // €/m³
    const volumeDay   = Q * 24;                           // m³/giorno
    const costSession = kwh * price;
    return { costHour, costDay, costMonth, costYear, specEnergy, specCost, volumeDay, costSession };
  }, [kw, kwh, Q, price]);

  const card  = { background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, boxShadow:t.cardShadow };
  const secHd = { fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15, letterSpacing:2,
    color:t.textSec, textTransform:"uppercase", marginBottom:14, display:"flex", alignItems:"center", gap:6 };

  const totalStageKw = stageEnergy.reduce((a, b) => a + b, 0) || 1;

  const KpiCard = ({ label, value, unit, sub, color }) => (
    <div style={{...card, padding:"18px 20px"}}>
      <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, letterSpacing:2, color:t.textMuted,
        textTransform:"uppercase", marginBottom:8}}>{label}</div>
      <div style={{display:"flex", alignItems:"baseline", gap:6}}>
        <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:34, fontWeight:700, color, lineHeight:1}}>
          {value}
        </span>
        <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:15, color:t.textSec}}>{unit}</span>
      </div>
      <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textMuted, marginTop:6}}>{sub}</div>
    </div>
  );

  return (
    <div style={{padding:"14px 20px", display:"flex", flexDirection:"column", gap:14}}>

      {/* ── TOP BAR: titolo + prezzo energia ── */}
      <div style={{...card, padding:"16px 24px", display:"flex", alignItems:"center", gap:28, flexWrap:"wrap"}}>
        <div>
          <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:18, color:t.accent, letterSpacing:3, fontWeight:700}}>
            GESTIONE ENERGETICA
          </div>
          <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textMuted, letterSpacing:1}}>
            CONSUMI E COSTI IN TEMPO REALE
          </div>
        </div>

        <div style={{height:42, width:1, background:t.border}} />

        {/* prezzo energia */}
        <div style={{flex:1, minWidth:280}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
            <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:14, color:t.textSec, letterSpacing:1}}>
              PREZZO ENERGIA
            </span>
            <div style={{display:"flex", alignItems:"center", gap:6}}>
              <input type="number" step="0.01" min="0" max="1" value={price}
                onChange={e => onPrice(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
                style={{width:80, background:t.surface3, border:`1px solid ${t.accent}66`, borderRadius:6,
                  color:t.accent, padding:"5px 8px", fontFamily:"'Share Tech Mono',monospace", fontSize:16,
                  fontWeight:700, textAlign:"right"}}/>
              <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:t.textSec}}>€/kWh</span>
            </div>
          </div>
          <input type="range" min="0.05" max="0.60" step="0.01" value={price}
            onChange={e => onPrice(parseFloat(e.target.value))}
            style={{width:"100%", accentColor:t.accent, cursor:"pointer"}}/>
          <div style={{display:"flex", gap:6, marginTop:8}}>
            {PRICE_PRESETS.map(p => (
              <button key={p} onClick={() => onPrice(p)}
                style={{flex:1, padding:"4px 0", borderRadius:5, cursor:"pointer",
                  fontFamily:"'Share Tech Mono',monospace", fontSize:12,
                  border:`1px solid ${Math.abs(price-p)<0.005 ? t.accent : t.border}`,
                  background:Math.abs(price-p)<0.005 ? `${t.accent}22` : t.surface2,
                  color:Math.abs(price-p)<0.005 ? t.accent : t.textSec}}>
                {p.toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI PRINCIPALI ── */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14}}>
        <KpiCard label="Potenza attuale"   value={fmtNum(kw,1)}        unit="kW"   sub="Assorbimento totale impianto" color={t.accent} />
        <KpiCard label="Costo orario"      value={fmtEuro(m.costHour)} unit="€/h"  sub="Al prezzo impostato"          color={t.orange} />
        <KpiCard label="Costo giornaliero" value={fmtEuro(m.costDay,0)} unit="€/g"  sub="Stima su carico costante"     color={t.red} />
        <KpiCard label="Costo specifico"   value={fmtEuro(m.specCost,3)} unit="€/m³" sub={`${fmtNum(m.specEnergy,0)} Wh/m³ trattato`} color={t.green} />
      </div>

      {/* ── SESSIONE + PROIEZIONI ── */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>

        {/* SESSIONE CORRENTE */}
        <div style={{...card, padding:"20px 22px"}}>
          <div style={{...secHd}}><span style={{color:t.accent}}>▸</span>SESSIONE CORRENTE</div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14}}>
            <div>
              <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:32, fontWeight:700, color:t.accent, lineHeight:1}}>
                {fmtNum(kwh,1)}
              </div>
              <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:t.textMuted, marginTop:4}}>kWh consumati</div>
            </div>
            <div>
              <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:32, fontWeight:700, color:t.orange, lineHeight:1}}>
                € {fmtEuro(m.costSession)}
              </div>
              <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:t.textMuted, marginTop:4}}>costo sessione</div>
            </div>
          </div>
          <div style={{borderTop:`1px solid ${t.border}`, marginTop:16, paddingTop:14,
            fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted, lineHeight:2}}>
            Tick simulazione: {sim.tick ?? "—"}<br/>
            Portata corrente: {fmtNum(Q,0)} m³/h · Volume giornaliero: {fmtNum(m.volumeDay,0)} m³/g
          </div>
        </div>

        {/* PROIEZIONI */}
        <div style={{...card, padding:"20px 22px"}}>
          <div style={{...secHd}}><span style={{color:t.purple}}>▸</span>PROIEZIONI DI COSTO</div>
          <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:12, color:t.textMuted, marginBottom:14}}>
            Stime a carico costante (potenza attuale × prezzo)
          </div>
          {[
            { label:"Giornaliero",  val:m.costDay,   dec:0, color:t.accent },
            { label:"Mensile (30g)",val:m.costMonth, dec:0, color:t.orange },
            { label:"Annuo (365g)", val:m.costYear,  dec:0, color:t.red },
          ].map(x => (
            <div key={x.label} style={{display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"12px 0", borderBottom:`1px solid ${t.border}`}}>
              <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:16, color:t.textSec}}>{x.label}</span>
              <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:22, fontWeight:700, color:x.color}}>
                € {fmtEuro(x.val, x.dec)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIPARTIZIONE PER STADIO ── */}
      <div style={{...card, padding:"20px 22px"}}>
        <div style={{...secHd}}><span style={{color:t.orange}}>▸</span>RIPARTIZIONE CONSUMI E COSTI PER STADIO</div>
        {stageEnergy.length === 0 ? (
          <div style={{padding:"20px 0", textAlign:"center", color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontSize:15}}>
            Nessun dato di consumo disponibile
          </div>
        ) : (
          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            {stageEnergy.map((skw, i) => {
              const pct  = Math.round(skw / totalStageKw * 100);
              const name = stages[i]?.name ?? `ST-0${i+1}`;
              const cHour = skw * price;
              const cDay  = cHour * 24;
              const barC = pct >= 50 ? t.red : pct >= 25 ? t.orange : t.green;
              return (
                <div key={i}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:5, alignItems:"baseline"}}>
                    <span style={{fontSize:15, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", fontWeight:600}}>
                      <span style={{color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", fontSize:12, marginRight:8}}>
                        ST-{String(i+1).padStart(2,"0")}
                      </span>
                      {name}
                    </span>
                    <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:barC}}>
                      {fmtNum(skw,2)} kW · € {fmtEuro(cHour)}/h · € {fmtEuro(cDay,0)}/g
                    </span>
                  </div>
                  <div style={{height:8, background:t.surface3, borderRadius:4, overflow:"hidden", position:"relative"}}>
                    <div style={{height:"100%", width:`${pct}%`, background:barC, borderRadius:4, transition:"width 0.5s"}}/>
                  </div>
                  <div style={{textAlign:"right", fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:t.textMuted, marginTop:2}}>
                    {pct}% del totale
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
