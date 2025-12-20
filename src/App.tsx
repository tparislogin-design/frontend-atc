import { useState, useEffect } from 'react';
import axios from 'axios';
import PlanningTable from './PlanningTable';
import ConfigPanel from './ConfigPanel';

// ✅ TON URL HUGGING FACE
const API_URL = "https://ttttty-ty.hf.space/api/optimize"; 

const DEFAULT_CONFIG = {
  ANNEE: 2025,
  CONTROLEURS: ["GAO", "WBR", "PLC", "CML", "BBD", "LAK", "MZN", "TRT", "CLO"],
  CONTROLLERS_AFFECTES_BUREAU: [],
  VACATIONS: { 
    "M": {debut: 6.0, fin: 14.0}, 
    "J1": {debut: 7.0, fin: 16.0}, 
    "S": {debut: 15.0, fin: 23.0} 
  },
  CONTRAT: { 
    MIN_REST_HOURS: 8, // 8h pour permettre Soir -> Matin si besoin
    MAX_CONSECUTIVE_SHIFTS: 5, 
    BUFFER_DAYS: 2, 
    SOLVER_TIME_LIMIT: 10 
  }
};

function App() {
  // --- ÉTAT ---
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  
  const [year, setYear] = useState(2026);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(28);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'error'|'success'|'loading'|'', msg: string}>({type:'', msg:''});
  const [planning, setPlanning] = useState<any[]>([]);

  // Chargement initial depuis LocalStorage (Sauvegarde Navigateur)
  useEffect(() => {
    const savedConfig = localStorage.getItem('tds_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Erreur lecture config sauvegardée");
      }
    }
  }, []);

  // Sauvegarde de la configuration
  const handleSaveConfig = (newConfig: any) => {
    setConfig(newConfig);
    localStorage.setItem('tds_config', JSON.stringify(newConfig));
    setShowConfig(false); // Fermer la modale
    setStatus({type:'success', msg:'Configuration sauvegardée localement !'});
  };

  const handleOptimize = async () => {
    setLoading(true);
    setStatus({type: 'loading', msg: "🚀 Calcul en cours..."});
    setPlanning([]);

    try {
      // Construction du payload avec la CONFIG ACTUELLE (modifiée)
      const payload = {
        year: Number(year),
        start_day: Number(startDay),
        end_day: Number(endDay),
        config: { ...config, ANNEE: Number(year) } // Force l'année
      };

      console.log("Envoi avec config perso :", payload);

      const response = await axios.post(API_URL, payload);

      if (response.data.status === "Succès") {
        setPlanning(response.data.data);
        setStatus({type: 'success', msg: `✅ Planning généré ! (${response.data.algorithm_status})`});
      } else {
        setStatus({type: 'error', msg: "❌ Toujours pas de solution."});
      }
    } catch (error: any) {
      console.error(error);
      setStatus({type: 'error', msg: `⚠️ Erreur : ${error.message}`});
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* MODALE DE CONFIGURATION */}
      {showConfig && (
        <ConfigPanel 
          config={config} 
          onSave={handleSaveConfig} 
          onClose={() => setShowConfig(false)} 
        />
      )}

      <header>
        <div className="logo">✈️ TDS Manager <span className="badge">v2.1</span></div>
        <button 
          onClick={() => setShowConfig(true)}
          style={{
            background:'white', border:'1px solid #cbd5e1', padding:'8px 16px', borderRadius:'6px', 
            fontWeight:'bold', color:'#475569', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'
          }}
        >
          ⚙️ Configuration
        </button>
      </header>

      <div className="control-panel">
        <div className="input-group">
          <label>Année</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <div className="input-group">
          <label>Jour Début</label>
          <input type="number" value={startDay} onChange={(e) => setStartDay(Number(e.target.value))} />
        </div>
        <div className="input-group">
          <label>Jour Fin</label>
          <input type="number" value={endDay} onChange={(e) => setEndDay(Number(e.target.value))} />
        </div>

        <div style={{flex: 1, display: 'flex', justifyContent: 'flex-end'}}>
          <button className="btn-primary" onClick={handleOptimize} disabled={loading}>
            {loading ? 'Calcul...' : '⚡ LANCER OPTIMISATION'}
          </button>
        </div>
      </div>

      {status.msg && <div className={`status-box status-${status.type}`}>{status.msg}</div>}

      <div className="result-area">
        {planning.length > 0 ? (
          <PlanningTable data={planning} year={year} />
        ) : (
          <div style={{padding: '40px', textAlign: 'center', color: '#ccc'}}>Aucun résultat</div>
        )}
      </div>
    </div>
  );
}

export default App;