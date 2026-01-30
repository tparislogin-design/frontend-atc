import { useState, useEffect } from 'react';
import axios from 'axios';

// Composants
import PlanningTable from './PlanningTable';
import Bilan from './Bilan';

// Utils
import { parseGoogleSheet } from './utils/sheetParser';
import { convertPreAssignmentsToRows } from './utils/dataConverters';
import { decimalToTime, timeToDecimal } from './utils/timeConverters';

// Import de TYPE
import type { AppConfig } from './utils/types';

const API_URL = "https://ttttty-ty.hf.space/api/optimize"; 

const DEFAULT_CONFIG: AppConfig = {
  ANNEE: 2026,
  CONTROLEURS: ["GAO", "WBR", "PLC", "CML", "BBD", "LAK", "MZN", "TRT", "CLO", "LNN", "KGR", "FRD", "DAZ", "GNC", "DTY", "JCT"],
  CONTROLLERS_AFFECTES_BUREAU: [],
  VACATIONS: { 
    "M":  { debut: 5.5, fin: 12.75 },
    "J1": { debut: 7.5, fin: 15.5 },
    "J2": { debut: 8.0, fin: 16.0 },
    "S":  { debut: 16.75, fin: 23.5 },
    "A1": { debut: 13.0, fin: 22.0 },
    "A2": { debut: 15.0, fin: 23.0 }
  },
  CONTRAT: { 
    MIN_REST_HOURS: 11,
    MAX_CONSECUTIVE_SHIFTS: 4, 
    MAX_HOURS_WEEK_CALENDAR: 32,
    MAX_HOURS_7_ROLLING: 44,
    MAX_BACKTRACKS: 10,
    SOLVER_TIME_LIMIT: 25
  }
};

