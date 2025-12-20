import React, { useState, useEffect } from 'react';
import { decimalToTime, timeToDecimal } from './utils';

interface ConfigPanelProps {
  config: any;
  onSave: (newConfig: any) => void;
  onClose: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onSave, onClose }) => {
  // On crée une copie locale pour l'édition sans casser l'app principale
  const [localConfig, setLocalConfig] = useState<any>(JSON.parse(JSON.stringify(config)));
  const [activeTab, setActiveTab] = useState<'agents' | 'horaires' | 'regles'>('agents');

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

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2>⚙️ Configuration</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* NAVIGATION ONGLETS */}
        <div style={tabContainerStyle}>
          <button style={activeTab === 'agents' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('agents')}>👥 Contrôleurs</button>
          <button style={activeTab === 'horaires' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('horaires')}>🕒 Horaires</button>
          <button style={activeTab === 'regles' ? activeTabStyle : tabStyle} onClick={() => setActiveTab('regles')}>⚖️ Règles</button>
        </div>

        <div style={contentStyle}>
          
          {/* ONGLET AGENTS */}
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
                    <button onClick={() => handleRemoveAgent(idx)} style={deleteBtnStyle}>🗑️</button>
                  </div>
                ))}
              </div>
              <button onClick={handleAddAgent} style={addBtnStyle}>+ Ajouter un agent</button>
            </div>
          )}

          {/* ONGLET HORAIRES */}
          {activeTab === 'horaires' && (
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left'}}>Vacation</th>
                  <th>Début</th>
                  <th>Fin</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(localConfig.VACATIONS).map(([code, times]: [string, any]) => (
                  <tr key={code} style={{borderBottom:'1px solid #eee'}}>
                    <td style={{fontWeight:'bold', padding:'10px'}}>{code}</td>
                    <td>
                      <input 
                        type="time" 
                        value={decimalToTime(times.debut)} 
                        onChange={(e) => handleTimeChange(code, 'debut', e.target.value)}
                        style={inputStyle}
                      />
                    </td>
                    <td>
                      <input 
                        type="time" 
                        value={decimalToTime(times.fin)} 
                        onChange={(e) => handleTimeChange(code, 'fin', e.target.value)}
                        style={inputStyle}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ONGLET RÈGLES */}
          {activeTab === 'regles' && (
            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
              <label>
                <strong>Repos Minimum (Heures)</strong>
                <input 
                  type="number" 
                  value={localConfig.CONTRAT.MIN_REST_HOURS}
                  onChange={(e) => setLocalConfig({...localConfig, CONTRAT: {...localConfig.CONTRAT, MIN_REST_HOURS: parseInt(e.target.value)}})}
                  style={{...inputStyle, display:'block', marginTop:'5px'}}
                />
              </label>
              <label>
                <strong>Max Jours Consécutifs</strong>
                <input 
                  type="number" 
                  value={localConfig.CONTRAT.MAX_CONSECUTIVE_SHIFTS}
                  onChange={(e) => setLocalConfig({...localConfig, CONTRAT: {...localConfig.CONTRAT, MAX_CONSECUTIVE_SHIFTS: parseInt(e.target.value)}})}
                  style={{...inputStyle, display:'block', marginTop:'5px'}}
                />
              </label>
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

// STYLES CSS-IN-JS RAPIDES
const overlayStyle: React.CSSProperties = { position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', justifyContent:'center', alignItems:'center' };
const modalStyle: React.CSSProperties = { backgroundColor:'white', width:'600px', maxHeight:'80vh', borderRadius:'12px', display:'flex', flexDirection:'column', boxShadow:'0 10px 25px rgba(0,0,0,0.2)' };
const headerStyle: React.CSSProperties = { padding:'20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' };
const contentStyle: React.CSSProperties = { padding:'20px', overflowY:'auto' };
const footerStyle: React.CSSProperties = { padding:'20px', borderTop:'1px solid #eee', textAlign:'right' };
const tabContainerStyle: React.CSSProperties = { display:'flex', borderBottom:'1px solid #eee' };
const tabStyle: React.CSSProperties = { flex:1, padding:'15px', border:'none', background:'none', cursor:'pointer', fontWeight:600, color:'#64748b' };
const activeTabStyle: React.CSSProperties = { ...tabStyle, color:'#2563eb', borderBottom:'2px solid #2563eb' };
const inputStyle: React.CSSProperties = { padding:'8px', borderRadius:'6px', border:'1px solid #ccc', width:'100%' };
const closeBtnStyle: React.CSSProperties = { background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer' };
const addBtnStyle: React.CSSProperties = { marginTop:'15px', padding:'8px 15px', backgroundColor:'#f0f9ff', color:'#0284c7', border:'1px dashed #0284c7', borderRadius:'6px', cursor:'pointer', width:'100%' };
const deleteBtnStyle: React.CSSProperties = { background:'none', border:'none', cursor:'pointer' };
const saveBtnStyle: React.CSSProperties = { padding:'10px 20px', backgroundColor:'#2563eb', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'bold' };

export default ConfigPanel;