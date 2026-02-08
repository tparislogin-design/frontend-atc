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

// ==========================================
// 1. STYLES & CONSTANTES (Définis en PREMIER)
// ==========================================

const sidebarSectionStyle: React.CSSProperties = { padding: 20, borderBottom: '1px solid #f1f5f9' };
const sidebarTitleStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, marginBottom: 12, marginTop: 0, textTransform: 'uppercase' };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#475569', fontWeight: 500 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, marginTop: 4, boxSizing: 'border-box' };
const secondaryButtonStyle: React.CSSProperties = { width: '100%', background: '#22c55e', color: 'white', border: 'none', padding: '8px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 };
const numberInputStyle: React.CSSProperties = { width: 50, padding: '4px 8px', textAlign: 'right', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, fontWeight: 600, color: '#334155' };

const selectStyle: React.CSSProperties = { padding: 6, borderRadius: 4, border: '1px solid #cbd5e1', fontSize: 12 };
const addButtonStyle = (col: string, bg: string, bord: string): React.CSSProperties => ({ fontSize: 11, padding: '4px 12px', background: bg, color: col, border: `1px solid ${bord}`, borderRadius: 4, cursor: 'pointer', fontWeight: 600 });
const tagStyle = (col: string, bg: string, bord: string): React.CSSProperties => ({ display: 'flex', alignItems: 'center', background: bg, border: `1px solid ${bord}`, borderRadius: 6, padding: '4px 8px', fontSize: 12, color: col, fontWeight: 600 });

const DEFAULT_CONFIG: AppConfig = {
  ANNEE: 2026,
  CONTROLEURS: ["GAO", "WBR", "PLC", "CML", "BBD", "LAK", "MZN", "TRT", "CLO", "LNN", "KGR", "FRD", "DAZ", "GNC", "DTY", "JCT"],
  CONTROLLERS_AFFECTES_BUREAU: [],
  CONTROLLERS_PARITE_STRICTE: [], // Initialisation vide
  VACATIONS: { 
    "M":  { debut: 5.5, fin: 12.75 },
    "J1": { debut: 7.5, fin: 15.5 },
    "J2": { debut: 8.0, fin: 16.0 },
    "S":  { debut: 16.75, fin: 23.5 },
    "A1": { debut: 13.0, fin: 22.0 },
    "A2": { debut: 15.0, fin: 23.0 }
  },
  CYCLES: {}, 
  CONTRAT: { 
    MIN_REST_HOURS: 11,
    MAX_CONSECUTIVE_SHIFTS: 4, 
    MAX_HOURS_WEEK_CALENDAR: 32,
    MAX_HOURS_7_ROLLING: 44,
    MAX_BACKTRACKS: 10,
    SOLVER_TIME_LIMIT: 25
  }
};

// --- COMPOSANT INTERNE : TIME INPUT ---
const TimeInput = ({ val, onSave }: { val: number, onSave: (v: number) => void }) => {
    const [displayVal, setDisplayVal] = useState(decimalToTime(val));
    useEffect(() => { setDisplayVal(decimalToTime(val)); }, [val]);
    const handleBlur = () => { onSave(timeToDecimal(displayVal)); setDisplayVal(decimalToTime(timeToDecimal(displayVal))); };
    return ( <input type="text" value={displayVal} onChange={(e) => setDisplayVal(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => { if(e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} style={{ width: 50, fontSize: 12, textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: 4, padding: '4px', fontWeight: '600', color: '#1e293b', fontFamily:'monospace' }} /> );
};

// ==========================================
// 2. COMPOSANT PRINCIPAL APP
// ==========================================

function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  
  // États App
  const [year, setYear] = useState(2026);
  const [startDay, setStartDay] = useState(1); 
  const [endDay, setEndDay] = useState(28);
  const [sheetUrl, setSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1lLtFisk983kJ-Yu0rtPyJAoweHxnsKwzen_J1rxsJes/edit");
  
  const [preAssignments, setPreAssignments] = useState<any>({});
  const [planning, setPlanning] = useState<any[]>([]);
  
  const [softConstraints, setSoftConstraints] = useState<Set<string>>(new Set());
  const [hideOff, setHideOff] = useState(true);
  const [optionalCoverage, setOptionalCoverage] = useState<Record<string, string[]>>({});

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: string, msg: string}>({type:'', msg:''});
  const [activeTab, setActiveTab] = useState<'planning' | 'desiderata' | 'bilan' | 'config'>('planning');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showDesiderataMatch, setShowDesiderataMatch] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // États Onglet Config (Cycles)
  const [selectedAgentConfig, setSelectedAgentConfig] = useState<string>("");
  const [newCycleOr1, setNewCycleOr1] = useState("");
  const [newCycleOr2, setNewCycleOr2] = useState("");
  const [newCycleAg1, setNewCycleAg1] = useState("");
  const [newCycleAg2, setNewCycleAg2] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem('tds_config');
    if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        if (parsed.ANNEE) setYear(parsed.ANNEE);
    }
  }, []);

  // --- CONFIG HELPERS ---
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
      // @ts-ignore
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

  // --- GESTION CYCLES ---
  const handleAddCycle = (type: 'OR' | 'ARGENT') => {
      if (!selectedAgentConfig) return;
      const v1 = type === 'OR' ? newCycleOr1 : newCycleAg1;
      const v2 = type === 'OR' ? newCycleOr2 : newCycleAg2;
      
      if (!v1 || !v2) return alert("Sélectionnez 2 vacations");

      const currentCycles = config.CYCLES || {};
      const agentCycles = currentCycles[selectedAgentConfig] || { OR: [], ARGENT: [] };
      const list = agentCycles[type] || [];
      
      const exists = list.some((pair: string[]) => pair[0] === v1 && pair[1] === v2);
      if (exists) return;

      const newAgentCycles = { ...agentCycles, [type]: [...list, [v1, v2]] };
      const newCycles = { ...currentCycles, [selectedAgentConfig]: newAgentCycles };
      
      updateConfig({ ...config, CYCLES: newCycles });
  };

  const handleDeleteCycle = (type: 'OR' | 'ARGENT', idx: number) => {
      if (!selectedAgentConfig) return;
      const currentCycles = config.CYCLES || {};
      const agentCycles = currentCycles[selectedAgentConfig];
      if (!agentCycles) return;

      const list = [...(agentCycles[type] || [])];
      list.splice(idx, 1);

      const newAgentCycles = { ...agentCycles, [type]: list };
      updateConfig({ ...config, CYCLES: { ...currentCycles, [selectedAgentConfig]: newAgentCycles } });
  };

  // --- NOUVEAU : HANDLER PARITÉ ---
  const handleToggleParity = () => {
      if (!selectedAgentConfig) return;
      const currentList = config.CONTROLLERS_PARITE_STRICTE || [];
      let newList;
      if (currentList.includes(selectedAgentConfig)) {
          newList = currentList.filter(a => a !== selectedAgentConfig);
      } else {
          newList = [...currentList, selectedAgentConfig];
      }
      updateConfig({ ...config, CONTROLLERS_PARITE_STRICTE: newList });
  };

  // --- AUTRES HANDLERS (Export/Import/Misc) ---
  const handleExportConfig = () => {
      const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
      const a = document.createElement('a'); a.href = data; a.download = `tds_config_${year}.json`; a.click();
  };
  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileReader = new FileReader();
      if (event.target.files && event.target.files[0]) {
          fileReader.readAsText(event.target.files[0], "UTF-8");
          fileReader.onload = (e) => {
              try {
                  if (e.target?.result) {
                      const importedConfig = JSON.parse(e.target.result as string);
                      if (importedConfig.VACATIONS) {
                          setConfig(importedConfig);
                          if (importedConfig.ANNEE) setYear(importedConfig.ANNEE);
                          alert("Configuration chargée avec succès !");
                      } else {
                          alert("Erreur : Fichier invalide.");
                      }
                  }
              } catch (err) {
                  alert("Erreur de lecture du fichier.");
              }
          };
      }
  };

  const handleToggleSoft = (agent: string, day: number) => {
      const key = `${agent}_${day}`;
      const s = new Set(softConstraints);
      if (s.has(key)) s.delete(key); else s.add(key);
      setSoftConstraints(s);
  };
  const handleToggleAllSoft = () => {
      const allKeys = new Set<string>();
      let count = 0;
      Object.entries(preAssignments).forEach(([a, days]: [string, any]) => {
          Object.keys(days).forEach(d => { if (days[d]) { allKeys.add(`${a}_${d}`); count++; } });
      });
      if (count === 0) return alert("Rien à cercler");
      setSoftConstraints(softConstraints.size === count ? new Set() : allKeys);
  };
  const handleToggleOptionalCoverage = (dayNum: number, shiftCode: string) => {
      const dayStr = dayNum.toString();
      const current = optionalCoverage[dayStr] || [];
      let next;
      if (current.includes(shiftCode)) next = current.filter(s => s !== shiftCode);
      else next = [...current, shiftCode];
      setOptionalCoverage({ ...optionalCoverage, [dayStr]: next });
  };
  const handleToggleGlobalOptional = (shiftCode: string) => {
      const daysList = [];
      if (startDay <= endDay) { for (let i = startDay; i <= endDay; i++) daysList.push(i.toString()); }
      else { for (let i = startDay; i <= 365; i++) daysList.push(i.toString()); for (let i = 1; i <= endDay; i++) daysList.push(i.toString()); }
      
      const isAlreadyOptionalEverywhere = daysList.every(dayStr => {
          return optionalCoverage[dayStr] && optionalCoverage[dayStr].includes(shiftCode);
      });
      const newCoverage = { ...optionalCoverage };
      daysList.forEach(dayStr => {
          const currentList = newCoverage[dayStr] || [];
          if (isAlreadyOptionalEverywhere) newCoverage[dayStr] = currentList.filter(s => s !== shiftCode);
          else if (!currentList.includes(shiftCode)) newCoverage[dayStr] = [...currentList, shiftCode];
      });
      setOptionalCoverage(newCoverage);
  };

  // --- API HANDLERS (AVEC HANDLE IMPORT RESTAURÉ) ---
  const handleImport = async () => {
    setStatus({type:'loading', msg:'📡 Lecture...'});
    try {
        const data = await parseGoogleSheet(sheetUrl, startDay, endDay); 
        setPreAssignments(data);
        setSoftConstraints(new Set()); 
        setStatus({type:'success', msg: `✅ Import OK (${Object.keys(data).length} agents)`});
        setActiveTab('desiderata');
    } catch (e: any) {
        setStatus({type:'error', msg: `❌ Erreur: ${e.toString()}`});
    }
  };

  const handleOptimize = async () => {
      setLoading(true); setStatus({type:'loading', msg:'Calcul...'});
      try {
          const res = await axios.post(API_URL, {
              year, start_day: startDay, end_day: endDay, config,
              pre_assignments: preAssignments,
              soft_assignments: Array.from(softConstraints),
              optional_coverage: optionalCoverage
          });
          if (res.data.data) { setPlanning(res.data.data); setStatus({type:'success', msg:'Généré !'}); setActiveTab('planning'); }
          else setStatus({type:'error', msg:'Infeasible'});
      } catch(e) { setStatus({type:'error', msg:'Erreur API'}); }
      finally { setLoading(false); }
  };

  const gridData = activeTab === 'desiderata' ? convertPreAssignmentsToRows(preAssignments) : planning;

  // --- RENDU CONFIG TAB ---
  const renderConfigTab = () => {
      const shifts = Object.keys(config.VACATIONS);
      const agentCycles = (config.CYCLES || {})[selectedAgentConfig] || { OR: [], ARGENT: [] };
      const isParityEnabled = (config.CONTROLLERS_PARITE_STRICTE || []).includes(selectedAgentConfig);

      return (
          <div style={{display:'flex', height:'100%'}}>
              {/* LISTE GAUCHE */}
              <div style={{width: 200, borderRight:'1px solid #e2e8f0', overflowY:'auto', background:'#f8fafc', padding:10}}>
                  <h4 style={{marginTop:0, color:'#64748b', fontSize:11, textTransform:'uppercase'}}>Agents</h4>
                  {config.CONTROLEURS.map(c => (
                      <div 
                        key={c} 
                        onClick={() => setSelectedAgentConfig(c)}
                        style={{
                            padding:'8px 12px', cursor:'pointer', borderRadius:6, marginBottom:2, fontSize:13, fontWeight:600,
                            background: selectedAgentConfig === c ? 'white' : 'transparent',
                            color: selectedAgentConfig === c ? '#2563eb' : '#475569',
                            boxShadow: selectedAgentConfig === c ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                            border: selectedAgentConfig === c ? '1px solid #e2e8f0' : '1px solid transparent'
                        }}
                      >
                          {c}
                      </div>
                  ))}
              </div>

              {/* CONTENU DROITE */}
              <div style={{flex:1, padding:30, overflowY:'auto'}}>
                  {!selectedAgentConfig ? (
                      <div style={{color:'#94a3b8', textAlign:'center', marginTop:50}}>Sélectionnez un agent à gauche pour configurer ses habitudes.</div>
                  ) : (
                      <div>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30}}>
                              <div>
                                  <h2 style={{margin:0, color:'#1e293b'}}>Cycles & Habitudes : <span style={{color:'#2563eb'}}>{selectedAgentConfig}</span></h2>
                                  <p style={{fontSize:13, color:'#64748b', margin:0}}>Définissez les enchaînements préférés.</p>
                              </div>
                              
                              {/* BOUTON TOGGLE PARITÉ */}
                              <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', background: isParityEnabled ? '#dcfce7' : '#f1f5f9', padding:'8px 12px', borderRadius:6, border: isParityEnabled ? '1px solid #16a34a' : '1px solid #cbd5e1'}}>
                                  <input type="checkbox" checked={isParityEnabled} onChange={handleToggleParity} style={{cursor:'pointer'}} />
                                  <span style={{fontWeight:'bold', fontSize:13, color: isParityEnabled ? '#15803d' : '#475569'}}>
                                      Parité Stricte (Nb jours Pair)
                                  </span>
                              </label>
                          </div>

                          {/* SECTION OR */}
                          <div style={{marginBottom:30, background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:20}}>
                              <h3 style={{marginTop:0, color:'#b45309', fontSize:14}}>🥇 Séquences OR (Priorité Haute)</h3>
                              <div style={{display:'flex', gap:10, marginBottom:15, alignItems:'center'}}>
                                  <select style={selectStyle} value={newCycleOr1} onChange={e=>setNewCycleOr1(e.target.value)}><option value="">J</option>{shifts.map(s=><option key={s} value={s}>{s}</option>)}</select>
                                  <span>➜</span>
                                  <select style={selectStyle} value={newCycleOr2} onChange={e=>setNewCycleOr2(e.target.value)}><option value="">J+1</option>{shifts.map(s=><option key={s} value={s}>{s}</option>)}</select>
                                  <button onClick={()=>handleAddCycle('OR')} style={addButtonStyle('#b45309', '#fffbeb', '#fcd34d')}>+ Ajouter</button>
                              </div>
                              <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                                  {agentCycles.OR?.map((pair: string[], idx: number) => (
                                      <div key={idx} style={tagStyle('#b45309', '#fff7ed', '#fed7aa')}>
                                          {pair[0]} ➜ {pair[1]} <span onClick={()=>handleDeleteCycle('OR', idx)} style={{cursor:'pointer', marginLeft:8, fontWeight:'bold'}}>×</span>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          {/* SECTION ARGENT */}
                          <div style={{background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius:8, padding:20}}>
                              <h3 style={{marginTop:0, color:'#475569', fontSize:14}}>🥈 Séquences ARGENT (Priorité Moyenne)</h3>
                              <div style={{display:'flex', gap:10, marginBottom:15, alignItems:'center'}}>
                                  <select style={selectStyle} value={newCycleAg1} onChange={e=>setNewCycleAg1(e.target.value)}><option value="">J</option>{shifts.map(s=><option key={s} value={s}>{s}</option>)}</select>
                                  <span>➜</span>
                                  <select style={selectStyle} value={newCycleAg2} onChange={e=>setNewCycleAg2(e.target.value)}><option value="">J+1</option>{shifts.map(s=><option key={s} value={s}>{s}</option>)}</select>
                                  <button onClick={()=>handleAddCycle('ARGENT')} style={addButtonStyle('#475569', '#f1f5f9', '#cbd5e1')}>+ Ajouter</button>
                              </div>
                              <div style={{display:'flex', flexWrap:'wrap', gap:10}}>
                                  {agentCycles.ARGENT?.map((pair: string[], idx: number) => (
                                      <div key={idx} style={tagStyle('#475569', '#f8fafc', '#e2e8f0')}>
                                          {pair[0]} ➜ {pair[1]} <span onClick={()=>handleDeleteCycle('ARGENT', idx)} style={{cursor:'pointer', marginLeft:8, fontWeight:'bold'}}>×</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: 'sans-serif'}}>
        <header style={{height: 60, background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', flexShrink: 0}}>
            <div style={{display:'flex', gap:10, alignItems:'center'}}><span style={{fontSize:20}}>✈️</span> <span style={{fontWeight:'bold'}}>TDS Manager</span></div>
            <div style={{display:'flex', gap:5}}>
                {['Planning', 'Desiderata', 'Bilan', 'Config'].map(t => (
                    <button key={t} onClick={() => setActiveTab(t.toLowerCase() as any)} style={{padding:'6px 12px', borderRadius:6, border:'none', background: activeTab===t.toLowerCase()?'#eff6ff':'transparent', color: activeTab===t.toLowerCase()?'#2563eb':'#64748b', cursor:'pointer', fontWeight:'bold'}}>{t}</button>
                ))}
            </div>
            <div style={{display:'flex', gap:10, alignItems:'center'}}>
                {activeTab === 'planning' && (
                    <div style={{display:'flex', gap: 5}}>
                        <button onClick={() => setShowDesiderataMatch(!showDesiderataMatch)} style={{background: showDesiderataMatch ? '#e0f2fe' : 'transparent', color: showDesiderataMatch ? '#0284c7' : '#64748b', border: showDesiderataMatch ? '1px solid #7dd3fc' : '1px solid #e2e8f0', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600}}>{showDesiderataMatch ? '👁️ Masquer Demandes' : '👁️ Voir Demandes'}</button>
                        <button onClick={() => setHideOff(!hideOff)} style={{background: hideOff ? '#f1f5f9' : 'transparent', color: hideOff ? '#334155' : '#64748b', border: hideOff ? '1px solid #cbd5e1' : '1px solid #e2e8f0', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600}}>{hideOff ? '👻 Voir OFF' : '👻 Masquer OFF'}</button>
                    </div>
                )}
                {activeTab === 'desiderata' && (
                    <button onClick={handleToggleAllSoft} style={{background:'#f3e8ff', color:'#9333ea', border:'1px solid #d8b4fe', padding:'6px', borderRadius:6, cursor:'pointer'}} title="Priorité basse (Violet)">{softConstraints.size > 0 ? '🟣 Tout Reset' : '🟣 Tout Soft'}</button>
                )}
                <input type="range" min="50" max="150" value={zoomLevel} onChange={e => setZoomLevel(Number(e.target.value))} style={{width:80}} />
                <button onClick={handleOptimize} disabled={loading} style={{background:'#2563eb', color:'white', border:'none', padding:'8px 16px', borderRadius:6, cursor:'pointer'}}>{loading ? '...' : '⚡ Générer'}</button>
                <button onClick={() => setShowSidebar(!showSidebar)} style={{background:'white', border:'1px solid #cbd5e1', padding:'8px', borderRadius:6, cursor:'pointer'}}>⚙️</button>
            </div>
        </header>

        <div style={{flex:1, display:'flex', overflow:'hidden'}}>
            <div style={{flex:1, display:'flex', flexDirection:'column'}}>
                {status.msg && <div style={{padding:10, background: status.type==='error'?'#fee2e2':'#dcfce7', color: status.type==='error'?'#b91c1c':'#15803d'}}>{status.msg}</div>}
                <div style={{flex:1, background:'white', overflow:'hidden'}}>
                    {(activeTab === 'planning' || activeTab === 'desiderata') && (
                        <PlanningTable 
                            data={gridData} year={year} startDay={startDay} endDay={endDay} config={config}
                            isDesiderataView={activeTab === 'desiderata'} preAssignments={preAssignments}
                            showDesiderataMatch={activeTab === 'planning' ? showDesiderataMatch : false}
                            softConstraints={softConstraints} onToggleSoft={handleToggleSoft}
                            zoomLevel={zoomLevel} hideOff={hideOff}
                            optionalCoverage={optionalCoverage} onToggleOptionalCoverage={handleToggleOptionalCoverage}
                            onToggleGlobalOptional={handleToggleGlobalOptional}
                        />
                    )}
                    {activeTab === 'bilan' && <Bilan planning={planning} config={config} year={year} startDay={startDay} endDay={endDay} />}
                    {activeTab === 'config' && renderConfigTab()}
                </div>
            </div>

            {showSidebar && activeTab !== 'config' && (
                <div style={{width:320, background:'white', borderLeft:'1px solid #e2e8f0', padding:20, overflowY:'auto'}}>
                    <div style={sidebarSectionStyle}>
                        <h3 style={{...sidebarTitleStyle, color:'#8b5cf6'}}>💾 SAUVEGARDE CONFIG</h3>
                        <div style={{display:'flex', gap:10}}>
                            <button onClick={handleExportConfig} style={{flex:1, padding:'8px', background:'#f3f4f6', border:'1px solid #d1d5db', borderRadius:4, cursor:'pointer', fontSize:11, fontWeight:600, color:'#374151'}}>⬇️ Sauvegarder</button>
                            <label style={{flex:1, padding:'8px', background:'#f3f4f6', border:'1px solid #d1d5db', borderRadius:4, cursor:'pointer', fontSize:11, fontWeight:600, color:'#374151', textAlign:'center'}}>⬆️ Charger<input type="file" accept=".json" onChange={handleImportConfig} style={{display:'none'}} /></label>
                        </div>
                    </div>
                    
                    <div style={sidebarSectionStyle}>
                        <h3 style={sidebarTitleStyle}>📗 SOURCE CSV (LECTURE)</h3>
                        <div style={{marginBottom:10}}><label style={labelStyle}>URL Google Sheet (Public)</label><input type="text" value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)} style={inputStyle}/></div>
                        <button onClick={handleImport} style={secondaryButtonStyle}>📥 Importer Désidérata</button>
                    </div>

                    <div style={sidebarSectionStyle}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                            <h3 style={{...sidebarTitleStyle, color:'#2563eb', marginBottom:0}}>🏢 AGENTS BUREAU</h3>
                            <button onClick={handleAddBureau} style={{fontSize:11, padding:'4px 8px', background:'#eff6ff', color:'#2563eb', border:'1px solid #bfdbfe', borderRadius:4, cursor:'pointer', fontWeight:'bold'}}>+ Ajouter</button>
                        </div>
                        <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
                            {(config.CONTROLLERS_AFFECTES_BUREAU || []).map((agent: string) => (
                                <div key={agent} style={{display:'flex', alignItems:'center', gap:4, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:4, padding:'2px 6px', fontSize:11, color:'#1e40af', fontWeight:600}}>{agent}<span onClick={() => handleRemoveBureau(agent)} style={{cursor:'pointer', color:'#ef4444', fontWeight:'bold', marginLeft:2}}>×</span></div>
                            ))}
                        </div>
                    </div>

                    <div style={sidebarSectionStyle}>
                        <h3 style={{...sidebarTitleStyle, color:'#3b82f6'}}>⚙️ PARAMÈTRES GÉNÉRAUX</h3>
                        <div style={rowStyle}><label style={labelStyle}>Année</label><input type="number" value={year} onChange={e=>handleYearChange(e.target.value)} style={numberInputStyle}/></div>
                        <div style={rowStyle}><label style={labelStyle}>Jour Début</label><input type="number" value={startDay} onChange={e=>setStartDay(Number(e.target.value))} style={numberInputStyle}/></div>
                        <div style={rowStyle}><label style={labelStyle}>Jour Fin</label><input type="number" value={endDay} onChange={e=>setEndDay(Number(e.target.value))} style={numberInputStyle}/></div>
                        <div style={{height:1, background:'#f1f5f9', margin:'10px 0'}}></div>
                        <div style={rowStyle}><label style={labelStyle}>Temps Limite (sec)</label><input type="number" value={config.CONTRAT.SOLVER_TIME_LIMIT || 25} onChange={e=>handleContratChange('SOLVER_TIME_LIMIT', e.target.value)} style={{...numberInputStyle, color:'#3b82f6', fontWeight:'bold'}} /></div>
                        <div style={rowStyle}><label style={labelStyle}>Max Heures (7j glissants)</label><input type="number" value={config.CONTRAT.MAX_HOURS_7_ROLLING} onChange={e=>handleContratChange('MAX_HOURS_7_ROLLING', e.target.value)} style={numberInputStyle} /></div>
                        <div style={rowStyle}><label style={labelStyle}>Max Heures (Sem. Civile)</label><input type="number" value={config.CONTRAT.MAX_HOURS_WEEK_CALENDAR} onChange={e=>handleContratChange('MAX_HOURS_WEEK_CALENDAR', e.target.value)} style={numberInputStyle} /></div>
                        <div style={rowStyle}><label style={labelStyle}>Repos Min (h)</label><input type="number" value={config.CONTRAT.MIN_REST_HOURS} onChange={e=>handleContratChange('MIN_REST_HOURS', e.target.value)} style={numberInputStyle} /></div>
                        <div style={rowStyle}><label style={labelStyle}>Max Jours Consécutifs</label><input type="number" value={config.CONTRAT.MAX_CONSECUTIVE_SHIFTS} onChange={e=>handleContratChange('MAX_CONSECUTIVE_SHIFTS', e.target.value)} style={numberInputStyle} /></div>
                    </div>

                    <div style={sidebarSectionStyle}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                            <h3 style={{...sidebarTitleStyle, color:'#10b981', marginBottom:0}}>🕒 VACATIONS (HH:MM)</h3>
                            <button onClick={handleAddVacation} style={{fontSize:11, padding:'4px 8px', background:'#ecfdf5', color:'#10b981', border:'1px solid #a7f3d0', borderRadius:4, cursor:'pointer', fontWeight:'bold'}}>+ Ajouter</button>
                        </div>
                        {Object.entries(config.VACATIONS).map(([code, horaire]: any) => (
                            <div key={code} style={{display:'flex', alignItems:'center', gap:5, marginBottom:5, background:'#f8fafc', padding:6, borderRadius:6, border:'1px solid #f1f5f9'}}>
                                <span style={{fontWeight:'bold', fontSize:12, minWidth:35, textAlign:'center', background:'white', border:'1px solid #e2e8f0', borderRadius:4, padding:'4px 0', color:'#334155'}}>{code}</span>
                                <TimeInput val={horaire.debut} onSave={(v) => handleChangeVacation(code, 'debut', v)} />
                                <span style={{color:'#94a3b8', fontSize:10}}>➜</span>
                                <TimeInput val={horaire.fin} onSave={(v) => handleChangeVacation(code, 'fin', v)} />
                                <span onClick={() => handleDeleteVacation(code)} style={{cursor:'pointer', marginLeft:'auto', fontSize:16, color:'#ef4444', fontWeight:'bold', padding:'0 4px'}} title="Supprimer">×</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}

export default App;