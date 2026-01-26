// ... imports existants

function App() {
  // ... états existants
  const [softConstraints, setSoftConstraints] = useState<Set<string>>(new Set());
  
  // NOUVEL ÉTAT : Masquer les OFF
  const [hideOff, setHideOff] = useState(false);

  // ... (reste du code)

  return (
    // ...
    // DANS LE HEADER, section activeTab === 'planning'
    
    {activeTab === 'planning' && (
        <div style={{display:'flex', gap: 5}}>
            <button
                onClick={() => setShowDesiderataMatch(!showDesiderataMatch)}
                style={{
                    background: showDesiderataMatch ? '#e0f2fe' : 'transparent',
                    color: showDesiderataMatch ? '#0284c7' : '#64748b',
                    border: showDesiderataMatch ? '1px solid #7dd3fc' : '1px solid #e2e8f0',
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    display:'flex', alignItems:'center', gap:5
                }}
            >
                {showDesiderataMatch ? '👁️ Masquer Demandes' : '👁️ Voir Demandes'}
            </button>

            {/* --- NOUVEAU BOUTON : MASQUER OFF --- */}
            <button
                onClick={() => setHideOff(!hideOff)}
                style={{
                    background: hideOff ? '#f1f5f9' : 'transparent',
                    color: hideOff ? '#334155' : '#64748b',
                    border: hideOff ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                    padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    display:'flex', alignItems:'center', gap:5
                }}
                title="Masquer les cases OFF pour alléger la vue"
            >
                {hideOff ? '👻 Voir OFF' : '👻 Masquer OFF'}
            </button>
        </div>
    )}
    
    // ...
    
    // DANS L'APPEL DU COMPOSANT PlanningTable (plus bas)
    {(activeTab === 'planning' || activeTab === 'desiderata') && (
       <PlanningTable 
            // ... autres props
            hideOff={hideOff} // <--- ON PASSE LA PROP ICI
        />
    )}