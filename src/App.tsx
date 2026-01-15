import { useState, useEffect } from 'react';
import axios from 'axios';
import PlanningTable from './PlanningTable';
import Bilan from './Bilan'; // L'import est ici
import { parseGoogleSheet } from './utils/sheetParser';
import { convertPreAssignmentsToRows } from './utils/dataConverters';

// ⚠️ TON URL HUGGING FACE
const API_URL = "https://ttttty-ty.hf.space/api/optimize"; 

const DEFAULT_CONFIG = {
  ANNEE: 2026,
  CONTROLEURS: ["GAO", "WBR", "PLC", "CML", "BBD", "LAK", "MZN", "TRT", "CLO", "LNN", "KGR", "FRD", "DAZ", "GNC", "DTY", "JCT"],
  CONTROLLERS_AFFECTES_BUREAU: [],
  VACATIONS: { 
    "M": {debut: 5.75, fin: 12.75}, 
    "J1": {debut: 7.5, fin: 15.5}, 
    "J2": {debut: 8.0, fin: 16.0}, 
    "S": {debut: 15.0, fin: 23.0},
  },
  CONTRAT: { 
    MIN_REST_HOURS: 11,
    MAX_CONSECUTIVE_SHIFTS: 4, 
    MAX_HOURS_WEEK_CALENDAR: 32,
    MAX_HOURS_7_ROLLING: 44,
    MAX_BACKTRACKS: 10
  }
};

