import { useState, useEffect } from 'react';
import axios from 'axios';
import PlanningTable from './PlanningTable';
import ConfigPanel from './ConfigPanel';
import { parseGoogleSheet } from './utils/sheetParser';
import { convertPreAssignmentsToRows } from './utils/dataConverters'; // IMPORT NOUVEAU

// ⚠️ TON URL HUGGING FACE
const API_URL = "https://ttttty-ty.hf.space/api/optimize"; 

const DEFAULT_CONFIG = {
  ANNEE: 2026,
  CONTROLEURS: ["GAO", "WBR", "PLC", "CML", "BBD", "LAK", "MZN", "TRT", "CLO"],
  CONTROLLERS_AFFECTES_BUREAU: [],
  VACATIONS: { "M": {debut: 6.0, fin: 14.0}, "J1": {debut: 7.0, fin: 16.0}, "S": {debut: 15.0, fin: 23.0}, "STAGE": {debut: 9.0, fin: 15.0} },
  CONTRAT: { MIN_REST_HOURS: 11, MAX_CONSECUTIVE_SHIFTS: 5, BUFFER_DAYS: 2, SOLVER_TIME_LIMIT: 10, MAX_HOURS_WEEK_CALENDAR: 36, MAX_HOURS_7_ROLLING: 44, REQUIRE_2_CONSECUTIVE_REST_DAYS: true }
};

