import React from 'react';

// --- INTERFACES ---
interface DayInfo {
  index: number;
  obj: Date;
  dayNum: number;
  month: number;
  weekday: string;
  dateStr: string;
}

interface PlanningTableProps {
  data: any[];
  year: number;
  startDay: number;
  endDay: number;
  isDesiderataView: boolean;
  possibleVacations?: string[]; 
}

const DEFAULT_VACATIONS = ['M', 'J1', 'J2', 'J3', 'S'];

const PlanningTable: React.FC<PlanningTableProps> = ({ 
  data, 
  year, 
  startDay, 
  endDay, 
  isDesiderataView,
  possibleVacations = DEFAULT_VACATIONS 
}) => {

  // 1. GÉNÉRATION DES JOURS
  const days: DayInfo[] = [];
  for (let i = startDay; i <= endDay; i++) {
    const date = new Date(year, 0, i);
    days.push({
      index: i,
      obj: date,
      dayNum: date.getDate(),
      month: date.getMonth() + 1,
      weekday: date.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase().replace('.', '').substring(0, 2),
      dateStr: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    });
  }

  // 2. LOGIQUE DES VACATIONS MANQUANTES (En-tête)
  const getMissingShifts = (dayIndex: number) => {
    if (isDesiderataView) return [];
    const assignedShifts = new Set();
    data.forEach(agentRow => {
      const val = agentRow[`day_${dayIndex}`] || agentRow[dayIndex]; 
      if (val) assignedShifts.add(val);
    });
    return possibleVacations.filter(vac => !assignedShifts.has(vac));
  };

  // 3. (NOUVEAU) CALCUL DES STATS AGENT
  const getAgentStats = (row: any) => {
    let count = 0;
    days.forEach(d => {
      const val = row[`day_${d.index}`] || row[d.index];
      // On compte si la case n'est pas vide et n'est pas un repos (RH)
      if (val && val !== 'RH' && val !== 'CA') {
        count++;
      }
    });
    return count;
  };

  // 4. (NOUVEAU) DÉTECTION DU STATUS (Pastille)
  // À adapter selon ta logique (ex: si l'agent a fait une demande spécifique)
  const getAgentStatusColor = (row: any) => {
    // Exemple fictif pour reproduire ton image :
    // Si l'objet row contient une propriété 'hasRequest', on met du bleu.
    // Si 'hasConflict', on met du rouge.
    if (row.name === 'WBR' || row.name === 'PLC' || row.name === 'FRD') return '#3b82f6'; // Bleu
    if (row.name === 'GNC') return '#ef4444'; // Rouge
    return null; // Pas de pastille
  };

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background:'white' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: '0.85rem' }}>
        
        {/* --- HEADER (Identique à la version précédente) --- */}
        <thead>
          <tr>
            <th style={{ ...stickyColStyle, borderBottom: 'none', zIndex: 20 }} rowSpan={4}>CONTRÔLEUR</th>
            {days.map(d => <th key={`wd-${d.index}`} style={headerCellStyle}>{d.weekday}</th>)}
          </tr>
          <tr>
            {days.map(d => <th key={`idx-${d.index}`} style={{ ...headerCellStyle, fontSize: '1.1em', color: '#1e293b' }}>{d.index > 365 ? d.index - 365 : d.index}</th>)}
          </tr>
          <tr>
            {days.map(d => <th key={`date-${d.index}`} style={{ ...headerCellStyle, color: '#64748b', fontWeight: 'normal', fontSize: '0.75em' }}>{d.dateStr}</th>)}
          </tr>
          <tr style={{ height: 60 }}>
            {days.map(d => {
              const missing = getMissingShifts(d.index);
              return (
                <th key={`alert-${d.index}`} style={{ ...headerCellStyle, borderBottom: '2px solid #cbd5e1', verticalAlign: 'top', paddingTop: 5 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {missing.map(m => <span key={m} style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.75em' }}>{m}</span>)}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* --- BODY --- */}
        <tbody>
          {data.map((row, rIdx) => {
            const shiftCount = getAgentStats(row);
            const totalDays = days.length;
            const dotColor = getAgentStatusColor(row);

            return (
              <tr key={rIdx} style={{ backgroundColor: rIdx % 2 === 0 ? 'white' : '#f8fafc' }}>
                
                {/* --- COLONNE AGENT MODIFIÉE --- */}
                <td style={stickyColStyle}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                    
                    {/* Nom + Compteur */}
                    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}>
                        <span style={{fontWeight: '700', color: '#1e293b', fontSize:'0.9rem'}}>
                            {row.name || row.agent || "Inconnu"}
                        </span>
                        <span style={{color: '#2563eb', fontSize: '0.75rem', fontWeight:'600', marginTop:'2px'}}>
                            {shiftCount} / {totalDays}
                        </span>
                    </div>

                    {/* Pastille (Dot) */}
                    {dotColor && (
                        <div style={{
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            backgroundColor: dotColor,
                            boxShadow: '0 0 0 2px white' // Petit contour blanc pour détacher
                        }}></div>
                    )}
                  </div>
                </td>

                {/* Reste des cellules planning */}
                {days.map(d => {
                  const val = row[`day_${d.index}`] || row[d.index] || "";
                  return (
                    <td key={d.index} style={cellStyle}>
                      {val && (
                        <span style={{ ...badgeStyle, backgroundColor: getBadgeColor(val, isDesiderataView) }}>
                          {val}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// --- STYLES ---

const stickyColStyle: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  backgroundColor: 'white',
  zIndex: 10,
  padding: '8px 12px',
  borderRight: '2px solid #e2e8f0', // Bordure plus épaisse à droite de la colonne fixe
  borderBottom: '1px solid #f1f5f9',
  textAlign: 'left',
  minWidth: 140, // Un peu plus large pour contenir nom + dot
  boxShadow: '2px 0 5px rgba(0,0,0,0.02)' // Légère ombre pour l'effet de superposition
};

const headerCellStyle: React.CSSProperties = {
  padding: '4px',
  textAlign: 'center',
  borderRight: '1px solid #f1f5f9',
  backgroundColor: '#f8fafc',
  minWidth: 45,
  color: '#94a3b8',
  fontWeight: 'bold'
};

const cellStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '6px',
  borderRight: '1px solid #f1f5f9',
  borderBottom: '1px solid #f1f5f9'
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 8px',
  borderRadius: 4,
  fontSize: '0.85em',
  fontWeight: 'bold',
  minWidth: 20
};

const getBadgeColor = (val: string, isDesiderata: boolean) => {
    if (isDesiderata) return '#e2e8f0'; 
    const colors: any = {
        'M': '#dbeafe', 
        'J1': '#dcfce7', 
        'S': '#fef9c3', 
        'CA': '#fee2e2', 
        'RH': '#f3f4f6'  
    };
    return colors[val] || '#f1f5f9';
};

export default PlanningTable;