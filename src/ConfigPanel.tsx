import React, { useState } from 'react';
import { decimalToTime, timeToDecimal } from './utils/utils';

interface ConfigPanelProps {
  config: any;
  onSave: (newConfig: any) => void;
  onClose: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onSave, onClose }) => {
  const [localConfig, setLocalConfig] = useState<any>(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<'agents' | 'horaires' | 'regles'>('horaires'); // On commence sur horaires pour tester

  // Etats pour le formulaire d'ajout de vacation
  const [newVacCode, setNewVacCode] = useState("");
  const [newVacStart, setNewVacStart] = useState("08:00");
  const [newVacEnd, setNewVacEnd] = useState("17:00");

  // --- GESTION AGENTS ---
  const handleAddAgent = () => {
    setLocalConfig({ ...localConfig, CONTROLEURS: [...localConfig.CONTROLEURS, "NOUVEAU"] });
  };

  const handleRemoveAgent = (index: number) => {
    const newAgents = [...localConfig.CONTROLEURS];
    newAgents.splice(index, 1);
    setLocalConfig({ ...localConfig, CONTROLEURS: newAgents });
  };

  const handleEditAgent = (index: number, value: string) => {
    const newAgents = [...localConfig.CONTROLEURS];
    newAgents[index] = value;
    setLocalConfig({ ...localConfig, CONTROLEURS: newAgents });
  };

  // --- GESTION HORAIRES ---
  const handleTimeChange = (code: string, field: 'debut' | 'fin', value: string) => {
    setLocalConfig({
      ...localConfig,
      VACATIONS: {
        ...localConfig.VACATIONS,
        [code]: {
          ...localConfig.VACATIONS[code],
          [field]: timeToDecimal(value)
        }
      }
    });
  };

  const handleDeleteVacation = (code: string) => {
    if (window.confirm(`Supprimer la vacation "${code}" ?`)) {
        const newVacs = { ...localConfig.VACATIONS };
        delete newVacs[code];
        setLocalConfig({ ...localConfig, VACATIONS: newVacs });
    }
  };

  const handleAddVacation = () => {
    if (!newVacCode.trim()) return;
    if (localConfig.VACATIONS[newVacCode.toUpperCase()]) {
        alert("Ce code existe déjà !");
        return;
    }

    setLocalConfig({
        ...localConfig,
        VACATIONS: {
            ...localConfig.VACATIONS,
            [newVacCode.toUpperCase()]: {
                debut: timeToDecimal(newVacStart),
                fin: timeToDecimal(newVacEnd)
            }
        }
    });
    // Reset du formulaire
    setNewVacCode("");
  };

  // Tri des vacations par heure de début pour l'affichage
  const sortedVacations = Object.entries(localConfig.VACATIONS).sort(([, a]: any, [, b]: any) => a.debut - b.debut);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        
        {/* HEADER */}
        <div style={headerStyle}>
          <h2 style={{margin:0, color:'#1e293b'}}>⚙️ Configuration</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* NAVIGATION ONGLETS */}
        <div style={tabContainerStyle}>
          <button style={activeTab === 'horaires' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('horaires')}>🕒 Horaires</button>
          <button style={activeTab === 'agents' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('agents')}>👥 Contrôleurs</button>
          <button style={activeTab === 'regles' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('regles')}>⚖️ Règles RH</button>
        </div>

        <div style={contentStyle}>
          
          {/* ONGLET 1: HORAIRES (Amélioré) */}
          {activeTab === 'horaires' && (
            <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
              <p style={{fontSize:'0.9em', color:'#64748b', margin:0}}>
                Définissez les codes utilisés dans le planning (M, S, J1...). <br/>
                <em>Note : Les codes inconnus du fichier importé seront traités comme des STAGES.</em>
              </p>

              {/* LISTE DES VACATIONS EXISTANTES */}
              <div style={{border:'1px solid #e2e8f0', borderRadius:'8px', overflow:'hidden'}}>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead style={{background:'#f8fafc', fontSize:'0.85rem', color:'#64748b'}}>
                        <tr>
                            <th style={{padding:'10px', textAlign:'left'}}>Code</th>
                            <th style={{padding:'10px', textAlign:'left'}}>Début</th>
                            <th style={{padding:'10px', textAlign:'left'}}>Fin</th>
                            <th style={{padding:'10px', width:'40px'}}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedVacations.map(([code, times]: [string, any]) => (
                            <tr key={code} style={{borderTop:'1px solid #f1f5f9'}}>
                                <td style={{padding:'10px', fontWeight:'bold', color:'#2563eb'}}>{code}</td>
                                <td style={{padding:'10px'}}>
                                    <input type="time" value={decimalToTime(times.debut)} 
                                        onChange={(e) => handleTimeChange(code, 'debut', e.target.value)}
                                        style={timeInputStyle} />
                                </td>
                                <td style={{padding:'10px'}}>
                                    <input type="time" value={decimalToTime(times.fin)} 
                                        onChange={(e) => handleTimeChange(code, 'fin', e.target.value)}
                                        style={timeInputStyle} />
                                </td>
                                <td style={{padding:'10px', textAlign:'center'}}>
                                    <button onClick={() => handleDeleteVacation(code)} style={trashBtnStyle} title="Supprimer">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>

              {/* FORMULAIRE D'AJOUT */}
              <div style={{background:'#f0fdf4', padding:'15px', borderRadius:'8px', border:'1px solid #bbf7d0', display:'flex', gap:'10px', alignItems:'flex-end'}}>
                <div style={{flex:1}}>
                    <label style={miniLabelStyle}>Nouveau Code</label>
                    <input type="text" placeholder="Ex: J2" value={newVacCode} onChange={e => setNewVacCode(e.target.value)} style={{...inputStyle, textTransform:'uppercase'}} />
                </div>
                <div style={{width:'100px'}}>
                    <label style={miniLabelStyle}>Début</label>
                    <input type="time" value={newVacStart} onChange={e => setNewVacStart(e.target.value)} style={inputStyle} />
                </div>
                <div style={{width:'100px'}}>
                    <label style={miniLabelStyle}>Fin</label>
                    <input type="time" value={newVacEnd} onChange={e => setNewVacEnd(e.target.value)} style={inputStyle} />
                </div>
                <button onClick={handleAddVacation} style={addVacBtnStyle}>Ajouter</button>
              </div>

            </div>
          )}

          {/* ONGLET 2: AGENTS */}
          {activeTab === 'agents' && (
            <div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px'}}>
                {localConfig.CONTROLEURS.map((agent: string, idx: number) => (
                  <div key={idx} style={{display:'flex', gap:'5px'}}>
                    <input 
                      type="text" 
                      value={agent} 
                      onChange={(e) => handleEditAgent(idx, e.target.value)}
                      style={inputStyle}
                    />
                    <button onClick={() => handleRemoveAgent(idx)} style={deleteBtnStyle}>✕</button>
                  </div>
                ))}
              </div>
              <button onClick={handleAddAgent} style={addBtnStyle}>+ Ajouter un agent</button>
            </div>
          )}

          {/* ONGLET 3: RÈGLES */}
          {activeTab === 'regles' && (
            <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
              
              <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>⏳ Temps de Travail</h4>
                <label style={labelStyle}>
                  Max Heures / Semaine Calendaire (Lun-Dim)
                  <input type="number" 
                    value={localConfig.CONTRAT.MAX_HOURS_WEEK_CALENDAR || 36}
                    onChange={(e) => setLocalConfig({...localConfig, CONTRAT: {...localConfig.CONTRAT, MAX_HOURS_WEEK_CALENDAR: parseInt(e.target.value)}})}
                    style={inputStyle}
                  />
                </label>
                <label style={labelStyle}>
                  Max Heures / 7 Jours Glissants
                  <input type="number" 
                    value={localConfig.CONTRAT.MAX_HOURS_7_ROLLING || 44}
                    onChange={(e) => setLocalConfig({...localConfig, CONTRAT: {...localConfig.CONTRAT, MAX_HOURS_7_ROLLING: parseInt(e.target.value)}})}
                    style={inputStyle}
                  />
                </label>
              </div>

              <div style={sectionStyle}>
                <h4 style={sectionTitleStyle}>💤 Repos & Cycles</h4>
                <label style={{...labelStyle, flexDirection:'row', alignItems:'center', gap:'10px', cursor:'pointer'}}>
                  <input type="checkbox" 
                    checked={localConfig.CONTRAT.REQUIRE_2_CONSECUTIVE_REST_DAYS !== false}
                    onChange={(e) => setLocalConfig({...localConfig, CONTRAT: {...localConfig.CONTRAT, REQUIRE_2_CONSECUTIVE_REST_DAYS: e.target.checked}})}
                    style={{width:'20px', height:'20px'}}
                  />
                  <span>Imposer <strong>2 jours de repos CONSÉCUTIFS</strong> (sur 7j glissants)</span>
                </label>
                
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginTop:'10px'}}>
                  <label style={labelStyle}>
                    Repos Quotidien Min (Heures)
                    <input type="number" value={localConfig.CONTRAT.MIN_REST_HOURS} onChange={(e) => setLocalConfig({...localConfig, CONTRAT: {...localConfig.CONTRAT, MIN_REST_HOURS: parseInt(e.target.value)}})} style={inputStyle}/>
                  </label>
                  <label style={labelStyle}>
                    Max Jours Consécutifs
                    <input type="number" value={localConfig.CONTRAT.MAX_CONSECUTIVE_SHIFTS} onChange={(e) => setLocalConfig({...localConfig, CONTRAT: {...localConfig.CONTRAT, MAX_CONSECUTIVE_SHIFTS: parseInt(e.target.value)}})} style={inputStyle}/>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <button onClick={() => onSave(localConfig)} style={saveBtnStyle}>💾 Sauvegarder & Appliquer</button>
        </div>
      </div>
    </div>
  );
};

// --- STYLES CSS-IN-JS OPTIMISÉS ---
const overlayStyle: React.CSSProperties = { position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex:1000, display:'flex', justifyContent:'center', alignItems:'center' };
const modalStyle: React.CSSProperties = { backgroundColor:'white', width:'650px', maxHeight:'85vh', borderRadius:'16px', display:'flex', flexDirection:'column', boxShadow:'0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' };
const headerStyle: React.CSSProperties = { padding:'20px 25px', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' };
const contentStyle: React.CSSProperties = { padding:'25px', overflowY:'auto' };
const footerStyle: React.CSSProperties = { padding:'20px 25px', borderTop:'1px solid #e2e8f0', textAlign:'right', backgroundColor:'#f8fafc', borderBottomLeftRadius:'16px', borderBottomRightRadius:'16px' };

const tabContainerStyle: React.CSSProperties = { display:'flex', borderBottom:'1px solid #e2e8f0', padding:'0 25px' };
const tabStyle: React.CSSProperties = { flex:1, padding:'15px 0', border:'none', background:'none', cursor:'pointer', fontWeight:600, color:'#64748b', borderBottom:'3px solid transparent', transition: 'all 0.2s' };
const activeTabStyle: React.CSSProperties = { ...tabStyle, color:'#2563eb', borderBottom:'3px solid #2563eb' };

const sectionStyle: React.CSSProperties = { border:'1px solid #e2e8f0', borderRadius:'8px', padding:'15px', backgroundColor:'#f8fafc' };
const sectionTitleStyle: React.CSSProperties = { margin:'0 0 15px 0', color:'#334155', fontSize:'0.95rem', textTransform:'uppercase', letterSpacing:'0.05em' };
const labelStyle: React.CSSProperties = { display:'flex', flexDirection:'column', gap:'5px', fontSize:'0.9rem', color:'#475569', fontWeight:500, marginBottom:'10px' };
const miniLabelStyle: React.CSSProperties = { fontSize:'0.75rem', fontWeight:'bold', color:'#166534', marginBottom:'2px', display:'block' };

const inputStyle: React.CSSProperties = { padding:'10px', borderRadius:'6px', border:'1px solid #cbd5e1', width:'100%', fontSize:'0.95rem' };
const timeInputStyle: React.CSSProperties = { padding:'6px', borderRadius:'4px', border:'1px solid #cbd5e1', width:'100%', fontFamily:'monospace' };

const closeBtnStyle: React.CSSProperties = { background:'none', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#94a3b8' };
const addBtnStyle: React.CSSProperties = { marginTop:'15px', padding:'10px 15px', backgroundColor:'#eff6ff', color:'#2563eb', border:'1px dashed #2563eb', borderRadius:'8px', cursor:'pointer', width:'100%', fontWeight:600 };
const deleteBtnStyle: React.CSSProperties = { background:'none', border:'none', cursor:'pointer', fontSize:'1.1rem', opacity:0.6, color:'#ef4444' };
const trashBtnStyle: React.CSSProperties = { background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', opacity:0.7 };
const saveBtnStyle: React.CSSProperties = { padding:'12px 24px', backgroundColor:'#2563eb', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', fontSize:'1rem', boxShadow:'0 4px 6px -1px rgba(37, 99, 235, 0.2)' };
const addVacBtnStyle: React.CSSProperties = { padding:'10px 15px', backgroundColor:'#16a34a', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold', height:'40px' };

export default ConfigPanel;