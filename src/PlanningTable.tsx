import React from 'react';

interface PlanningTableProps {
  data: any[];
  year: number;
  startDay: number;
  endDay: number;
  isDesiderataView: boolean;
  // Nous avons besoin de la liste des vacations possibles pour calculer ce qui manque
  // Si tu ne veux pas passer la config, on peut utiliser une liste en dur ici :
  possibleVacations?: string[]; 
}

const DEFAULT_VACATIONS = ['M', 'J1', 'J2', 'J3', 'S']; // Liste par défaut à adapter selon tes besoins

const PlanningTable: React.FC<PlanningTableProps> = ({ 
  data, 
  year, 
  startDay, 
  endDay, 
  isDesiderataView,
  possibleVacations = DEFAULT_VACATIONS 
}) => {

  // --- 1. GÉNÉRATION DES JOURS ---
  const days = [];
  for (let i = startDay; i <= endDay; i++) {
    // Gestion du chevauchement d'année (si > 365 ou 366)
    // Astuce : On crée une date à partir du 1er Janvier + (i - 1) jours
    const date = new Date(year, 0, i);
    
    days.push({
      index: i, // Le numéro utilisé dans les données (day_1, day_365...)
      obj: date,
      dayNum: date.getDate(),
      month: date.getMonth() + 1,
      weekday: date.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase().replace('.', '').substring(0, 2), // LU, MA...
      dateStr: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) // 01/01
    });
  }

  // --- 2. LOGIQUE DES VACATIONS MANQUANTES ---
  const getMissingShifts = (dayIndex: number) => {
    if (isDesiderataView) return []; // Pas d'alerte en mode désidérata

    // 1. Récupérer toutes les vacations posées ce jour-là par n'importe quel agent
    const assignedShifts = new Set();
    data.forEach(agentRow => {
      // On suppose que la clé dans tes données est 'day_X' ou juste 'X'
      // Adapte 'val' selon la structure exacte renvoyée par ton API
      const val = agentRow[`day_${dayIndex}`] || agentRow[dayIndex]; 
      if (val) assignedShifts.add(val);
    });

    // 2. Vérifier lesquelles manquent
    return possibleVacations.filter(vac => !assignedShifts.has(vac));
  };

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: '0.85rem' }}>
        
        {/* --- HEADER --- */}
        <thead>
          {/* LIGNE 1 : Jours Semaine (LU, MA...) */}
          <tr>
            <th style={{ ...stickyColStyle, borderBottom: 'none' }} rowSpan={4}>CONTRÔLEUR</th>
            {days.map(d => (
              <th key={`wd-${d.index}`} style={headerCellStyle}>
                {d.weekday}
              </th>
            ))}
          </tr>

          {/* LIGNE 2 : Numéro du jour dans l'année (1, 365...) */}
          <tr>
            {days.map(d => (
              <th key={`idx-${d.index}`} style={{ ...headerCellStyle, fontSize: '1.1em', color: '#1e293b' }}>
                {/* On gère l'affichage '365' ou '1' selon l'année */}
                {d.index > 365 ? d.index - 365 : d.index} 
              </th>
            ))}
          </tr>

          {/* LIGNE 3 : La Date (01/01...) */}
          <tr>
            {days.map(d => (
              <th key={`date-${d.index}`} style={{ ...headerCellStyle, color: '#64748b', fontWeight: 'normal', fontSize: '0.75em' }}>
                {d.dateStr}
              </th>
            ))}
          </tr>

          {/* LIGNE 4 : LES ALERTES ROUGES (Vacations manquantes) */}
          <tr style={{ height: 60 }}>
            {days.map(d => {
              const missing = getMissingShifts(d.index);
              return (
                <th key={`alert-${d.index}`} style={{ ...headerCellStyle, borderBottom: '2px solid #cbd5e1', verticalAlign: 'top', paddingTop: 5 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {missing.map(m => (
                      <span key={m} style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.75em' }}>{m}</span>
                    ))}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* --- CORPS DU TABLEAU --- */}
        <tbody>
          {data.map((row, rIdx) => (
            <tr key={rIdx} style={{ backgroundColor: rIdx % 2 === 0 ? 'white' : '#f8fafc' }}>
              {/* Colonne Nom Agent */}
              <td style={{ ...stickyColStyle, fontWeight: 'bold', color: '#334155' }}>
                {row.name || row.agent || "Inconnu"}
              </td>

              {/* Cellules Planning */}
              {days.map(d => {
                const val = row[`day_${d.index}`] || row[d.index] || "";
                return (
                  <td key={d.index} style={cellStyle}>
                    {val && (
                      <span style={{ 
                        ...badgeStyle, 
                        backgroundColor: getBadgeColor(val, isDesiderataView) 
                      }}>
                        {val}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// --- STYLES ET UTILITAIRES ---

const stickyColStyle: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  backgroundColor: 'white',
  zIndex: 10,
  padding: '8px 12px',
  borderRight: '2px solid #e2e8f0',
  borderBottom: '1px solid #e2e8f0',
  textAlign: 'left',
  minWidth: 120
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

// Fonction simple pour colorer les cellules
const getBadgeColor = (val: string, isDesiderata: boolean) => {
    if (isDesiderata) return '#e2e8f0'; // Gris pour les désidératas
    
    // Couleurs spécifiques pour le planning final
    const colors: any = {
        'M': '#dbeafe', // Bleu clair
        'J1': '#dcfce7', // Vert clair
        'S': '#fef9c3', // Jaune clair
        'CA': '#fee2e2', // Rouge (Congés)
        'RH': '#f3f4f6'  // Gris (Repos)
    };
    return colors[val] || '#f1f5f9';
};

export default PlanningTable;