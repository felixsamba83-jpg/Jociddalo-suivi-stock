import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Plus, Trash2, RefreshCw, Calendar, TrendingUp, Fuel } from 'lucide-react';
import { db } from './firebase';
import { ref, onValue, set } from 'firebase/database';

const STATIONS = ["Nlongkak","Emana","Ekounou","Anguissa","Nsimeyong","Messa","Nkometou","Abong Mbang","Akonolinga","Dimako","Douala","Melen"];
const PRODUCTS = ["Super","Gasoil"];
const DEFAULT_PUMPS = { Super: 3, Gasoil: 2 };

function todayStr(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}

function emptyPump(){
  return { indexOuv:'', indexFerm:'', retourCuve:'', venteHorsPompes:'' };
}

function emptyCuve(){
  return { jaugeOuv:'', jaugeFerm:'' };
}

function makeStationDay(){
  const products = {};
  PRODUCTS.forEach(p=>{
    products[p] = {
      pumps: Array.from({length: DEFAULT_PUMPS[p]}, ()=>emptyPump()),
      cuves: [emptyCuve()],
      commandes:''
    };
  });
  return products;
}

function calcProduct(prod){
  const diffIndexTotal = prod.pumps.reduce((s,p)=> s + ((Number(p.indexFerm)||0) - (Number(p.indexOuv)||0)), 0);
  const retourTotal = prod.pumps.reduce((s,p)=> s + (Number(p.retourCuve)||0), 0);
  const venteHPTotal = prod.pumps.reduce((s,p)=> s + (Number(p.venteHorsPompes)||0), 0);
  const sortiePompe = diffIndexTotal - retourTotal + venteHPTotal;
  const jaugeOuvTotal = prod.cuves.reduce((s,c)=> s + (Number(c.jaugeOuv)||0), 0);
  const jaugeFermTotal = prod.cuves.reduce((s,c)=> s + (Number(c.jaugeFerm)||0), 0);
  const commandes = Number(prod.commandes)||0;
  const cumulStock = jaugeOuvTotal + commandes - sortiePompe;
  const stockTheo = cumulStock;
  const difference = stockTheo - jaugeFermTotal;
  const ecartPct = stockTheo !== 0 ? (difference/stockTheo*100) : 0;
  return { diffIndexTotal, retourTotal, venteHPTotal, sortiePompe, jaugeOuvTotal, jaugeFermTotal, cumulStock, stockTheo, difference, ecartPct,
    hasData: prod.pumps.some(p=>p.indexOuv!=='' || p.indexFerm!=='') || prod.cuves.some(c=>c.jaugeFerm!=='') };
}

const ALERT_THRESHOLD = 0.5;

function fmt(n){
  return Number(n||0).toLocaleString('fr-FR',{maximumFractionDigits:0});
}

// Stockage partagé en temps réel via Firebase Realtime Database
function useSharedStore(){
  const [store, setStore] = useState({}); // { [date]: { [station]: products } }
  const [loaded, setLoaded] = useState(false);

  useEffect(()=>{
    const dataRef = ref(db, 'jociddalo-stock-data');
    const unsubscribe = onValue(dataRef, (snapshot)=>{
      const val = snapshot.val();
      setStore(val || {});
      setLoaded(true);
    }, (error)=>{
      console.error('Firebase read error', error);
      setLoaded(true);
    });
    return () => unsubscribe();
  },[]);

  const save = useCallback(async (newStore)=>{
    setStore(newStore);
    try {
      await set(ref(db, 'jociddalo-stock-data'), newStore);
    } catch(e){ console.error('Firebase write error', e); }
  },[]);

  const reload = useCallback(()=>{ /* onValue already keeps data live; no-op kept for API compatibility */ },[]);

  return { store, save, loaded, reload };
}