const TimeInput = ({ val, onSave }: { val: number, onSave: (v: number) => void }) => {
    const [displayVal, setDisplayVal] = useState(decimalToTime(val));
    useEffect(() => { setDisplayVal(decimalToTime(val)); }, [val]);
    const handleBlur = () => { onSave(timeToDecimal(displayVal)); setDisplayVal(decimalToTime(timeToDecimal(displayVal))); };
    return ( <input type="text" value={displayVal} onChange={(e) => setDisplayVal(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => { if(e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} style={{ width: 50, fontSize: 12, textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: 4, padding: '4px', fontWeight: '600', color: '#1e293b', fontFamily:'monospace' }} /> );
};

function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [year, setYear] = useState(2026);
  const [startDay, setStartDay] = useState(1); 
  const [endDay, setEndDay] = useState(28);
  const [sheetUrl, setSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1lLtFisk983kJ-Yu0rtPyJAoweHxnsKwzen_J1rxsJes/edit");
  
  const [preAssignments, setPreAssignments] = useState<any>({});
  const [planning, setPlanning] = useState<any[]>([]);
  
  const [softConstraints, setSoftConstraints] = useState<Set<string>>(new Set());
  const [hideOff, setHideOff] = useState(false);
  // NOUVEL ÉTAT : Couverture Optionnelle { "1": ["M", "S"] }
  const [optionalCoverage, setOptionalCoverage] = useState<Record<string, string[]>>({});

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: string, msg: string}>({type:'', msg:''});
  const [activeTab, setActiveTab] = useState<'planning' | 'desiderata' | 'bilan' | 'config'>('planning');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showDesiderataMatch, setShowDesiderataMatch] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('tds_config');
    if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        if (parsed.ANNEE) setYear(parsed.ANNEE);
    }
  }, []);

  const updateConfig = (newConfig: AppConfig) => { setConfig(newConfig); localStorage.setItem('tds_config', JSON.stringify(newConfig)); };
  const handleYearChange = (val: string) => { setYear(parseInt(val) || 2026); updateConfig({ ...config, ANNEE: parseInt(val) || 2026 }); };
  const handleContratChange = (field: keyof typeof config.CONTRAT, val: string) => { updateConfig({ ...config, CONTRAT: { ...config.CONTRAT, [field]: parseInt(val) || 0 } }); };
  
  const handleAddVacation = () => {
      const code = window.prompt("Code ?")?.toUpperCase().trim();
      if (!code || config.VACATIONS[code]) return;
      updateConfig({ ...config, VACATIONS: { ...config.VACATIONS, [code]: { debut: 8.0, fin: 17.0 } } });
  };
  const handleDeleteVacation = (code: string) => {
      if (!window.confirm("Supprimer ?")) return;
      const v = { ...config.VACATIONS }; delete v[code];
      updateConfig({ ...config, VACATIONS: v });
  };
  const handleChangeVacation = (code: string, f: string, v: number) => {
      updateConfig({ ...config, VACATIONS: { ...config.VACATIONS, [code]: { ...config.VACATIONS[code], [f]: v } } });
  };

  const handleAddBureau = () => {
      const agent = window.prompt("Agent Bureau ?")?.toUpperCase().trim();
      if (!agent) return;
      const list = config.CONTROLLERS_AFFECTES_BUREAU || [];
      if (!list.includes(agent)) updateConfig({ ...config, CONTROLLERS_AFFECTES_BUREAU: [...list, agent] });
  };
  const handleRemoveBureau = (agent: string) => {
      updateConfig({ ...config, CONTROLLERS_AFFECTES_BUREAU: (config.CONTROLLERS_AFFECTES_BUREAU || []).filter(a => a !== agent) });
  };

  const handleExportConfig = () => {
      const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
      const a = document.createElement('a'); a.href = data; a.download = `tds_config_${year}.json`; a.click();
  };
  const handleImportConfig = (e: any) => {
      const fr = new FileReader();
      fr.onload = (ev) => {
          try {
              const c = JSON.parse(ev.target?.result as string);
              if (c.VACATIONS) { setConfig(c); if(c.ANNEE) setYear(c.ANNEE); alert("OK"); }
          } catch(err) { alert("Erreur fichier"); }
      };
      if (e.target.files[0]) fr.readAsText(e.target.files[0]);
  };

  // --- TOGGLES ---
  const handleToggleSoft = (agent: string, day: number) => {
      const key = `${agent}_${day}`;
      const s = new Set(softConstraints);
      if (s.has(key)) s.delete(key); else s.add(key);
      setSoftConstraints(s);
  };
  const handleToggleAllSoft = () => {
      const all = new Set<string>();
      let count = 0;
      Object.entries(preAssignments).forEach(([a, days]: [string, any]) => {
          Object.keys(days).forEach(d => { if (days[d]) { all.add(`${a}_${d}`); count++; } });
      });
      if (count === 0) return alert("Rien à cercler");
      setSoftConstraints(softConstraints.size === count ? new Set() : all);
  };

  // --- NOUVEAU : TOGGLE OPTIONAL COVERAGE ---
  const handleToggleOptionalCoverage = (dayNum: number, shiftCode: string) => {
      const dayStr = dayNum.toString();
      const current = optionalCoverage[dayStr] || [];
      let next;
      if (current.includes(shiftCode)) next = current.filter(s => s !== shiftCode);
      else next = [...current, shiftCode];
      setOptionalCoverage({ ...optionalCoverage, [dayStr]: next });
  };

  const handleImport = async () => {
      setStatus({type:'loading', msg:'Lecture...'});
      try {
          const data = await parseGoogleSheet(sheetUrl, startDay, endDay);
          setPreAssignments(data); setSoftConstraints(new Set());
          setStatus({type:'success', msg: `OK (${Object.keys(data).length} agents)`});
          setActiveTab('desiderata');
      } catch (e: any) { setStatus({type:'error', msg: e.toString()}); }
  };

  const handleOptimize = async () => {
      setLoading(true); setStatus({type:'loading', msg:'Calcul...'});
      try {
          const res = await axios.post(API_URL, {
              year, start_day: startDay, end_day: endDay, config,
              pre_assignments: preAssignments,
              soft_assignments: Array.from(softConstraints),
              optional_coverage: optionalCoverage // Transmission
          });
          if (res.data.data) { setPlanning(res.data.data); setStatus({type:'success', msg:'Généré !'}); setActiveTab('planning'); }
          else setStatus({type:'error', msg:'Infeasible'});
      } catch(e) { setStatus({type:'error', msg:'Erreur API'}); }
      finally { setLoading(false); }
  };

  const gridData = activeTab === 'desiderata' ? convertPreAssignmentsToRows(preAssignments) : planning;

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: 'sans-serif'}}>
        <header style={{height: 60, background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between'}}>
            <div style={{display:'flex', gap:10, alignItems:'center'}}><span style={{fontSize:20}}>✈️</span> <span style={{fontWeight:'bold'}}>TDS Manager</span></div>
            <div style={{display:'flex', gap:5}}>
                {['Planning', 'Desiderata', 'Bilan', 'Config'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t.toLowerCase() as any)} style={{padding:'6px 12px', borderRadius:6, border:'none', background: activeTab===t.toLowerCase()?'#eff6ff':'transparent', color: activeTab===t.toLowerCase()?'#2563eb':'#64748b', cursor:'pointer', fontWeight:'bold'}}>{t}</button>
                ))}
            </div>
            <div style={{display:'flex', gap:10, alignItems:'center'}}>
                {activeTab === 'planning' && (
                    <>
                        <button onClick={() => setShowDesiderataMatch(!showDesiderataMatch)} style={{background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', padding:'6px', borderRadius:6, cursor:'pointer'}}>👁️ Demandes</button>
                        <button onClick={() => setHideOff(!hideOff)} style={{background:'#f1f5f9', color:'#475569', border:'1px solid #cbd5e1', padding:'6px', borderRadius:6, cursor:'pointer'}}>{hideOff ? 'Afficher OFF' : 'Masquer OFF'}</button>
                    </>
                )}
                {activeTab === 'desiderata' && (
                    <button onClick={handleToggleAllSoft} style={{background:'#f3e8ff', color:'#9333ea', border:'1px solid #d8b4fe', padding:'6px', borderRadius:6, cursor:'pointer'}}>🟣 Tout Soft</button>
                )}
                <input type="range" min="50" max="150" value={zoomLevel} onChange={e => setZoomLevel(Number(e.target.value))} style={{width:80}} />
                <button onClick={handleOptimize} disabled={loading} style={{background:'#2563eb', color:'white', border:'none', padding:'8px 16px', borderRadius:6, cursor:'pointer'}}>{loading ? '...' : '⚡ Générer'}</button>
                <button onClick={() => setShowSidebar(!showSidebar)} style={{background:'white', border:'1px solid #cbd5e1', padding:'8px', borderRadius:6, cursor:'pointer'}}>⚙️</button>
            </div>
        </header>

        <div style={{flex:1, display:'flex', overflow:'hidden'}}>
            <div style={{flex:1, display:'flex', flexDirection:'column'}}>
                {status.msg && <div style={{padding:10, background: status.type==='error'?'#fee2e2':'#dcfce7', color: status.type==='error'?'#b91c1c':'#15803d'}}>{status.msg}</div>}
                <div style={{flex:1, background:'white'}}>
                    {(activeTab === 'planning' || activeTab === 'desiderata') && (
                        <PlanningTable 
                            data={gridData} year={year} startDay={startDay} endDay={endDay} config={config}
                            isDesiderataView={activeTab === 'desiderata'} preAssignments={preAssignments}
                            showDesiderataMatch={activeTab === 'planning' ? showDesiderataMatch : false}
                            softConstraints={softConstraints} onToggleSoft={handleToggleSoft}
                            zoomLevel={zoomLevel} hideOff={hideOff}
                            optionalCoverage={optionalCoverage} onToggleOptionalCoverage={handleToggleOptionalCoverage}
                        />
                    )}
                    {activeTab === 'bilan' && <Bilan planning={planning} config={config} year={year} startDay={startDay} endDay={endDay} />}
                    {activeTab === 'config' && <div style={{padding:50, textAlign:'center', color:'#94a3b8'}}>Configuration à droite 👉</div>}
                </div>
            </div>

            {showSidebar && (
                <div style={{width:320, background:'white', borderLeft:'1px solid #e2e8f0', padding:20, overflowY:'auto'}}>
                    <h3 style={{fontSize:12, color:'#94a3b8', textTransform:'uppercase'}}>Sauvegarde</h3>
                    <div style={{display:'flex', gap:5, marginBottom:20}}>
                        <button onClick={handleExportConfig} style={{flex:1, padding:8, background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius:4, cursor:'pointer'}}>⬇️ JSON</button>
                        <label style={{flex:1, padding:8, background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius:4, cursor:'pointer', textAlign:'center'}}>⬆️ Load<input type="file" onChange={handleImportConfig} style={{display:'none'}}/></label>
                    </div>

                    <h3 style={{fontSize:12, color:'#94a3b8', textTransform:'uppercase'}}>Données</h3>
                    <input type="text" value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)} style={{width:'100%', padding:6, border:'1px solid #cbd5e1', borderRadius:4, marginBottom:5}} />
                    <button onClick={handleImport} style={{width:'100%', padding:8, background:'#22c55e', color:'white', border:'none', borderRadius:4, cursor:'pointer', marginBottom:20}}>Importer</button>

                    <h3 style={{fontSize:12, color:'#94a3b8', textTransform:'uppercase'}}>Paramètres</h3>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20}}>
                        <label>Année <input type="number" value={year} onChange={e=>handleYearChange(e.target.value)} style={{width:'100%'}} /></label>
                        <label>Début <input type="number" value={startDay} onChange={e=>setStartDay(Number(e.target.value))} style={{width:'100%'}} /></label>
                        <label>Fin <input type="number" value={endDay} onChange={e=>setEndDay(Number(e.target.value))} style={{width:'100%'}} /></label>
                        <label>Time <input type="number" value={config.CONTRAT.SOLVER_TIME_LIMIT} onChange={e=>handleContratChange('SOLVER_TIME_LIMIT', e.target.value)} style={{width:'100%'}} /></label>
                    </div>

                    <h3 style={{fontSize:12, color:'#2563eb', textTransform:'uppercase'}}>Bureau</h3>
                    <div style={{display:'flex', flexWrap:'wrap', gap:5, marginBottom:20}}>
                        <button onClick={handleAddBureau} style={{fontSize:10, padding:'2px 6px'}}>+ Ajout</button>
                        {config.CONTROLLERS_AFFECTES_BUREAU?.map(a => <span key={a} onClick={()=>handleRemoveBureau(a)} style={{background:'#eff6ff', padding:'2px 6px', borderRadius:4, fontSize:11, cursor:'pointer'}}>{a} ×</span>)}
                    </div>

                    <h3 style={{fontSize:12, color:'#10b981', textTransform:'uppercase'}}>Vacations</h3>
                    <button onClick={handleAddVacation} style={{fontSize:10, padding:'2px 6px', marginBottom:5}}>+ Ajout</button>
                    {Object.entries(config.VACATIONS).map(([k,v]:any) => (
                        <div key={k} style={{display:'flex', alignItems:'center', gap:5, marginBottom:5}}>
                            <span style={{width:30, fontWeight:'bold', fontSize:11}}>{k}</span>
                            <TimeInput val={v.debut} onSave={val=>handleChangeVacation(k,'debut',val)} />
                            <span style={{fontSize:10}}>➜</span>
                            <TimeInput val={v.fin} onSave={val=>handleChangeVacation(k,'fin',val)} />
                            <span onClick={()=>handleDeleteVacation(k)} style={{color:'red', cursor:'pointer'}}>×</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}

export default App;