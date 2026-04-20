import React, { useMemo } from 'react';

interface BilanProps {
    planning: any[];
    config: any;
    year: number;
    startDay: number;
    endDay: number;
}

interface StatResult {
    agent: string;
    isBureau: boolean;
    rate: number;
    worked: number;
    target: number;
    diff: number;
    details: Record<string, number>;
    leaves: number;
    weekendSat: number;
    weekendSun: number;
    weeklyHours: Record<number, number>; 
}

const safeString = (val: any) => (val === null || val === undefined ? '' : String(val).trim().toUpperCase());

const getWeekNumber = (d: Date): number => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getDuration = (code: string, config: any): number => {
    const vac = config.VACATIONS[code];
    if (!vac) return 0;
    let d = vac.fin - vac.debut;
    if (d < 0) d += 24; 
    return d;
};

const Bilan: React.FC<BilanProps> = ({ planning, config, year, startDay, endDay }) => {

    const { stats, allWeeks } = useMemo(() => {
        const orderedAgents = config.CONTROLEURS || [];
        const vacationsCodes = Object.keys(config.VACATIONS || {});
        const weeksSet = new Set<number>();
        
        // --- NOUVEAU : Calcul des jours actifs ---
        const lockedUntil = config?.CONTRAT?.LOCKED_UNTIL_DAY || 0;
        let activeDaysCount = 0;
        for (let i = startDay; i <= endDay; i++) {
            if (i > lockedUntil) activeDaysCount++;
        }

        const computedStats: StatResult[] = orderedAgents.map((agent: string) => {
            const agentRow = planning.find((p: any) => p.Agent === agent) || {};
            
            let worked = 0;
            let leaves = 0;
            let neutralized = 0;
            let weekendSat = 0;
            let weekendSun = 0;
            const weeklyHours: Record<number, number> = {};
            const details: Record<string, number> = {};
            vacationsCodes.forEach((v: string) => details[v] = 0);

            for (let i = startDay; i <= endDay; i++) {
                const val = safeString(agentRow[i.toString()]);
                const currentDate = new Date(year, 0, i); 
                const weekNum = getWeekNumber(currentDate);
                weeksSet.add(weekNum);

                if (!val || val === '' || val === 'OFF' || val === '0') continue;

                // --- Calcul du bilan Global (inclut l'historique) ---
                if (val === 'C') {
                    if (i > lockedUntil) {
                        leaves++;
                        neutralized++;
                    }
                } else if (vacationsCodes.includes(val)) {
                    if (i > lockedUntil) worked++;
                    if (details[val] !== undefined) details[val]++;
                    
                    const hours = getDuration(val, config);
                    weeklyHours[weekNum] = (weeklyHours[weekNum] || 0) + hours;

                    const dayOfWeek = currentDate.getDay(); 
                    if (dayOfWeek === 6) weekendSat++;
                    if (dayOfWeek === 0) weekendSun++;
                } else {
                    if (i > lockedUntil) neutralized++;
                }
            }

            const rate = (config.AGENT_WORK_RATES && config.AGENT_WORK_RATES[agent]) || 100;
            const balance = (config.AGENT_BALANCES && config.AGENT_BALANCES[agent]) || 0;
            
            // On calcule la cible uniquement sur la période active
            const baseTarget = Math.ceil((rate / 100) * (activeDaysCount - neutralized) / 2);
            const finalTarget = Math.max(0, baseTarget + balance);
            
            const diff = worked - finalTarget;

            return {
                agent,
                isBureau: (config.CONTROLLERS_AFFECTES_BUREAU || []).includes(agent),
                rate,
                worked,
                target: finalTarget,
                diff,
                details,
                leaves,
                weekendSat,
                weekendSun,
                weeklyHours
            };
        });

        const sortedWeeks = Array.from(weeksSet).sort((a, b) => a - b);
        return { stats: computedStats, allWeeks: sortedWeeks };
    }, [planning, config, startDay, endDay, year]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', boxSizing: 'border-box', fontFamily: '"Inter", sans-serif', background: '#f8fafc' }}>
            <div style={{marginBottom: 15, flexShrink: 0}}>
                <h2 style={{ margin: 0, color: '#1e293b' }}>📊 Bilan & Statistiques</h2>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                    Période Active : Jour {Math.max(startDay, (config?.CONTRAT?.LOCKED_UNTIL_DAY || 0) + 1)} au jour {endDay}
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', background: 'white' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 12 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                            <th style={stickyHeaderStyle}>Agent</th>
                            <th style={{...stickyHeaderStyle, borderLeft:'2px solid #cbd5e1', textAlign:'center'}}>Cible</th>
                            <th style={{...stickyHeaderStyle, textAlign:'center'}}>Réalisé</th>
                            <th style={{...stickyHeaderStyle, textAlign:'center'}}>Écart</th>
                            <th style={{...stickyHeaderStyle, borderLeft:'2px solid #cbd5e1', textAlign:'center', color:'#b45309'}}>Samedi</th>
                            <th style={{...stickyHeaderStyle, textAlign:'center', color:'#b45309'}}>Dimanche</th>
                            <th style={{...stickyHeaderStyle, textAlign:'center', fontWeight:'800', color:'#b45309', background:'#fff7ed'}}>Total WE</th>
                            {allWeeks.map(week => (
                                <th key={week} style={{...stickyHeaderStyle, borderLeft: week === allWeeks[0] ? '2px solid #cbd5e1' : '1px solid #e2e8f0', textAlign:'center', minWidth: 50}}>Sem {week}</th>
                            ))}
                            <th style={{...stickyHeaderStyle, borderLeft:'2px solid #cbd5e1'}}>Répartition Mensuelle</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((stat, idx) => {
                            const isEven = idx % 2 === 0;
                            const diffColor = stat.diff === 0 ? '#94a3b8' : (stat.diff > 0 ? '#16a34a' : '#ef4444');
                            const diffSign = stat.diff > 0 ? '+' : '';
                            const totalWE = stat.weekendSat + stat.weekendSun;

                            return (
                                <tr key={stat.agent} style={{ background: isEven ? '#ffffff' : '#fcfcfc' }}>
                                    <td style={tdStyle}>
                                        <div style={{display:'flex', flexDirection:'column'}}>
                                            <span style={{ fontWeight: 'bold', color: stat.isBureau ? '#2563eb' : '#1e293b', fontSize: 13 }}>{stat.agent}</span>
                                            {stat.rate < 100 && <span style={{fontSize:9, color:'#ef4444', fontWeight:600}}>{stat.rate}%</span>}
                                        </div>
                                    </td>
                                    <td style={{...tdStyle, borderLeft:'2px solid #f1f5f9', textAlign:'center', color:'#64748b', fontWeight:'600'}}>{stat.target}</td>
                                    <td style={{...tdStyle, textAlign:'center', fontWeight:'800', color:'#1e293b'}}>{stat.worked}</td>
                                    <td style={{...tdStyle, textAlign:'center', fontWeight:'bold', color: diffColor}}>
                                        {stat.diff !== 0 ? `${diffSign}${stat.diff}` : '='}
                                    </td>
                                    <td style={{...tdStyle, borderLeft:'2px solid #f1f5f9', textAlign:'center'}}>{stat.weekendSat}</td>
                                    <td style={{...tdStyle, textAlign:'center'}}>{stat.weekendSun}</td>
                                    <td style={{...tdStyle, textAlign:'center', fontWeight:'bold', background:'#fff7ed', color:'#9a3412'}}>{totalWE}</td>
                                    {allWeeks.map(week => {
                                        const h = stat.weeklyHours[week] || 0;
                                        const color = h > 40 ? '#dc2626' : (h > 35 ? '#d97706' : '#334155');
                                        const weight = h > 35 ? '700' : '400';
                                        return (
                                            <td key={week} style={{...tdStyle, borderLeft: week === allWeeks[0] ? '2px solid #f1f5f9' : '1px solid #f8fafc', textAlign:'center', color: color, fontWeight: weight}}>
                                                {h > 0 ? h + 'h' : '-'}
                                            </td>
                                        );
                                    })}
                                    <td style={{...tdStyle, borderLeft:'2px solid #f1f5f9'}}>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {Object.entries(stat.details).map(([code, count]) => {
                                                if (count === 0) return null;
                                                return (
                                                    <span key={code} style={{ fontSize: 10, background: '#e2e8f0', padding: '1px 4px', borderRadius: 3, color: '#475569' }}>
                                                        <b>{count}</b> {code}
                                                    </span>
                                                );
                                            })}
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

const stickyHeaderStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' };

export default Bilan;