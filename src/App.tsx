import { useState } from 'react';
import axios from 'axios';
import PlanningTable from './PlanningTable';

// ✅ TON URL HUGGING FACE CONNECTÉE
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
    MIN_REST_HOURS: 11, 
    MAX_CONSECUTIVE_SHIFTS: 4, 
    BUFFER_DAYS: 2, 
    SOLVER_TIME_LIMIT: 10 
  }
};

function App() {
  // --- ÉTAT (Variables) ---
  const [year, setYear] = useState(2025);
  const [startDay, setStartDay] = useState(335);
  const [endDay, setEndDay] = useState(340); // Période courte par défaut
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'error'|'success'|'loading'|'', msg: string}>({type:'', msg:''});
  const [planning, setPlanning] = useState<any[]>([]);

  // --- ACTION ---
  const handleOptimize = async () => {
    setLoading(true);
    setStatus({type: 'loading', msg: "🚀 Connexion au cerveau Hugging Face..."});
    setPlanning([]); // Reset du tableau

    try {
      const payload = {
        year: Number(year),
        start_day: Number(startDay),
        end_day: Number(endDay),
        config: DEFAULT_CONFIG
      };

      console.log("Envoi de la demande :", payload);

      const response = await axios.post(API_URL, payload);

      console.log("Réponse reçue :", response.data);

      if (response.data.status === "Succès") {
        setPlanning(response.data.data);
        setStatus({type: 'success', msg: `✅ Solution trouvée ! (${response.data.algorithm_status})`});
      } else {
        setStatus({type: 'error', msg: "❌ Aucune solution mathématique possible avec ces contraintes."});
      }
    } catch (error: any) {
      console.error(error);
      setStatus({type: 'error', msg: `⚠️ Erreur technique : ${error.message}`});
    } finally {
      setLoading(false);
    }
  };

  // --- RENDU (HTML) ---
  return (
    <div className="app-container">
      
      {/* HEADER */}
      <header>
        <div className="logo">
          ✈️ TDS Manager <span className="badge">CLOUD</span>
        </div>
        <div style={{color: '#16a34a', fontSize: '0.9rem', fontWeight: 'bold'}}>
          ● Système Connecté
        </div>
      </header>

      {/* PANNEAU DE CONTRÔLE */}
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
            {loading ? 'Calcul en cours...' : '⚡ LANCER L\'OPTIMISATION'}
          </button>
        </div>
      </div>

      {/* MESSAGES DE STATUS */}
      {status.msg && (
        <div className={`status-box status-${status.type}`}>
          {status.msg}
        </div>
      )}

      {/* TABLEAU DE RÉSULTAT */}
      <div className="result-area">
        {planning.length > 0 ? (
          <PlanningTable data={planning} year={year} />
        ) : (
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: '#cbd5e1', flexDirection: 'column'}}>
            <div style={{fontSize: '4rem', marginBottom: '20px'}}>📅</div>
            <div>Le planning apparaîtra ici.</div>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;