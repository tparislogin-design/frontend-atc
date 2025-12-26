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
    "STAGE": {debut: 9.0, fin: 15.0} // Stage 6h
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
  // --- ETAT ---
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  
  // Paramètres Temps
  const [year, setYear] = useState(2026);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(28);
  
  // Paramètres Import
  const [sheetUrl, setSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1lLtFisk983kJ-Yu0rtPyJAoweHxnsKwzen_J1rxsJes/edit");
  const [preAssignments, setPreAssignments] = useState<any>({});
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: string, msg: string}>({type:'', msg:''});
  const [planning, setPlanning] = useState<any[]>([]);

  // Chargement config locale
  useEffect(() => {
    const saved = localStorage.getItem('tds_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  // --- ACTIONS ---

  const handleImport = async () => {
    setStatus({type:'loading', msg:'📡 Connexion au Google Sheet...'});
    try {
        const data = await parseGoogleSheet(sheetUrl, startDay, endDay, year);
        setPreAssignments(data);
        const nbAgents = Object.keys(data).length;
        setStatus({type:'success', msg: `✅ Import réussi ! ${nbAgents} agents trouvés avec des contraintes.`});
    } catch (e: any) {
        console.error(e);
        setStatus({type:'error', msg: `❌ Erreur import : ${e.toString()}`});
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    setStatus({type: 'loading', msg: "🚀 Envoi au moteur de calcul..."});
    setPlanning([]);
    
    try {
      const payload = {
        year: Number(year), 
        start_day: Number(startDay), 
        end_day: Number(endDay),
        config: { ...config, ANNEE: Number(year) },
        pre_assignments: preAssignments // Envoi des données importées
      };

      console.log("Envoi payload:", payload);

      const response = await axios.post(API_URL, payload);
      
      if (response.data.data && response.data.data.length > 0) {
        setPlanning(response.data.data);
        setStatus({type: 'success', msg: `✅ Planning généré avec succès !`});
      } else {
        setStatus({type: 'error', msg: "❌ Aucune solution mathématique trouvée (Infeasible)."});
      }
    } catch (error: any) {
      console.error(error);
      setStatus({type: 'error', msg: `⚠️ Erreur API : ${error.message}`});
    } finally {
      setLoading(false);
    }
  };

  // --- RENDU ---
  return (
    <div style={{maxWidth: 1400, margin: '0 auto', padding: 20, fontFamily: 'sans-serif', background:'#f8fafc', minHeight:'100vh'}}>
        
        {/* HEADER */}
        <header style={{display:'flex', justifyContent:'space-between', marginBottom:20, background:'white', padding:15, borderRadius:8, boxShadow:'0 1px 2px rgba(0,0,0,0.1)'}}>
            <h1 style={{margin:0, color:'#1e293b'}}>✈️ TDS Manager <span style={{fontSize:'0.6em', background:'#2563eb', color:'white', padding:'3px 6px', borderRadius:4}}>PRO</span></h1>
            <button onClick={() => setShowConfig(true)} style={{background:'white', border:'1px solid #ccc', padding:'8px 12px', borderRadius:6, cursor:'pointer', fontWeight:'bold', color:'#475569'}}>⚙️ Configuration</button>
        </header>

        {showConfig && <ConfigPanel config={config} onSave={(c) => {setConfig(c); localStorage.setItem('tds_config', JSON.stringify(c)); setShowConfig(false);}} onClose={() => setShowConfig(false)} />}

        <div style={{background:'white', padding:20, borderRadius:8, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', marginBottom:20}}>
            
            {/* LIGNE 1 : DATES */}
            <div style={{display:'flex', gap:20, flexWrap:'wrap', marginBottom: 20, borderBottom:'1px solid #f1f5f9', paddingBottom: 20}}>
                <div style={inputGroupStyle}><label style={labelStyle}>Année</label><input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} style={inputStyle}/></div>
                <div style={inputGroupStyle}><label style={labelStyle}>Début (J)</label><input type="number" value={startDay} onChange={e=>setStartDay(Number(e.target.value))} style={inputStyle}/></div>
                <div style={inputGroupStyle}><label style={labelStyle}>Fin (J)</label><input type="number" value={endDay} onChange={e=>setEndDay(Number(e.target.value))} style={inputStyle}/></div>
            </div>
            
            {/* LIGNE 2 : IMPORT CSV (La nouveauté) */}
            <div style={{display:'flex', gap:10, alignItems:'center', background:'#f0fdf4', padding:15, borderRadius:8, border:'1px solid #bbf7d0', marginBottom: 20}}>
                <div style={{fontSize:'1.5rem'}}>📗</div>
                <div style={{flex: 1}}>
                    <label style={{fontSize:'0.8em', fontWeight:'bold', color:'#166534', display:'block', marginBottom: 4}}>Lien Google Sheet (Public)</label>
                    <input 
                        type="text" 
                        value={sheetUrl} 
                        onChange={e=>setSheetUrl(e.target.value)} 
                        style={{width: '100%', padding:8, border:'1px solid #86efac', borderRadius:4, fontSize:'0.9rem'}} 
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                    />
                </div>
                <button onClick={handleImport} style={{background:'#16a34a', color:'white', border:'none', padding:'10px 20px', borderRadius:6, cursor:'pointer', fontWeight:'bold', height: 'fit-content'}}>
                    📥 Charger les contraintes
                </button>
            </div>

            {/* LIGNE 3 : BOUTON ACTION */}
            <div style={{textAlign:'right'}}>
                <div style={{marginBottom: 10, fontSize: '0.9em', color: Object.keys(preAssignments).length > 0 ? '#166534' : '#64748b'}}>
                    {Object.keys(preAssignments).length > 0 
                        ? `✅ ${Object.keys(preAssignments).length} agents chargés en mémoire`
                        : "⚠️ Aucune contrainte chargée (Planning libre)"}
                </div>
                <button onClick={handleOptimize} disabled={loading} style={{background: loading?'#94a3b8':'#2563eb', color:'white', border:'none', padding:'12px 30px', borderRadius:8, fontWeight:'bold', cursor: loading?'not-allowed':'pointer', fontSize:'1rem', boxShadow:'0 4px 6px -1px rgba(37, 99, 235, 0.2)'}}>
                    {loading ? '⚙️ Calcul en cours...' : '⚡ LANCER L\'OPTIMISATION'}
                </button>
            </div>
        </div>

        {/* STATUS BAR */}
        {status.msg && <div style={{marginBottom:20, padding:15, borderRadius:6, background: status.type==='error'?'#fef2f2':status.type==='loading'?'#eff6ff':'#f0fdf4', color: status.type==='error'?'#991b1b':status.type==='loading'?'#1e40af':'#166534', border: status.type==='error'?'1px solid #fecaca':status.type==='loading'?'1px solid #bfdbfe':'1px solid #bbf7d0', fontWeight: 500}}>{status.msg}</div>}

        {/* RESULTAT */}
        <div style={{background:'white', padding:10, borderRadius:8, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', minHeight: 400}}>
            {planning.length > 0 ? <PlanningTable data={planning} year={year} /> : <div style={{padding:80, textAlign:'center', color:'#cbd5e1', fontSize:'1.2rem'}}>📅 Le planning s'affichera ici.</div>}
        </div>
    </div>
  );
}

// Styles utilitaires
const inputGroupStyle = {display:'flex', flexDirection:'column' as const};
const labelStyle = {fontSize:12, fontWeight:'bold', color:'#64748b', marginBottom: 4};
const inputStyle = {padding:8, border:'1px solid #cbd5e1', borderRadius:4, fontSize:'1rem', width: 100};

export default App;