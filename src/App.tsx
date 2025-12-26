import { useState, useEffect } from 'react';
import axios from 'axios';
import PlanningTable from './PlanningTable';
import ConfigPanel from './ConfigPanel';
import { parseGoogleSheet } from './utils/sheetParser';

// ⚠️ TON URL HUGGING FACE
const API_URL = "https://ttttty-ty.hf.space/api/optimize"; 

const DEFAULT_CONFIG = {
  ANNEE: 2026,
  CONTROLEURS: ["GAO", "WBR", "PLC", "CML", "BBD", "LAK", "MZN", "TRT", "CLO"],
  CONTROLLERS_AFFECTES_BUREAU: [],
  VACATIONS: { 
    "M": {debut: 6.0, fin: 14.0}, 
    "J1": {debut: 7.0, fin: 16.0}, 
    "S": {debut: 15.0, fin: 23.0},
    "STAGE": {debut: 9.0, fin: 15.0} // 6h, ignore repos 11h
  },
  CONTRAT: { 
    MIN_REST_HOURS: 11,
    MAX_CONSECUTIVE_SHIFTS: 5, 
    BUFFER_DAYS: 2, 
    SOLVER_TIME_LIMIT: 10,
    MAX_HOURS_WEEK_CALENDAR: 36,
    MAX_HOURS_7_ROLLING: 44,
    REQUIRE_2_CONSECUTIVE_REST_DAYS: true
  }
};

function App() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [year, setYear] = useState(2026);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(28);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: string, msg: string}>({type:'', msg:''});
  const [planning, setPlanning] = useState<any[]>([]);
  const [sheetUrl, setSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1lLtFisk983kJ-Yu0rtPyJAoweHxnsKwzen_J1rxsJes/edit");
  const [preAssignments, setPreAssignments] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem('tds_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleImport = async () => {
    setStatus({type:'loading', msg:'Lecture du fichier...'});
    try {
        const data = await parseGoogleSheet(sheetUrl, startDay, endDay, year);
        setPreAssignments(data);
        setStatus({type:'success', msg: `✅ Import OK pour ${Object.keys(data).length} agents`});
    } catch (e: any) {
        setStatus({type:'error', msg: `Erreur import: ${e}`});
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    setStatus({type: 'loading', msg: "Calcul en cours..."});
    setPlanning([]);
    try {
      const response = await axios.post(API_URL, {
        year: Number(year), start_day: Number(startDay), end_day: Number(endDay),
        config: { ...config, ANNEE: Number(year) },
        pre_assignments: preAssignments
      });
      
      if (response.data.data && response.data.data.length > 0) {
        setPlanning(response.data.data);
        setStatus({type: 'success', msg: `✅ Planning généré !`});
      } else {
        setStatus({type: 'error', msg: "❌ Aucune solution trouvée."});
      }
    } catch (error: any) {
      setStatus({type: 'error', msg: `⚠️ Erreur : ${error.message}`});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth: 1400, margin: '0 auto', padding: 20, fontFamily: 'sans-serif', background:'#f8fafc', minHeight:'100vh'}}>
        <header style={{display:'flex', justifyContent:'space-between', marginBottom:20, background:'white', padding:15, borderRadius:8, boxShadow:'0 1px 2px rgba(0,0,0,0.1)'}}>
            <h1 style={{margin:0, color:'#1e293b'}}>✈️ TDS Manager <span style={{fontSize:'0.6em', background:'#2563eb', color:'white', padding:'3px 6px', borderRadius:4}}>PRO</span></h1>
            <button onClick={() => setShowConfig(true)} style={{background:'white', border:'1px solid #ccc', padding:'8px 12px', borderRadius:6, cursor:'pointer'}}>⚙️ Config</button>
        </header>

        {showConfig && <ConfigPanel config={config} onSave={(c) => {setConfig(c); localStorage.setItem('tds_config', JSON.stringify(c)); setShowConfig(false);}} onClose={() => setShowConfig(false)} />}

        <div style={{display:'grid', gap:15, background:'white', padding:20, borderRadius:8, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', marginBottom:20}}>
            <div style={{display:'flex', gap:15, flexWrap:'wrap'}}>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:12, fontWeight:'bold', color:'#64748b'}}>Année</label><input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} style={{padding:8, border:'1px solid #ccc', borderRadius:4}}/></div>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:12, fontWeight:'bold', color:'#64748b'}}>Début</label><input type="number" value={startDay} onChange={e=>setStartDay(Number(e.target.value))} style={{padding:8, border:'1px solid #ccc', borderRadius:4}}/></div>
                <div style={{display:'flex', flexDirection:'column'}}><label style={{fontSize:12, fontWeight:'bold', color:'#64748b'}}>Fin</label><input type="number" value={endDay} onChange={e=>setEndDay(Number(e.target.value))} style={{padding:8, border:'1px solid #ccc', borderRadius:4}}/></div>
            </div>
            
            <div style={{display:'flex', gap:10, alignItems:'center', background:'#f0fdf4', padding:10, borderRadius:6, border:'1px solid #bbf7d0'}}>
                <input type="text" value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)} style={{flex:1, padding:8, border:'1px solid #16a34a', borderRadius:4}} />
                <button onClick={handleImport} style={{background:'#16a34a', color:'white', border:'none', padding:'8px 15px', borderRadius:4, cursor:'pointer'}}>📥 Importer</button>
            </div>

            <div style={{textAlign:'right'}}>
                <button onClick={handleOptimize} disabled={loading} style={{background: loading?'#ccc':'#2563eb', color:'white', border:'none', padding:'12px 24px', borderRadius:6, fontWeight:'bold', cursor:'pointer'}}>
                    {loading ? 'Calcul...' : '⚡ LANCER'}
                </button>
            </div>
        </div>

        {status.msg && <div style={{marginBottom:20, padding:15, borderRadius:6, background: status.type==='error'?'#fef2f2':'#f0fdf4', color: status.type==='error'?'#991b1b':'#166534', border: status.type==='error'?'1px solid #fecaca':'1px solid #bbf7d0'}}>{status.msg}</div>}

        <div style={{background:'white', padding:10, borderRadius:8, boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            {planning.length > 0 ? <PlanningTable data={planning} year={year} /> : <div style={{padding:50, textAlign:'center', color:'#ccc'}}>Aucun planning.</div>}
        </div>
    </div>
  );
}
export default App;