function App() {
  // --- ETAT CONFIG & DATA ---
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  
  // Paramètres UI directs
  const [year, setYear] = useState(2026);
  const [startDay, setStartDay] = useState(365); 
  const [endDay, setEndDay] = useState(28);
  const [sheetUrl, setSheetUrl] = useState("https://docs.google.com/spreadsheets/d/1lLtFisk983kJ-Yu0rtPyJAoweHxnsKwzen_J1rxsJes/edit");
  
  // Données
  const [preAssignments, setPreAssignments] = useState<any>({});
  const [planning, setPlanning] = useState<any[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: string, msg: string}>({type:'', msg:''});
  const [activeTab, setActiveTab] = useState<'planning' | 'desiderata' | 'bilan' | 'config'>('planning');
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    const saved = localStorage.getItem('tds_config');
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  // --- HANDLERS ---

  const handleImport = async () => {
    setStatus({type:'loading', msg:'📡 Lecture...'});
    try {
        const data = await parseGoogleSheet(sheetUrl, startDay, endDay); 
        setPreAssignments(data);
        setStatus({type:'success', msg: `✅ Import OK (${Object.keys(data).length} agents)`});
        setActiveTab('desiderata');
    } catch (e: any) {
        setStatus({type:'error', msg: `❌ Erreur: ${e.toString()}`});
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    setStatus({type: 'loading', msg: "🚀 Calcul..."});
    try {
      const payload = {
        year: Number(year),
        start_day: Number(startDay),
        end_day: Number(endDay),
        config: { ...config, ANNEE: Number(year) },
        pre_assignments: preAssignments 
      };
      const response = await axios.post(API_URL, payload);
      
      if (response.data.data && response.data.data.length > 0) {
        setPlanning(response.data.data);
        setStatus({type: 'success', msg: `✅ Généré !`});
        setActiveTab('planning');
      } else {
        setStatus({type: 'error', msg: "❌ Pas de solution."});
      }
    } catch (error: any) {
      setStatus({type: 'error', msg: `⚠️ Erreur API`});
    } finally {
      setLoading(false);
    }
  };

  // Sélection des données à afficher pour la grille
  const gridData = activeTab === 'desiderata' 
    ? convertPreAssignmentsToRows(preAssignments)
    : planning;

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: '"Inter", sans-serif'}}>
        
        {/* --- 1. HEADER / TOPBAR --- */}
        <header style={{
            height: 60, background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', flexShrink: 0
        }}>
            {/* Logo */}
            <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{background:'#3b82f6', color:'white', width:32, height:32, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:18}}>✈️</div>
                <div>
                    <h1 style={{fontSize:18, fontWeight:700, margin:0, color:'#1e293b'}}>TDS Manager <span style={{color:'#3b82f6'}}>V2.1</span></h1>
                    <div style={{fontSize:11, color:'#64748b'}}>Planification & Gestion des Effectifs</div>
                </div>
            </div>

            {/* Onglets Centraux */}
            <div style={{display:'flex', background:'#f1f5f9', padding:4, borderRadius:8, gap:4}}>
                {['Planning', 'Desiderata', 'Bilan', 'Config'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab.toLowerCase() as any)}
                        style={{
                            border:'none', padding:'6px 16px', borderRadius:6, fontSize:13, fontWeight:600, cursor:'pointer',
                            background: activeTab === tab.toLowerCase() ? 'white' : 'transparent',
                            color: activeTab === tab.toLowerCase() ? '#3b82f6' : '#64748b',
                            boxShadow: activeTab === tab.toLowerCase() ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Contrôles Droite */}
            <div style={{display:'flex', alignItems:'center', gap:15}}>
                <div style={{display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#64748b'}}>
                    <span>Zoom</span>
                    <input 
                        type="range" min="50" max="150" value={zoomLevel} 
                        onChange={(e) => setZoomLevel(Number(e.target.value))}
                        style={{width: 80}} 
                    />
                </div>
                <button 
                    onClick={handleOptimize}
                    disabled={loading}
                    style={{
                        background: loading ? '#94a3b8' : '#3b82f6', color:'white', border:'none', 
                        padding:'8px 16px', borderRadius:6, fontSize:13, fontWeight:600, cursor: loading?'wait':'pointer',
                        display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 4px rgba(59,130,246,0.3)'
                    }}
                >
                    {loading ? '⚙️ Calcul...' : '⚡ Générer Planning'}
                </button>
            </div>
        </header>

        {/* --- 2. MAIN LAYOUT (GRID + SIDEBAR) --- */}
        <div style={{flex: 1, display: 'flex', overflow: 'hidden'}}>
            
            {/* GAUCHE : ZONE PRINCIPALE */}
            <div style={{flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
                
                {/* Barre de Status */}
                {status.msg && (
                    <div style={{
                        padding: '8px 16px', fontSize: 13, fontWeight: 500, borderBottom: '1px solid #e2e8f0',
                        background: status.type === 'error' ? '#fef2f2' : '#f0fdf4',
                        color: status.type === 'error' ? '#ef4444' : '#16a34a'
                    }}>
                        {status.msg}
                    </div>
                )}

                {/* CONTENU VARIABLE SELON L'ONGLET */}
                <div style={{flex: 1, width: '100%', height: '100%', background: '#fff'}}>
                    
                   {/* VUE GRILLE (PLANNING OU DESIDERATA) */}
                   {(activeTab === 'planning' || activeTab === 'desiderata') && (
                       <PlanningTable 
                            data={gridData} 
                            year={year} 
                            startDay={startDay} 
                            endDay={endDay} 
                            isDesiderataView={activeTab === 'desiderata'}
                        />
                   )}

                   {/* VUE BILAN (C'est ici que le composant est utilisé !) */}
                   {activeTab === 'bilan' && (
                       <Bilan 
                            planning={planning} 
                            config={config} 
                            year={year}           // <--- Ajouté
                            startDay={startDay}   // <--- Ajouté
                            endDay={endDay}       // <--- Ajouté
                        />
                   )}

                </div>
            </div>

            {/* DROITE : SIDEBAR CONFIGURATION */}
            <div style={{
                width: 340, background: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
                overflowY: 'auto', flexShrink: 0
            }}>
                
                {/* Section 1: Source */}
                <div style={sidebarSectionStyle}>
                    <h3 style={sidebarTitleStyle}>📗 SOURCE CSV (LECTURE)</h3>
                    <div style={{marginBottom:10}}>
                        <label style={labelStyle}>URL Google Sheet (Public)</label>
                        <input 
                            type="text" value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)} 
                            style={inputStyle}
                        />
                    </div>
                    <button onClick={handleImport} style={secondaryButtonStyle}>
                        📥 Importer Désidérata
                    </button>
                </div>

                {/* Section 2: Paramètres Généraux */}
                <div style={sidebarSectionStyle}>
                    <h3 style={{...sidebarTitleStyle, color:'#3b82f6'}}>⚙️ PARAMÈTRES GÉNÉRAUX</h3>
                    
                    <div style={rowStyle}>
                        <label style={labelStyle}>Année</label>
                        <input type="number" value={year} onChange={e=>setYear(Number(e.target.value))} style={numberInputStyle}/>
                    </div>
                    <div style={rowStyle}>
                        <label style={labelStyle}>Jour Début</label>
                        <input type="number" value={startDay} onChange={e=>setStartDay(Number(e.target.value))} style={numberInputStyle}/>
                    </div>
                    <div style={rowStyle}>
                        <label style={labelStyle}>Jour Fin</label>
                        <input type="number" value={endDay} onChange={e=>setEndDay(Number(e.target.value))} style={numberInputStyle}/>
                    </div>

                    <div style={{height:1, background:'#f1f5f9', margin:'10px 0'}}></div>

                 
                    <div style={rowStyle}>
                        <label style={labelStyle}>Max Heures (7j glissants)</label>
                        <input type="number" value={config.CONTRAT.MAX_HOURS_7_ROLLING} style={numberInputStyle} disabled/>
                    </div>
                    <div style={rowStyle}>
                        <label style={labelStyle}>Max Heures (Sem. Civile)</label>
                        <input type="number" value={config.CONTRAT.MAX_HOURS_WEEK_CALENDAR} style={numberInputStyle} disabled/>
                    </div>
                    <div style={rowStyle}>
                        <label style={labelStyle}>Repos Min</label>
                        <input type="number" value={config.CONTRAT.MIN_REST_HOURS} style={numberInputStyle} disabled/>
                    </div>
                </div>

                {/* Section 3: Vacations */}
                <div style={sidebarSectionStyle}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                        <h3 style={{...sidebarTitleStyle, color:'#10b981', marginBottom:0}}>🕒 VACATIONS (HH:MM)</h3>
                        <button style={{fontSize:11, padding:'2px 6px', background:'#ecfdf5', color:'#10b981', border:'1px solid #a7f3d0', borderRadius:4, cursor:'pointer'}}>+ Ajouter</button>
                    </div>

                    {Object.entries(config.VACATIONS).map(([code, horaire]: any) => (
                        <div key={code} style={{display:'flex', alignItems:'center', gap:5, marginBottom:8, background:'#f8fafc', padding:6, borderRadius:6, border:'1px solid #f1f5f9'}}>
                            <span style={{fontWeight:'bold', fontSize:12, minWidth:30, textAlign:'center', background:'white', border:'1px solid #e2e8f0', borderRadius:4, padding:'2px 0'}}>{code}</span>
                            <input type="text" value={horaire.debut} readOnly style={{width:40, fontSize:11, textAlign:'center', border:'1px solid #cbd5e1', borderRadius:3}} />
                            <span style={{color:'#94a3b8', fontSize:10}}>➜</span>
                            <input type="text" value={horaire.fin} readOnly style={{width:40, fontSize:11, textAlign:'center', border:'1px solid #cbd5e1', borderRadius:3}} />
                            <span style={{cursor:'pointer', marginLeft:'auto', fontSize:14, color:'#ef4444'}}>×</span>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    </div>
  );
}

// --- STYLES UTILITAIRES ---
const sidebarSectionStyle: React.CSSProperties = {
    padding: 20, borderBottom: '1px solid #f1f5f9'
};

const sidebarTitleStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.5, marginBottom: 12, marginTop: 0, textTransform: 'uppercase'
};

const labelStyle: React.CSSProperties = {
    fontSize: 12, color: '#475569', fontWeight: 500
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, marginTop: 4, boxSizing: 'border-box'
};

const secondaryButtonStyle: React.CSSProperties = {
    width: '100%', background: '#22c55e', color: 'white', border: 'none', padding: '8px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 10
};

const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8
};

const numberInputStyle: React.CSSProperties = {
    width: 50, padding: '4px 8px', textAlign: 'right', fontSize: 12, border: '1px solid #cbd5e1', borderRadius: 4, fontWeight: 600, color: '#334155'
};

export default App;