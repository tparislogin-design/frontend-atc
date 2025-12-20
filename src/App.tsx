import { useState } from 'react'
import axios from 'axios'
import PlanningTable from './PlanningTable'

// ⚠️ REMPLACE PAR TON URL HUGGING FACE (ex: https://ton-space.hf.space/api/optimize)
const API_URL = "https://ttttty-ty.hf.space/api/optimize";

const DEFAULT_CONFIG = {
  ANNEE: 2025,
  CONTROLEURS: ["GAO", "WBR", "PLC", "CML", "BBD", "LAK", "MZN"],
  CONTROLLERS_AFFECTES_BUREAU: [],
  VACATIONS: { "M": {debut: 6.0, fin: 14.0}, "J1": {debut: 7.0, fin: 16.0}, "S": {debut: 15.0, fin: 23.0} },
  CONTRAT: { MIN_REST_HOURS: 11, MAX_CONSECUTIVE_SHIFTS: 4, BUFFER_DAYS: 2, SOLVER_TIME_LIMIT: 10 }
}

function App() {
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState<any[]>([]);
  const [status, setStatus] = useState("");

  const handleOptimize = async () => {
    setLoading(true);
    setStatus("🚀 Calcul en cours...");
    try {
      const response = await axios.post(API_URL, {
        year: 2025, start_day: 335, end_day: 348, config: DEFAULT_CONFIG
      });
      if (response.data.status === "Succès") {
        setPlanning(response.data.data);
        setStatus("✅ Terminé !");
      } else {
        setStatus("❌ Pas de solution trouvée.");
      }
    } catch (error) {
      console.error(error);
      setStatus("⚠️ Erreur connexion API.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', background: '#f8fafc', minHeight: '100vh' }}>
      <h1>✈️ TDS Manager Cloud</h1>
      <button onClick={handleOptimize} disabled={loading} style={{padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>
        {loading ? '...' : 'Lancer Optimisation'}
      </button>
      <div style={{marginTop: 20}}>{status}</div>
      <div style={{marginTop: 20, background: 'white', padding: 10, borderRadius: 8}}>
        {planning.length > 0 && <PlanningTable data={planning} year={2025} />}
      </div>
    </div>
  )
}
export default App