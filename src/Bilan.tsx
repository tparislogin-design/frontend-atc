import React, { useMemo, useState } from 'react';

interface BilanProps {
  planning: any[];
  config: any;
  year: number;
  startDay: number;
  endDay: number;
}

// Utilitaire pour avoir le numéro de semaine
const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const Bilan: React.FC<BilanProps> = ({ planning, config, year, startDay, endDay }) => {
  const [sortByHours, setSortByHours] = useState(false);

  // 1. Liste des types de vacations (pour les colonnes dynamiques)
  const shiftTypes = useMemo(() => Object.keys(config.VACATIONS).sort(), [config]);

  // 2. Calculer la liste des jours (identique à PlanningTable pour la cohérence)
  const daysRange = useMemo(() => {
    const range: {dayNum: number, date: Date, isWeekend: boolean, weekKey: string}[] = [];
    const list = [];
    
    if (startDay <= endDay) {
        for (let i = startDay; i <= endDay; i++) list.push(i);
    } else {
        for (let i = startDay; i <= 365; i++) list.push(i);
        for (let i = 1; i <= endDay; i++) list.push(i);
    }

    list.forEach(dayNum => {
        let currentYear = year;
        if (startDay > endDay && dayNum >= startDay) currentYear = year - 1;
        
        const d = new Date(currentYear, 0, dayNum);
        const weekNum = getWeekNumber(d);
        // Clé unique pour la semaine (ex: "2026-W05")
        const weekKey = `${currentYear}-W${weekNum.toString().padStart(2, '0')}`;
        
        range.push({
            dayNum,
            date: d,
            isWeekend: d.getDay() === 0 || d.getDay() === 6,
            weekKey
        });
    });
    return range;
  }, [year, startDay, endDay]);


  // 3. Calcul des Statistiques par Agent
  const stats = useMemo(() => {
    if (!planning || planning.length === 0) return [];

    const computed = planning.map(row => {
      let totalHours = 0;
      let workedShiftsCount = 0; // Nombre de tours travaillés (hors congés)
      let leaveDays = 0;         // Nombre de congés (C)
      
      const counts: any = {};
      shiftTypes.forEach(t => counts[t] = 0); // Init à 0
      counts['AUTRE'] = 0;

      const weekendsWorked = new Set<string>(); // On stocke les clés de semaine des WE travaillés
      const weeklyHours: {[key: string]: number} = {};

      // Init weekly hours à 0 pour toutes les semaines de la période
      const allWeeks = Array.from(new Set(daysRange.map(d => d.weekKey)));
      allWeeks.forEach(w => weeklyHours[w] = 0);

      // Parcours des jours de la période
      daysRange.forEach(({ dayNum, isWeekend, weekKey }) => {
          const code = row[dayNum.toString()];
          if (!code || code === 'OFF' || code === '') return;

          // -- Comptage Vacations --
          if (code === 'C') {
              leaveDays++;
          } else {
              // C'est un jour travaillé
              if (config.VACATIONS[code]) {
                  counts[code] = (counts[code] || 0) + 1;
              } else {
                  // Codes non définis dans config (ex: A1, A2 si pas dans config)
                  // On essaie de grouper intelligemment ou on met dans Autre
                  // Pour l'affichage demandé, on peut juste compter si le code ressemble
                  if (shiftTypes.includes(code)) counts[code]++;
                  else counts['AUTRE']++;
              }
              workedShiftsCount++;

              // -- Weekends --
              // Si c'est un Samedi ou Dimanche travaillé, on marque cette semaine comme "WE touché"
              if (isWeekend) {
                  weekendsWorked.add(weekKey);
              }
          }

          // -- Heures --
          let duree = 0;
          if (config.VACATIONS[code]) {
              duree = config.VACATIONS[code].fin - config.VACATIONS[code].debut;
          } else if (code.startsWith('A')) {
              duree = 7.5; // Valeur par défaut pour A1/A2 si non config
          } else if (code === 'M') { // Fallback si non config
              duree = 7.0; 
          }
          
          if (duree > 0) {
              totalHours += duree;
              weeklyHours[weekKey] = (weeklyHours[weekKey] || 0) + duree;
          }
      });

      // -- Calcul Cible (Target) --
      // Formule : (Période - Congés) / 2
      const periodLength = daysRange.length;
      const targetShifts = Math.max(0, Math.ceil((periodLength - leaveDays) / 2));

      return {
        agent: row.Agent,
        totalHours,
        workedShiftsCount,
        targetShifts,
        counts,
        weekendsCount: weekendsWorked.size,
        weeklyHours,
        ratio: targetShifts > 0 ? (workedShiftsCount / targetShifts) : 0
      };
    });

    // Tri conditionnel
    if (sortByHours) {
        return [...computed].sort((a, b) => b.totalHours - a.totalHours);
    }
    return computed; // Ordre original (celui du CSV/GoogleSheet)

  }, [planning, config, daysRange, shiftTypes, sortByHours]);


  if (!planning || planning.length === 0) return <div style={{padding:20}}>Aucune donnée.</div>;

  return (
    <div style={{padding: 20, height:'100%', overflow:'auto', fontFamily:'"Inter", sans-serif'}}>
        
        {/* Header Bilan */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
            <div>
                <h2 style={{margin:0, color:'#1e293b'}}>📊 Bilan Détaillé</h2>
                <div style={{fontSize:12, color:'#64748b'}}>Période de {daysRange.length} jours • {shiftTypes.length} types de vacations</div>
            </div>
            <button 
                onClick={() => setSortByHours(!sortByHours)}
                style={{
                    background:'white', border:'1px solid #cbd5e1', padding:'8px 16px', borderRadius:6, 
                    cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569', display:'flex', alignItems:'center', gap:8
                }}
            >
                {sortByHours ? '🔽 Tri : Heures' : '🔃 Tri : Original'}
            </button>
        </div>

        <div style={{background:'white', borderRadius:8, boxShadow:'0 1px 3px rgba(0,0,0,0.1)', overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', minWidth: 1000}}>
                <thead style={{background:'#f8fafc', borderBottom:'2px solid #e2e8f0'}}>
                    <tr>
                        <th style={{...thStyle, width:80, position:'sticky', left:0, background:'#f8fafc', zIndex:10}}>Agent</th>
                        
                        {/* Objectifs */}
                        <th style={{...thStyle, width:100, textAlign:'center'}}>Vacations<br/><span style={{fontSize:10, fontWeight:'normal'}}>Prog / Dûes</span></th>
                        <th style={{...thStyle, width:80, textAlign:'right'}}>Total H</th>
                        <th style={{...thStyle, width:80, textAlign:'center'}}>Weekends</th>

                        {/* Types de vacations (Dynamique) */}
                        {shiftTypes.map(type => (
                            <th key={type} style={{...thStyle, textAlign:'center', color:'#64748b', fontSize:11}}>{type}</th>
                        ))}
                        <th style={{...thStyle, textAlign:'center', color:'#db2777'}}>Congés</th>

                        {/* Heures Hebdo */}
                        <th style={{...thStyle, textAlign:'left', paddingLeft:20}}>Heures / Semaine Civile</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.map((row, idx) => {
                        const isTargetMet = row.workedShiftsCount >= row.targetShifts - 1; // Tolérance de 1
                        const ratioColor = isTargetMet ? '#16a34a' : '#ea580c';

                        return (
                            <tr key={row.agent} style={{borderBottom: '1px solid #f1f5f9', background: idx%2===0 ? 'white':'#fafafa'}}>
                                {/* Agent */}
                                <td style={{...tdStyle, fontWeight:'bold', color:'#1e293b', position:'sticky', left:0, background: idx%2===0 ? 'white':'#fafafa', borderRight:'1px solid #f1f5f9'}}>{row.agent}</td>
                                
                                {/* Vacations Target */}
                                <td style={{...tdStyle, textAlign:'center'}}>
                                    <span style={{fontWeight:'bold', color: ratioColor}}>{row.workedShiftsCount}</span>
                                    <span style={{color:'#94a3b8', fontSize:11}}> / {row.targetShifts}</span>
                                </td>

                                {/* Total H */}
                                <td style={{...tdStyle, textAlign:'right', fontWeight:'bold'}}>{row.totalHours.toFixed(1)}</td>

                                {/* Weekends */}
                                <td style={{...tdStyle, textAlign:'center'}}>
                                    <span style={{background:'#eff6ff', color:'#2563eb', padding:'2px 8px', borderRadius:10, fontWeight:'bold', fontSize:11}}>
                                        {row.weekendsCount}
                                    </span>
                                </td>

                                {/* Colonnes Dynamiques */}
                                {shiftTypes.map(type => (
                                    <td key={type} style={{...tdStyle, textAlign:'center'}}>
                                        {row.counts[type] > 0 ? (
                                            <span style={{fontWeight:'bold', color:'#475569'}}>{row.counts[type]}</span>
                                        ) : <span style={{color:'#e2e8f0'}}>-</span>}
                                    </td>
                                ))}
                                <td style={{...tdStyle, textAlign:'center', color:'#db2777', fontWeight:'bold'}}>
                                    {row.counts['AUTRE'] > 0 ? row.counts['AUTRE'] : (row.targetShifts * 2 - daysRange.length - row.workedShiftsCount > 0 ? '?' : '-')} {/* Fallback si congés non détectés */}
                                </td>

                                {/* Heures Hebdo (Mini Grille) */}
                                <td style={{...tdStyle, paddingLeft:20}}>
                                    <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                                        {Object.entries(row.weeklyHours).map(([week, hours]: any) => (
                                            <div key={week} style={{
                                                fontSize:10, padding:'2px 6px', borderRadius:4, 
                                                border:'1px solid',
                                                borderColor: hours > 35 ? '#fca5a5' : '#cbd5e1',
                                                background: hours > 35 ? '#fef2f2' : 'white',
                                                color: hours > 35 ? '#991b1b' : '#64748b'
                                            }}>
                                                <span style={{fontWeight:'bold'}}>{week.split('-')[1]}</span>: {hours}h
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>
  );
};

const thStyle: React.CSSProperties = {
    padding: '12px 10px', fontSize: 11, textTransform: 'uppercase', color: '#64748b', whiteSpace:'nowrap'
};

const tdStyle: React.CSSProperties = {
    padding: '10px 10px', fontSize: 13, color: '#334155'
};

export default Bilan;