function App() {
  // ETATS
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [year, setYear] = useState(2026);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(28);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: string, msg: string}>({type:'', msg:''});
  
  // DONNÉES
  const [sheetUrl, setSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1lLtFisk983kJ-Yu0rtPyJAoweHxnsKwzen_J1rxsJes/edit");
  const [preAssignments, setPreAssignments] = useState<any>({});
  const [planning, setPlanning] = useState<any[]>([]);
  
  // GESTION DES VUES (Planning vs Desiderata)
  const [viewMode, setViewMode] = useState<'planning' | 'desiderata'>('planning');

  useEffect(() => {
    const saved = localStorage.getItem('tds_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleImport = async () => {
    setStatus({type:'loading', msg:'📡 Lecture du Google Sheet...'});
    try {
        const data = await parseGoogleSheet(sheetUrl, startDay, endDay); // (year supprimé ici)
        setPreAssignments(data);
        setStatus({type:'success', msg: `✅ Import réussi ! ${Object.keys(data).length} agents trouvés.`});
        
        // AUTO-SWITCH : On montre les désidératas tout de suite
        setViewMode('desiderata');
        
    } catch (e: any) {
        setStatus({type:'error', msg: `❌ Erreur import : ${e.toString()}`});
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    setStatus({type: 'loading', msg: "🚀 Calcul en cours..."});
    
    try {
      const payload = {
        year: Number(year), start_day: Number(startDay), end_day: Number(endDay),
        config: { ...config, ANNEE: Number(year) },
        pre_assignments: preAssignments
      };

      const response = await axios.post(API_URL, payload);
      
      if (response.data.data && response.data.data.length > 0) {
        setPlanning(response.data.data);
        setStatus({type: 'success', msg: `✅ Planning généré avec succès !`});
        
        // AUTO-SWITCH : On montre le résultat
        setViewMode('planning');
        
      } else {
        setStatus({type: 'error', msg: "❌ Aucune solution mathématique trouvée."});
      }
    } catch (error: any) {
      setStatus({type: 'error', msg: `⚠️ Erreur API : ${error.message}`});
    } finally {
      setLoading(false);
    }
  };

  // CALCUL DES DONNÉES À AFFICHER SELON LE MODE
  const gridData = viewMode === 'planning' 
    ? planning 
    : convertPreAssignmentsToRows(preAssignments, year, startDay, endDay);

  return (
    <div style={{maxWidth: 1400, margin: '0 auto', padding: 20, fontFamily: 'sans-serif', background:'#f8fafc', minHeight:'100vh'}}>
        <header style={{display:'flex', justifyContent:'space-between', marginBottom:20, background:'white', padding:15, borderRadius:8, boxShadow:'0 1px 2px rgba(0,0,0,0.1)'}}>
            <h1 style={{margin:0, color:'#1e293b'}}>✈️ TDS Manager <span style={{fontSize:'0.6em', background:'#2563eb', color:'white', padding:'3px 6px', borderRadius:4}}>PRO</span></h1>
            <button onClick={() => setShowConfig(true)} style={{background:'white', border:'1px solid #ccc', padding:'8px 12px', borderRadius:6, cursor:'pointer', fontWeight:'bold', color:'#475569'}}>⚙️ Configuration</button>
        </header>

        {showConfig && <ConfigPanel config={config} onSave={(c) => {setConfig(c); localStorage.setItem('tds_config', JSON.stringify(c)); setShowConfig(false);}} onClose={() => setShowConfig(false)} />}

        <div style={{background:'white', padding:20, borderRadius:8, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', marginBottom:20}}>
            {/* Ligne Dates */}
            <div style={{display:'flex', gap:20, marginBottom: 20, borderBottom:'1px solid #f1f5f9', paddingBottom: 20}}>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:12, fontWeight:'bold', color:'#64748b'}}>Année</label><input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} style={inputStyle}/></div>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:12, fontWeight:'bold', color:'#64748b'}}>Début</label><input type="number" value={startDay} onChange={e=>setStartDay(Number(e.target.value))} style={inputStyle}/></div>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:12, fontWeight:'bold', color:'#64748b'}}>Fin</label><input type="number" value={endDay} onChange={e=>setEndDay(Number(e.target.value))} style={inputStyle}/></div>
            </div>
            
            {/* Ligne Import & Action */}
            <div style={{display:'flex', gap:10, alignItems:'center', background:'#f0fdf4', padding:15, borderRadius:8, border:'1px solid #bbf7d0', flexWrap:'wrap'}}>
                <input type="text" value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)} style={{flex:1, padding:8, border:'1px solid #86efac', borderRadius:4, minWidth:200}} placeholder="Lien Google Sheet..." />
                <button onClick={handleImport} style={{background:'#16a34a', color:'white', border:'none', padding:'10px 20px', borderRadius:6, cursor:'pointer', fontWeight:'bold'}}>📥 Charger</button>
                <div style={{flex:1, textAlign:'right'}}>
                    <button onClick={handleOptimize} disabled={loading} style={{background: loading?'#94a3b8':'#2563eb', color:'white', border:'none', padding:'12px 30px', borderRadius:8, fontWeight:'bold', cursor: loading?'not-allowed':'pointer', boxShadow:'0 4px 6px rgba(37,99,235,0.2)'}}>
                        {loading ? '⚙️ Calcul...' : '⚡ LANCER'}
                    </button>
                </div>
            </div>
        </div>

        {/* BARRE D'ONGLETS DE VUE (NOUVEAU) */}
        <div style={{display:'flex', gap:5, marginBottom:0}}>
            <button 
                onClick={() => setViewMode('planning')} 
                style={{...tabStyle, background: viewMode==='planning' ? 'white' : '#e2e8f0', color: viewMode==='planning' ? '#2563eb' : '#64748b', borderBottom: viewMode==='planning' ? 'none' : '1px solid #ccc'}}
            >
                📅 Résultat Planning
            </button>
            <button 
                onClick={() => setViewMode('desiderata')} 
                style={{...tabStyle, background: viewMode==='desiderata' ? '#fffbeb' : '#e2e8f0', color: viewMode==='desiderata' ? '#d97706' : '#64748b', borderBottom: viewMode==='desiderata' ? 'none' : '1px solid #ccc'}}
            >
                📋 Voir Désidérata
            </button>
        </div>

        {/* ZONE PRINCIPALE */}
        <div style={{background:'white', padding:10, borderRadius:'0 8px 8px 8px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)', minHeight: 400, borderTop: '3px solid', borderColor: viewMode==='planning'?'#2563eb':'#fbbf24'}}>
            {status.msg && <div style={{marginBottom:10, padding:10, borderRadius:4, background: status.type==='error'?'#fef2f2':'#f0fdf4', color: status.type==='error'?'#991b1b':'#166534', border:'1px solid', borderColor: status.type==='error'?'#fecaca':'#bbf7d0'}}>{status.msg}</div>}
            
            {gridData.length > 0 ? (
                <PlanningTable data={gridData} year={year} isDesiderataView={viewMode === 'desiderata'} />
            ) : (
                <div style={{padding:80, textAlign:'center', color:'#cbd5e1'}}>
                    <div style={{fontSize:'3rem'}}>∅</div>
                    <div>Aucune donnée à afficher dans cette vue.</div>
                </div>
            )}
        </div>
    </div>
  );
}

const inputStyle = {padding:8, border:'1px solid #cbd5e1', borderRadius:4, width: 80};
const tabStyle = {padding: '10px 20px', borderRadius:'8px 8px 0 0', border:'1px solid #ccc', cursor:'pointer', fontWeight:'bold', fontSize:'0.9rem', marginBottom:'-1px', position:'relative' as const, zIndex:1};

export default App;