function StatusBadge({ecartPct, hasData}){
  if(!hasData) return <span className="text-xs text-slate-400">— en attente</span>;
  const alert = Math.abs(ecartPct) > ALERT_THRESHOLD;
  return alert ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
      <AlertTriangle size={13}/> {ecartPct.toFixed(2)}%
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
      <CheckCircle2 size={13}/> {ecartPct.toFixed(2)}%
    </span>
  );
}

// ============== GERANT VIEW ==============
function GerantView({ store, save, loaded }){
  const [station, setStation] = useState('');
  const [date, setDate] = useState(todayStr());
  const [openProduct, setOpenProduct] = useState('Super');
  const [saved, setSaved] = useState(false);

  if(!loaded) return <div className="p-8 text-center text-slate-500">Chargement…</div>;

  if(!station){
    return (
      <div className="max-w-md mx-auto p-5 pt-10">
        <div className="text-center mb-6">
          <Fuel className="mx-auto mb-2 text-blue-900" size={36}/>
          <h2 className="text-lg font-bold text-blue-900">Sélectionnez votre station</h2>
          <p className="text-sm text-slate-500 mt-1">Saisie du contrôle journalier</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {STATIONS.map(s=>(
            <button key={s} onClick={()=>setStation(s)}
              className="bg-white border border-slate-200 rounded-xl py-3.5 px-2 text-sm font-semibold text-slate-700 shadow-sm active:scale-95 transition hover:border-blue-900 hover:text-blue-900">
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const dayData = store[date] || {};
  const stationData = dayData[station] || makeStationDay();

  function updateProduct(prodName, updater){
    const newProd = updater({...stationData[prodName], pumps: stationData[prodName].pumps.map(p=>({...p}))});
    const newStationData = {...stationData, [prodName]: newProd};
    const newDayData = {...dayData, [station]: newStationData};
    const newStore = {...store, [date]: newDayData};
    save(newStore);
    setSaved(true);
    setTimeout(()=>setSaved(false), 1200);
  }

  function updatePumpField(prodName, pumpIdx, field, value){
    updateProduct(prodName, prod=>{
      const pumps = [...prod.pumps];
      pumps[pumpIdx] = {...pumps[pumpIdx], [field]: value};
      return {...prod, pumps};
    });
  }

  function updateCuveField(prodName, cuveIdx, field, value){
    updateProduct(prodName, prod=>{
      const cuves = prod.cuves.map(c=>({...c}));
      cuves[cuveIdx] = {...cuves[cuveIdx], [field]: value};
      return {...prod, cuves};
    });
  }

  function addCuve(prodName){
    updateProduct(prodName, prod=> ({...prod, cuves:[...prod.cuves.map(c=>({...c})), emptyCuve()]}));
  }

  function removeCuve(prodName, idx){
    updateProduct(prodName, prod=>{
      const cuves = prod.cuves.filter((_,i)=>i!==idx);
      return {...prod, cuves: cuves.length ? cuves : [emptyCuve()]};
    });
  }

  function updateField(prodName, field, value){
    updateProduct(prodName, prod=> ({...prod, [field]: value}));
  }

  function addPump(prodName){
    updateProduct(prodName, prod=> ({...prod, pumps:[...prod.pumps, emptyPump()]}));
  }

  function removePump(prodName, idx){
    updateProduct(prodName, prod=>{
      const pumps = prod.pumps.filter((_,i)=>i!==idx);
      return {...prod, pumps: pumps.length ? pumps : [emptyPump()]};
    });
  }

  return (
    <div className="max-w-md mx-auto pb-10">
      <div className="bg-blue-900 text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div>
          <div className="text-xs opacity-75">Station</div>
          <div className="font-bold text-base">{station}</div>
        </div>
        <button onClick={()=>setStation('')} className="text-xs underline opacity-90">Changer</button>
      </div>

      <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-sm text-slate-600">
        <Calendar size={15}/>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          className="border border-slate-200 rounded-md px-2 py-1 text-sm"/>
        {saved && <span className="text-emerald-600 text-xs font-medium ml-auto">✓ Enregistré</span>}
      </div>

      <div className="px-3 pt-3 space-y-3">
        {PRODUCTS.map(prodName=>{
          const prod = stationData[prodName];
          const c = calcProduct(prod);
          const isOpen = openProduct === prodName;
          return (
            <div key={prodName} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button onClick={()=>setOpenProduct(isOpen ? '' : prodName)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-900">{prodName}</span>
                  <StatusBadge ecartPct={c.ecartPct} hasData={c.hasData}/>
                </div>
                {isOpen ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
              </button>

              {isOpen && (
                <div className="p-4 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pompes ({prod.pumps.length})</span>
                      <button onClick={()=>addPump(prodName)} className="text-xs text-blue-900 font-semibold flex items-center gap-1">
                        <Plus size={14}/> Ajouter
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {prod.pumps.map((pump, idx)=>(
                        <div key={idx} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-600">{prodName} {idx+1}</span>
                            {prod.pumps.length > 1 && (
                              <button onClick={()=>removePump(prodName, idx)} className="text-red-400">
                                <Trash2 size={13}/>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Index Ouverture" value={pump.indexOuv} onChange={v=>updatePumpField(prodName,idx,'indexOuv',v)}/>
                            <Field label="Index Fermeture" value={pump.indexFerm} onChange={v=>updatePumpField(prodName,idx,'indexFerm',v)}/>
                            <Field label="Retour en cuve" value={pump.retourCuve} onChange={v=>updatePumpField(prodName,idx,'retourCuve',v)}/>
                            <Field label="Vente Hors Pompe" value={pump.venteHorsPompes} onChange={v=>updatePumpField(prodName,idx,'venteHorsPompes',v)}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cuves ({prod.cuves.length})</span>
                      <button onClick={()=>addCuve(prodName)} className="text-xs text-blue-900 font-semibold flex items-center gap-1">
                        <Plus size={14}/> Ajouter
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {prod.cuves.map((cuve, idx)=>(
                        <div key={idx} className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-600">Cuve {prodName} {idx+1}</span>
                            {prod.cuves.length > 1 && (
                              <button onClick={()=>removeCuve(prodName, idx)} className="text-red-400">
                                <Trash2 size={13}/>
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Field label="Jauge Ouverture" value={cuve.jaugeOuv} onChange={v=>updateCuveField(prodName,idx,'jaugeOuv',v)}/>
                            <Field label="Jauge Fermeture" value={cuve.jaugeFerm} onChange={v=>updateCuveField(prodName,idx,'jaugeFerm',v)}/>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5">
                      <Field label="Commandes du Jour" value={prod.commandes} onChange={v=>updateField(prodName,'commandes',v)}/>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
                    <SummaryItem label="Sortie Pompe" value={fmt(c.sortiePompe)}/>
                    <SummaryItem label="Stock Théorique" value={fmt(c.stockTheo)}/>
                    <SummaryItem label="Différence" value={fmt(c.difference)} alert={Math.abs(c.ecartPct)>ALERT_THRESHOLD}/>
                    <SummaryItem label="Écart %" value={c.ecartPct.toFixed(2)+'%'} alert={Math.abs(c.ecartPct)>ALERT_THRESHOLD}/>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({label, value, onChange}){
  return (
    <label className="block">
      <span className="text-[10px] text-slate-500 block mb-0.5">{label}</span>
      <input type="number" inputMode="decimal" value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder="0"
        className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"/>
    </label>
  );
}

function SummaryItem({label, value, alert}){
  return (
    <div>
      <div className="text-[10px] text-slate-500">{label}</div>
      <div className={`font-bold ${alert ? 'text-red-600' : 'text-blue-900'}`}>{value}</div>
    </div>
  );
}

// ============== CONTROLEUR VIEW ==============
function ControleurView({ store, loaded, reload }){
  const [date, setDate] = useState(todayStr());
  const dayData = store[date] || {};

  const rows = STATIONS.map(st=>{
    const stationData = dayData[st] || makeStationDay();
    const calcs = {};
    PRODUCTS.forEach(p=> calcs[p] = calcProduct(stationData[p]));
    return { station: st, calcs };
  });

  const totalAlerts = rows.reduce((sum,r)=> sum + PRODUCTS.filter(p=> r.calcs[p].hasData && Math.abs(r.calcs[p].ecartPct) > ALERT_THRESHOLD).length, 0);
  const reportingCount = rows.filter(r=> PRODUCTS.some(p=>r.calcs[p].hasData)).length;
  const totalVenteSuper = rows.reduce((s,r)=> s + r.calcs.Super.sortiePompe, 0);
  const totalVenteGasoil = rows.reduce((s,r)=> s + r.calcs.Gasoil.sortiePompe, 0);

  // Historique (last 7 days incl today)
  const historyDates = Object.keys(store).sort().slice(-7);

  if(!loaded) return <div className="p-8 text-center text-slate-500">Chargement…</div>;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="bg-blue-900 text-white px-4 py-3.5 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <div className="text-xs opacity-75">Tableau de bord</div>
          <div className="font-bold text-base">Contrôleur — Réseau Jociddalo</div>
        </div>
        <button onClick={reload} className="opacity-90"><RefreshCw size={18}/></button>
      </div>

      <div className="px-4 pt-3 flex items-center gap-2 text-sm text-slate-600">
        <Calendar size={15}/>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)}
          className="border border-slate-200 rounded-md px-2 py-1 text-sm"/>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4 pt-3">
        <KPI label="Stations rapportées" value={`${reportingCount}/${STATIONS.length}`}/>
        <KPI label="Alertes actives" value={totalAlerts} alert={totalAlerts>0}/>
        <KPI label="Vente Super (L)" value={fmt(totalVenteSuper)}/>
        <KPI label="Vente Gasoil (L)" value={fmt(totalVenteGasoil)}/>
      </div>

      <div className="px-4 pt-5">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2">Détail par station</h3>
        <div className="space-y-2">
          {rows.map(r=>{
            const anyAlert = PRODUCTS.some(p=> r.calcs[p].hasData && Math.abs(r.calcs[p].ecartPct) > ALERT_THRESHOLD);
            const anyData = PRODUCTS.some(p=> r.calcs[p].hasData);
            return (
              <div key={r.station} className={`bg-white rounded-xl border p-3 shadow-sm ${anyAlert ? 'border-red-300' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-blue-900">{r.station}</span>
                  {!anyData ? (
                    <span className="text-xs text-slate-400">en attente</span>
                  ) : anyAlert ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><AlertTriangle size={12}/>Alerte</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={12}/>OK</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {PRODUCTS.map(p=>{
                    const c = r.calcs[p];
                    return (
                      <div key={p} className="border-l-2 border-slate-100 pl-2">
                        <div className="font-semibold text-slate-600">{p}</div>
                        {c.hasData ? (
                          <>
                            <div className="text-slate-500">Vente: <span className="font-medium text-slate-800">{fmt(c.sortiePompe)} L</span></div>
                            <div className="text-slate-500">Écart: <StatusBadge ecartPct={c.ecartPct} hasData={c.hasData}/></div>
                          </>
                        ) : <div className="text-slate-400">—</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-6">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <TrendingUp size={15}/> Historique (7 derniers jours actifs)
        </h3>
        {historyDates.length === 0 ? (
          <p className="text-xs text-slate-400">Aucune donnée enregistrée pour le moment.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="px-2 py-2">Stations</th>
                  <th className="px-2 py-2">Super (L)</th>
                  <th className="px-2 py-2">Gasoil (L)</th>
                  <th className="px-2 py-2">Alertes</th>
                </tr>
              </thead>
              <tbody>
                {historyDates.slice().reverse().map(d=>{
                  const dd = store[d] || {};
                  let s=0,g=0,al=0,rep=0;
                  STATIONS.forEach(st=>{
                    const sd = dd[st];
                    if(!sd) return;
                    const cs = calcProduct(sd.Super);
                    const cg = calcProduct(sd.Gasoil);
                    if(cs.hasData || cg.hasData) rep++;
                    s += cs.sortiePompe; g += cg.sortiePompe;
                    if(cs.hasData && Math.abs(cs.ecartPct)>ALERT_THRESHOLD) al++;
                    if(cg.hasData && Math.abs(cg.ecartPct)>ALERT_THRESHOLD) al++;
                  });
                  return (
                    <tr key={d} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">{d}</td>
                      <td className="text-center py-2">{rep}/{STATIONS.length}</td>
                      <td className="text-center py-2">{fmt(s)}</td>
                      <td className="text-center py-2">{fmt(g)}</td>
                      <td className="text-center py-2">{al > 0 ? <span className="text-red-600 font-semibold">{al}</span> : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({label, value, alert}){
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
      <div className="text-[10px] text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-bold ${alert ? 'text-red-600' : 'text-blue-900'}`}>{value}</div>
    </div>
  );
}

// ============== ROOT ==============
const CONTROLEUR_CODE = "JOCID2026";

export default function App(){
  const [mode, setMode] = useState(null); // 'gerant' | 'controleur'
  const [controleurUnlocked, setControleurUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);
  const { store, save, loaded, reload } = useSharedStore();

  if(!mode){
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-7 text-center">
          <Fuel className="mx-auto mb-3 text-blue-900" size={40}/>
          <h1 className="text-lg font-bold text-blue-900 mb-1">Jociddalo Petroleum</h1>
          <p className="text-sm text-slate-500 mb-6">Suivi de Stock Journalier — Réseau</p>
          <div className="space-y-3">
            <button onClick={()=>setMode('gerant')}
              className="w-full bg-blue-900 text-white font-semibold py-3 rounded-xl active:scale-95 transition">
              📋 Je suis Gérant — Saisir mon contrôle
            </button>
            <button onClick={()=>setMode('controleur')}
              className="w-full bg-white border-2 border-blue-900 text-blue-900 font-semibold py-3 rounded-xl active:scale-95 transition">
              📊 Je suis Contrôleur — Voir le réseau
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-5">Les données sont partagées en temps réel entre tous les appareils.</p>
        </div>
      </div>
    );
  }

  if(mode === 'controleur' && !controleurUnlocked){
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-7 text-center">
          <Fuel className="mx-auto mb-3 text-blue-900" size={36}/>
          <h2 className="text-base font-bold text-blue-900 mb-1">Accès Contrôleur</h2>
          <p className="text-xs text-slate-500 mb-5">Cette page est réservée. Entrez le code d'accès.</p>
          <input
            type="password"
            value={codeInput}
            onChange={e=>{ setCodeInput(e.target.value); setCodeError(false); }}
            onKeyDown={e=>{
              if(e.key === 'Enter'){
                if(codeInput === CONTROLEUR_CODE) setControleurUnlocked(true);
                else setCodeError(true);
              }
            }}
            placeholder="Code d'accès"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-center tracking-widest text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
          {codeError && <p className="text-xs text-red-600 mb-2">Code incorrect.</p>}
          <button
            onClick={()=>{
              if(codeInput === CONTROLEUR_CODE) setControleurUnlocked(true);
              else setCodeError(true);
            }}
            className="w-full bg-blue-900 text-white font-semibold py-2.5 rounded-xl active:scale-95 transition mb-3"
          >
            Valider
          </button>
          <button onClick={()=>{ setMode(null); setCodeInput(''); setCodeError(false); }} className="text-xs text-slate-400 underline">
            ← Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-slate-200 px-3 py-1.5 flex justify-end">
        <button onClick={()=>{ setMode(null); setControleurUnlocked(false); }} className="text-xs text-slate-500 underline">← Retour à l'accueil</button>
      </div>
      {mode === 'gerant'
        ? <GerantView store={store} save={save} loaded={loaded}/>
        : <ControleurView store={store} loaded={loaded} reload={reload}/>}
    </div>
  );
}