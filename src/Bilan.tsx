import React, { useMemo } from 'react';

interface BilanProps {
  planning: any[];
  config: any;
}

const Bilan: React.FC<BilanProps> = ({ planning, config }) => {

  // --- CALCUL DES STATISTIQUES ---
  const stats = useMemo(() => {
    if (!planning || planning.length === 0) return [];

    return planning.map(row => {
      let totalHours = 0;
      const counts: any = { M: 0, J: 0, A: 0, S: 0, C: 0, OFF: 0, AUTRE: 0 };

      // On parcourt toutes les clés (les jours sont des chiffres sous forme de string)
      Object.keys(row).forEach(key => {
        if (key === 'Agent') return; // On ignore la colonne Agent
        
        const code = row[key];
        if (!code) return;

        // 1. Comptage des Types
        if (code === 'M') counts.M++;
        else if (['J1', 'J2', 'J3'].includes(code)) counts.J++;
        else if (['A1', 'A2'].includes(code)) counts.A++;
        else if (code === 'S') counts.S++;
        else if (code === 'C') counts.C++;
        else if (code === 'OFF') counts.OFF++;
        else counts.AUTRE++;

        // 2. Calcul des Heures (via config.VACATIONS)
        // On cherche si le code existe dans la config (ex: "M", "J1")
        const vacationParams = config.VACATIONS[code];
        if (vacationParams) {
            const duree = vacationParams.fin - vacationParams.debut;
            totalHours += duree;
        } else {
            // Cas particuliers groupés (A1, A2...) s'ils ne sont pas explicitement dans config.VACATIONS
            // Pour l'exemple, on met des valeurs par défaut si non trouvé
            if (code.startsWith('A')) totalHours += 7.5; // Moyenne pour A1/A2
        }
      });

      return {
        agent: row.Agent,
        hours: totalHours,
        counts
      };
    }).sort((a, b) => b.hours - a.hours); // Tri par heures décroissantes
  }, [planning, config]);

  // --- RENDER SI VIDE ---
  if (!planning || planning.length === 0) {
      return (
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#64748b'}}>
              <div style={{fontSize: 40, marginBottom: 20}}>📊</div>
              <h3 style={{margin:0}}>Aucune donnée à analyser</h3>
              <p>Veuillez générer un planning pour voir le bilan.</p>
          </div>
      );
  }

  // --- RENDER TABLEAU ---
  return (
    <div style={{padding: 30, maxWidth: 1000, margin: '0 auto', height:'100%', overflowY:'auto'}}>
        <div style={{marginBottom: 20, borderBottom:'1px solid #e2e8f0', paddingBottom:10}}>
            <h2 style={{margin:0, color:'#1e293b'}}>📊 Bilan & Statistiques</h2>
            <p style={{margin:'5px 0 0 0', fontSize:13, color:'#64748b'}}>Analyse des heures et de la répartition des tours sur la période.</p>
        </div>

        <table style={{width:'100%', borderCollapse:'collapse', background:'white', borderRadius:8, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.1)'}}>
            <thead style={{background:'#f8fafc', borderBottom:'2px solid #e2e8f0'}}>
                <tr>
                    <th style={thStyle}>Agent</th>
                    <th style={thStyle}>Total Heures</th>
                    <th style={{...thStyle, width: 200}}>Visualisation</th>
                    <th style={{...thStyle, color:'#2563eb'}}>Matin</th>
                    <th style={{...thStyle, color:'#16a34a'}}>Jour</th>
                    <th style={{...thStyle, color:'#d97706'}}>Après-Midi</th>
                    <th style={{...thStyle, color:'#9333ea'}}>Soir</th>
                    <th style={{...thStyle, color:'#db2777'}}>Congés</th>
                </tr>
            </thead>
            <tbody>
                {stats.map((stat, idx) => (
                    <tr key={stat.agent} style={{borderBottom: '1px solid #f1f5f9', background: idx%2===0 ? 'white':'#fcfcfc'}}>
                        <td style={{...tdStyle, fontWeight:'bold', color:'#334155'}}>{stat.agent}</td>
                        <td style={{...tdStyle, fontWeight:'bold'}}>{stat.hours.toFixed(1)} h</td>
                        <td style={tdStyle}>
                            <div style={{width:'100%', height:6, background:'#e2e8f0', borderRadius:3, overflow:'hidden'}}>
                                <div style={{width: `${Math.min(100, (stat.hours / 160) * 100)}%`, height:'100%', background: stat.hours > 150 ? '#ef4444' : '#3b82f6'}}></div>
                            </div>
                        </td>
                        <td style={tdStyle}><Badge count={stat.counts.M} color="#eff6ff" txt="#1e40af" /></td>
                        <td style={tdStyle}><Badge count={stat.counts.J} color="#f0fdf4" txt="#166534" /></td>
                        <td style={tdStyle}><Badge count={stat.counts.A} color="#fff7ed" txt="#9a3412" /></td>
                        <td style={tdStyle}><Badge count={stat.counts.S} color="#faf5ff" txt="#6b21a8" /></td>
                        <td style={tdStyle}><span style={{color:'#db2777', fontWeight:'bold'}}>{stat.counts.C}</span></td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
};

// Petits composants de style
const Badge = ({count, color, txt}: any) => (
    <div style={{background: color, color: txt, padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:'bold', display:'inline-block', minWidth:20, textAlign:'center'}}>
        {count}
    </div>
);

const thStyle: React.CSSProperties = {
    textAlign: 'left', padding: '12px 15px', fontSize: 12, textTransform: 'uppercase', color: '#64748b'
};

const tdStyle: React.CSSProperties = {
    padding: '10px 15px', fontSize: 13, color: '#475569'
};

export default Bilan;