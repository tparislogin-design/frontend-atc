import { useState, useEffect } from 'react';
import axios from 'axios';
import PlanningTable from './PlanningTable';
import ConfigPanel from './ConfigPanel';

// ✅ TON URL HUGGING FACE
const API_URL = "https://ttttty-ty.hf.space/api/optimize"; 

const DEFAULT_CONFIG = {
  ANNEE: 2026,
  CONTROLEURS: ["GAO", "WBR", "PLC", "CML", "BBD", "LAK", "MZN", "TRT", "CLO"],
  CONTROLLERS_AFFECTES_BUREAU: [],
  VACATIONS: { 
    "M": {debut: 6.0, fin: 14.0}, 
    "J1": {debut: 7.0, fin: 16.0}, 
    "S": {debut: 15.0, fin: 23.0} 
  },
  CONTRAT: { 
    MIN_REST_HOURS: 8,
    MAX_CONSECUTIVE_SHIFTS: 5, 
    BUFFER_DAYS: 2, 
    SOLVER_TIME_LIMIT: 10,
    // --- NOUVEAUTÉS ---
    MAX_HOURS_WEEK_CALENDAR: 36,
    MAX_HOURS_7_ROLLING: 44,
    REQUIRE_2_CONSECUTIVE_REST_DAYS: true
  }
};

function App() {
  // --- ÉTAT (STATE) ---
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  
  const [year, setYear] = useState(2026);
  const [startDay, setStartDay] = useState(1);
  const [endDay, setEndDay] = useState(28);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{type: 'error'|'success'|'loading'|'', msg: string}>({type:'', msg:''});
  const [planning, setPlanning] = useState<any[]>([]);

  // 1. Chargement de la config sauvegardée au démarrage
  useEffect(() => {
    const savedConfig = localStorage.getItem('tds_config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (e) {
        console.error("Erreur lecture config locale", e);
      }
    }
  }, []);

  // 2. Fonction pour sauvegarder la config depuis le panneau
  const handleSaveConfig = (newConfig: any) => {
    setConfig(newConfig);
    localStorage.setItem('tds_config', JSON.stringify(newConfig));
    setShowConfig(false);
    setStatus({type:'success', msg:'✅ Configuration sauvegardée localement ! Relancez le calcul.'});
  };

  // 3. Fonction principale : Lancer le calcul
  const handleOptimize = async () => {
    setLoading(true);
    setStatus({type: 'loading', msg: "🚀 Envoi des données au cerveau IA (Hugging Face)..."});
    setPlanning([]); // On vide le tableau avant de commencer

    try {
      // Préparation du paquet à envoyer
      const payload = {
        year: Number(year),
        start_day: Number(startDay),
        end_day: Number(endDay),
        // On fusionne la config utilisateur avec l'année sélectionnée
        config: { ...config, ANNEE: Number(year) } 
      };

      console.log("📤 Envoi au backend :", payload);

      // Appel API
      const response = await axios.post(API_URL, payload);

      console.log("📥 Réponse reçue :", response.data);

      // --- VERIFICATION ROBUSTE ---
      // On vérifie si "data" existe et si c'est une liste non vide.
      // On ignore le message textuel "status" qui peut varier.
      const hasData = response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0;

      if (hasData) {
        setPlanning(response.data.data);
        setStatus({
            type: 'success', 
            msg: `✅ Planning généré avec succès ! (${response.data.data.length} lignes récupérées)`
        });
      } else {
        // Le backend a répondu, mais sans données (Infeasible)
        console.warn("Réponse vide du backend");
        setStatus({
            type: 'error', 
            msg: "❌ Le moteur a répondu, mais n'a trouvé aucune solution mathématique. Essayez d'assouplir les règles (Config)."
        });
      }

    } catch (error: any) {
      console.error("ERREUR API :", error);
      setStatus({type: 'error', msg: `⚠️ Erreur de connexion : ${error.message}`});
    } finally {
      setLoading(false);
    }
  };

  // --- RENDU VISUEL ---
  return (
    <div className="app-container">
      
      {/* MODALE CONFIGURATION */}
      {showConfig && (
        <ConfigPanel 
          config={config} 
          onSave={handleSaveConfig} 
          onClose={() => setShowConfig(false)} 
        />
      )}

      {/* HEADER */}
      <header>
        <div className="logo">
          ✈️ TDS Manager <span className="badge">CLOUD v2</span>
        </div>
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

      {/* BARRE DE PILOTAGE */}
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

      {/* ZONE DE MESSAGES */}
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
            <div style={{fontSize: '0.8rem', marginTop: '10px'}}>(Assurez-vous que le backend Hugging Face est réveillé)</div>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;