import React, { useMemo } from 'react';

interface BilanProps {
    planning: any[];
    config: any;
    year: number;
    startDay: number;
    endDay: number;
}

// Interface pour typer les données calculées
interface StatResult {
    agent: string;
    isBureau: boolean;
    rate: number;
    worked: number;
    target: number;
    diff: number;
    details: Record<string, number>;
    leaves: number;
}

const safeString = (val: any) => (val === null || val === undefined ? '' : String(val).trim().toUpperCase());

const Bilan: React.FC<BilanProps> = ({ planning, config, startDay, endDay }) => {

    // 1. Calcul des Statistiques
    const stats = useMemo<StatResult[]>(() => {
        // On se base sur la liste ordonnée des contrôleurs pour l'affichage
        const orderedAgents = config.CONTROLEURS || [];
        const vacationsCodes = Object.keys(config.VACATIONS || {});

        return orderedAgents.map((agent: string) => {
            // Trouver les données de planning pour cet agent
            const agentRow = planning.find((p: any) => p.Agent === agent) || {};
            
            let worked = 0;
            let leaves = 0; // 'C' uniquement
            let neutralized = 0; // 'C' + autres codes non productifs (Stage, etc.)
            
            // Compteurs par type de vacation
            const details: Record<string, number> = {};
            vacationsCodes.forEach((v: string) => details[v] = 0);

            // Parcours des jours
            // Note: Calcul simple de la durée en jours
            const daysCount = (endDay - startDay) + 1;

            for (let i = startDay; i <= endDay; i++) {
                const val = safeString(agentRow[i.toString()]);
                
                if (!val || val === '' || val === 'OFF' || val === '0') continue;

                if (val === 'C') {
                    leaves++;
                    neutralized++;
                } else if (vacationsCodes.includes(val)) {
                    worked++;
                    // On incrémente le compteur spécifique si la clé existe
                    if (details[val] !== undefined) {
                        details[val]++;
                    }
                } else {
                    // Autre code (Stage, FSAU...) -> Compte comme neutralisé pour la cible
                    neutralized++;
                }
            }

            // Calcul Cible (Même formule que PlanningTable)
            const rate = (config.AGENT_WORK_RATES && config.AGENT_WORK_RATES[agent]) || 100;
            const balance = (config.AGENT_BALANCES && config.AGENT_BALANCES[agent]) || 0;
            
            // Formule : Taux% * (Total - Neutralisés) / 2
            const baseTarget = Math.ceil((rate / 100) * (daysCount - neutralized) / 2);
            const finalTarget = baseTarget + balance;
            
            const diff = worked - finalTarget;

            return {
                agent,
                isBureau: (config.CONTROLLERS_AFFECTES_BUREAU || []).includes(agent),
                rate,
                worked,
                target: finalTarget,
                diff,
                details,
                leaves
            };
        });
    }, [planning, config, startDay, endDay]);

    // 2. Rendu
    return (
        <div style={{ padding: '20px', fontFamily: '"Inter", sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            
            <div style={{marginBottom: 20, borderBottom:'1px solid #e2e8f0', paddingBottom:10}}>
                <h2 style={{ margin: 0, color: '#1e293b' }}>📊 Bilan de la période</h2>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                    Du jour {startDay} au jour {endDay} • {config.CONTROLEURS.length} Agents
                </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: 'white' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                            <th style={thStyle}>Agent</th>
                            <th style={thStyle}>Taux</th>
                            
                            {/* Section Objectifs */}
                            <th style={{...thStyle, borderLeft:'2px solid #cbd5e1', textAlign:'center', color:'#334155'}}>Cible</th>
                            <th style={{...thStyle, textAlign:'center', color:'#16a34a'}}>Réalisé</th>
                            <th style={{...thStyle, textAlign:'center'}}>Écart</th>
                            
                            {/* Section Détails */}
                            <th style={{...thStyle, borderLeft:'2px solid #cbd5e1'}}>Détail Vacations</th>
                            <th style={{...thStyle, textAlign:'right'}}>Congés</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map((stat: StatResult, idx: number) => {
                            const isEven = idx % 2 === 0;
                            const diffColor = stat.diff === 0 ? '#94a3b8' : (stat.diff > 0 ? '#16a34a' : '#ef4444');
                            const diffSign = stat.diff > 0 ? '+' : '';

                            return (
                                <tr key={stat.agent} style={{ background: isEven ? '#ffffff' : '#fcfcfc', borderBottom: '1px solid #f1f5f9' }}>
                                    
                                    {/* Agent */}
                                    <td style={tdStyle}>
                                        <div style={{display:'flex', alignItems:'center', gap:6}}>
                                            <span style={{ fontWeight: 'bold', color: stat.isBureau ? '#2563eb' : '#1e293b' }}>
                                                {stat.agent}
                                            </span>
                                            {stat.isBureau && <span title="Bureau">🏢</span>}
                                        </div>
                                    </td>

                                    {/* Taux */}
                                    <td style={tdStyle}>
                                        {stat.rate < 100 ? (
                                            <span style={{ fontSize: 11, background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: '600' }}>
                                                {stat.rate}%
                                            </span>
                                        ) : (
                                            <span style={{color:'#cbd5e1'}}>100%</span>
                                        )}
                                    </td>

                                    {/* Cible (Target) */}
                                    <td style={{...tdStyle, borderLeft:'2px solid #f1f5f9', textAlign:'center', fontWeight:'600', color:'#64748b'}}>
                                        {stat.target}
                                    </td>

                                    {/* Réalisé (Worked) */}
                                    <td style={{...tdStyle, textAlign:'center', fontWeight:'800', color:'#1e293b', fontSize:14}}>
                                        {stat.worked}
                                    </td>

                                    {/* Écart (Diff) */}
                                    <td style={{...tdStyle, textAlign:'center', fontWeight:'bold', color: diffColor}}>
                                        {stat.diff !== 0 && (
                                            <span style={{ background: stat.diff > 0 ? '#dcfce7' : '#fee2e2', padding: '2px 8px', borderRadius: 12, fontSize: 12 }}>
                                                {diffSign}{stat.diff}
                                            </span>
                                        )}
                                        {stat.diff === 0 && <span style={{color:'#cbd5e1'}}>=</span>}
                                    </td>

                                    {/* Détail Vacations */}
                                    <td style={{...tdStyle, borderLeft:'2px solid #f1f5f9'}}>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {Object.entries(stat.details).map(([code, count]) => {
                                                if (count === 0) return null;
                                                return (
                                                    <div key={code} style={{ 
                                                        display: 'flex', alignItems: 'center', gap: 4, 
                                                        background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, 
                                                        border: '1px solid #e2e8f0' 
                                                    }}>
                                                        <span style={{ fontSize: 10, fontWeight: '700', color: '#64748b' }}>{code}</span>
                                                        <span style={{ fontSize: 11, fontWeight: '700', color: '#0f172a' }}>{count as number}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* Congés */}
                                    <td style={{...tdStyle, textAlign:'right', color: stat.leaves > 0 ? '#db2777' : '#e2e8f0', fontWeight: stat.leaves > 0 ? '600' : '400'}}>
                                        {stat.leaves} j
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            <div style={{marginTop:20, fontSize:12, color:'#94a3b8', fontStyle:'italic'}}>
                * La cible est calculée selon la formule : (Jours Total - Jours Neutralisés) / 2 x Taux% + Balance Manuelle.
            </div>
        </div>
    );
};

// Styles CSS-in-JS simples
const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: '0.5px'
};

const tdStyle: React.CSSProperties = {
    padding: '10px 16px',
    color: '#334155'
};

export default Bilan;