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
  const [hideOff, setHideOff] = useState(true); 
  
  // Format : { "1": ["M", "S"] }
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

  // --- GESTION SOFT/HARD ---
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

  // --- GESTION COUVERTURE OPTIONNELLE ---
  
  // 1. Bascule pour 1 jour
  const handleToggleOptionalCoverage = (dayNum: number, shiftCode: string) => {
      const dayStr = dayNum.toString();
      const current = optionalCoverage[dayStr] || [];
      let next;
      if (current.includes(shiftCode)) next = current.filter(s => s !== shiftCode);
      else next = [...current, shiftCode];
      setOptionalCoverage({ ...optionalCoverage, [dayStr]: next });
  };

  // 2. Bascule GLOBALE (Toute la période) - NOUVEAU
  const handleToggleGlobalOptional = (shiftCode: string) => {
      // Générer la liste de tous les jours
      const daysList = [];
      if (startDay <= endDay) {
          for (let i = startDay; i <= endDay; i++) daysList.push(i.toString());
      } else {
          for (let i = startDay; i <= 365; i++) daysList.push(i.toString());
          for (let i = 1; i <= endDay; i++) daysList.push(i.toString());
      }

      // Vérifier si le shift est déjà optionnel PARTOUT
      const isAlreadyOptionalEverywhere = daysList.every(dayStr => {
          return optionalCoverage[dayStr] && optionalCoverage[dayStr].includes(shiftCode);
      });

      const newCoverage = { ...optionalCoverage };

      daysList.forEach(dayStr => {
          const currentList = newCoverage[dayStr] || [];
          if (isAlreadyOptionalEverywhere) {
              // On retire partout (Redevient Rouge/Obligatoire)
              newCoverage[dayStr] = currentList.filter(s => s !== shiftCode);
          } else {
              // On ajoute partout (Devient Bleu/Optionnel)
              if (!currentList.includes(shiftCode)) {
                  newCoverage[dayStr] = [...currentList, shiftCode];
              }
          }
      });

      setOptionalCoverage(newCoverage);
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
              optional_coverage: optionalCoverage
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
                <div style={{flex:1, background:'white'}}>
                    {(activeTab === 'planning' || activeTab === 'desiderata') && (
                        <PlanningTable 
                            data={gridData} year={year} startDay={startDay} endDay={endDay} config={config}
                            isDesiderataView={activeTab === 'desiderata'} preAssignments={preAssignments}
                            showDesiderataMatch={activeTab === 'planning' ? showDesiderataMatch : false}
                            softConstraints={softConstraints} onToggleSoft={handleToggleSoft}
                            zoomLevel={zoomLevel} hideOff={hideOff}
                            // Props Couverture Optionnelle
                            optionalCoverage={optionalCoverage} 
                            onToggleOptionalCoverage={handleToggleOptionalCoverage}
                            onToggleGlobalOptional={handleToggleGlobalOptional} // NOUVEAU
                        />
                    )}
                    {activeTab === 'bilan' && <Bilan planning={planning} config={config} year={year} startDay={startDay} endDay={endDay} />}
                    {activeTab === 'config' && <div style={{padding:50, textAlign:'center', color:'#94a3b8'}}>Configuration à droite 👉</div>}
                </div>
            </div>

            {showSidebar && (
                <div style={{width:320, background:'white', borderLeft:'1px solid #e2e8f0', padding:20, overflowY:'auto'}}>
                    {/* ... Sidebar inchangée ... */}
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
                            <div key={code} style={{display:'flex', alignItems:'center', gap:5, marginBottom:8, background:'#f8fafc', padding:6, borderRadius:6, border:'1px solid #f1f5f9'}}>
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

// Styles inchangés...
const sidebarSectionStyle: React.CSSProperties = { padding: 20, borderBottom: '1px solid #f1f5f9' };
const sidebarTitleStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, marginBottom: 12, marginTop: 0, textTransform: 'uppercase' };
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#475569', fontWeight: 500 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, marginTop: 4, boxSizing: 'border-box' };
const secondaryButtonStyle: React.CSSProperties = { width: '100%', background: '#22c55e', color: 'white', border: 'none', padding: '8px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10 };
const rowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 };
const numberInputStyle: React.CSSProperties = { width: 50, padding: '4px 8px', textAlign: 'right', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, fontWeight: 600, color: '#334155' };

export default App;