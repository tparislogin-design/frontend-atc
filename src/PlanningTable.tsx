import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef } from 'ag-grid-community'; 

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

ModuleRegistry.registerModules([ AllCommunityModule ]);

// --- HELPER SÉCURITÉ ---
const safeString = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val);
};

// --- 1. HEADER RÉSUMÉ (MANQUANTS GLOBAUX - COMPACT) ---
const SummaryHeader = (props: any) => {
    const { api, config, context } = props;
    const { daysList } = context; 
    
    const targetShifts = config && config.VACATIONS ? Object.keys(config.VACATIONS) : ['M', 'J1', 'J3'];
    const missingCounts: Record<string, number> = {};
    targetShifts.forEach((s: string) => missingCounts[s] = 0);

    let hasAnyData = false;

    if (api && daysList) {
        daysList.forEach((dayNum: number) => {
            const dayStr = safeString(dayNum);
            const presentOnDay = new Set<string>();
            api.forEachNode((node: any) => {
                const val = node.data ? node.data[dayStr] : null;
                if (val && !['OFF', 'C', '', 'O'].includes(val)) {
                    presentOnDay.add(val);
                    hasAnyData = true;
                }
            });
            targetShifts.forEach((shift: string) => {
                if (!presentOnDay.has(shift)) missingCounts[shift]++;
            });
        });
    }

    // Bordures explicites pour fermer la grille
    const boxStyle: React.CSSProperties = {
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', 
        width:'100%', height:'100%', padding: '4px', background:'#fff', 
        borderRight:'1px solid #bdc3c7', // Démarcation colonne
        borderBottom:'1px solid #bdc3c7', // Démarcation ligne
        boxSizing: 'border-box'
    };

    if (!hasAnyData) {
        return (
            <div style={boxStyle}>
                <div style={{fontSize: 10, fontWeight: '800', color: '#94a3b8'}}>PLANNING</div>
                <div style={{fontSize: 16, marginTop: 2}}>⚪</div>
            </div>
        );
    }

    const summary = Object.entries(missingCounts)
        .filter(([_, count]) => count > 0)
        .sort((a, b) => {
            const startA = config?.VACATIONS[a[0]]?.debut || 0;
            const startB = config?.VACATIONS[b[0]]?.debut || 0;
            return startA - startB;
        });

    return (
        <div style={boxStyle}>
            <div style={{fontSize: 9, fontWeight: '800', color: '#64748b', marginBottom: 4, textTransform:'uppercase'}}>MANQUANTS</div>
            {summary.length === 0 ? <div style={{fontSize: 20}}>✅</div> : (
                <div style={{textAlign:'center', lineHeight:'1.2', fontSize: 10, fontWeight:'600', color:'#ef4444'}}>
                    {/* Affichage compact : 3xM, 2xJ1 */}
                    {summary.map(([shift, count], idx) => (
                        <span key={shift}>
                            <span style={{fontWeight:'800'}}>{count}</span>x{shift}{idx < summary.length - 1 ? ', ' : ''}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- 2. HEADER GLOBAL (Vue Désidérata) ---
const GlobalHeader = (props: any) => {
    const { config, context } = props;
    const { optionalCoverage, onToggleGlobalOptional, daysList } = context; 
    
    const allShifts = config && config.VACATIONS ? Object.keys(config.VACATIONS) : ['M', 'J1', 'J3'];
    allShifts.sort((a: string, b: string) => {
        const startA = config?.VACATIONS[a]?.debut || 0;
        const startB = config?.VACATIONS[b]?.debut || 0;
        return startA - startB;
    });
    
    return (
        <div style={{
            display:'flex', flexDirection:'column', alignItems:'center', width:'100%', height:'100%', paddingTop: 6, 
            background: '#f1f5f9', 
            borderRight:'1px solid #bdc3c7', 
            borderBottom:'1px solid #bdc3c7',
            boxSizing: 'border-box'
        }}>
            <div style={{fontSize: 10, fontWeight: '800', color: '#64748b', textTransform:'uppercase'}}>GLOBAL</div>
            <div style={{fontSize: 9, color: '#94a3b8', fontStyle:'italic', marginBottom: 4}}>1-Clic</div>
            
            <div style={{display:'flex', flexDirection:'column', gap: 1, overflowY: 'hidden', width: '100%', paddingBottom: 4}}>
                {allShifts.map((code: string, idx: number) => {
                    let isOptionalEverywhere = false;
                    if (daysList && Array.isArray(daysList)) {
                        isOptionalEverywhere = daysList.every((d: number) => {
                            return optionalCoverage && optionalCoverage[d.toString()] && optionalCoverage[d.toString()].includes(code);
                        });
                    }
                    const color = isOptionalEverywhere ? '#2563eb' : '#ef4444';
                    return (
                        <div key={idx} style={{display:'flex', justifyContent:'center'}}>
                            <span 
                                onClick={(e) => { e.stopPropagation(); onToggleGlobalOptional(code); }} 
                                title={`Rendre ${code} optionnel/obligatoire pour TOUT le mois`} 
                                style={{ fontSize: 10, color: color, fontWeight: '700', cursor: 'pointer', padding: '0 4px' }}
                            >
                                {code}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- 3. HEADER QUOTIDIEN (COMPACT & LINÉAIRE) ---
const CustomHeader = (props: any) => {
    const { displayName, dayNum, fullDate, api, config, context } = props;
    const { optionalCoverage, onToggleOptionalCoverage, isDesiderataView } = context || {};

    const targetShifts = config && config.VACATIONS ? Object.keys(config.VACATIONS) : ['M', 'J1', 'J3']; 
    const presentShifts = new Set<string>();
    if (api) {
        api.forEachNode((node: any) => {
            const val = node.data ? node.data[dayNum] : null;
            if (val && !['OFF','C','','O'].includes(val)) presentShifts.add(val);
        });
    }
    const missingShifts = targetShifts.filter((code: string) => !presentShifts.has(code));
    missingShifts.sort((a: string, b: string) => {
        if (config && config.VACATIONS[a] && config.VACATIONS[b]) return config.VACATIONS[a].debut - config.VACATIONS[b].debut;
        return a.localeCompare(b);
    });

    // Détermination de la couleur de la barre indicatrice du bas
    let indicatorColor = 'transparent'; 

    if (missingShifts.length > 0) {
        const dayStr = safeString(dayNum);
        const areAllOptional = missingShifts.every(code => optionalCoverage && optionalCoverage[dayStr]?.includes(code));
        indicatorColor = areAllOptional ? '#2563eb' : '#ef4444'; // Bleu ou Rouge
    }

    return (
        <div style={{
            display:'flex', flexDirection:'column', alignItems:'center', width:'100%', height:'100%', 
            paddingTop: 4, paddingBottom: 2, boxSizing:'border-box',
            borderRight: '1px solid #bdc3c7', 
            borderBottom: `1px solid #bdc3c7`, // Gris fixe
            background: missingShifts.length > 0 ? '#fff' : '#f0fdf4',
            position: 'relative'
        }}>
            {/* Date */}
            <div style={{lineHeight: '1.1', textAlign:'center', marginBottom: 2}}>
                <div style={{fontSize: 9, fontWeight: '700', color: '#64748b', textTransform:'uppercase'}}>{displayName ? displayName.substring(0, 2) : ''}</div>
                <div style={{fontSize: 12, fontWeight: '800', color: '#1e293b'}}>{dayNum}</div>
                <div style={{fontSize: 9, color: '#94a3b8'}}>{fullDate}</div>
            </div>

            {/* Liste Manquants */}
            <div style={{
                textAlign:'center', width:'100%', padding: '0 2px', 
                whiteSpace: 'normal', lineHeight: '1.1'
            }}>
                {missingShifts.map((code: string, idx: number) => {
                    const dayStr = safeString(dayNum);
                    const isOptional = optionalCoverage && optionalCoverage[dayStr] && optionalCoverage[dayStr].includes(code);
                    const color = isOptional ? '#2563eb' : '#ef4444';
                    
                    return (
                        <span 
                            key={code}
                            onClick={(e) => { 
                                if (isDesiderataView && onToggleOptionalCoverage) { 
                                    e.stopPropagation(); 
                                    onToggleOptionalCoverage(dayNum, code); 
                                }
                            }}
                            title={isDesiderataView ? "Clic pour rendre optionnel" : ""}
                            style={{
                                fontSize: 10, fontWeight: '700', color: color,
                                cursor: isDesiderataView ? 'pointer' : 'default'
                            }}
                        >
                            {code}{idx < missingShifts.length - 1 ? ', ' : ''}
                        </span>
                    );
                })}
            </div>

            {/* Barre de couleur indicatrice */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, 
                height: '3px', backgroundColor: indicatorColor 
            }} />
        </div>
    );
};

// --- 4. AGENT CELL ---
const AgentCellRenderer = (props: any) => {
    const agentName = props.value;
    const rowData = props.data;
    const { daysList, config, preAssignments } = props.context || {}; 

    const normalize = (v: any) => {
        const s = safeString(v).trim().toUpperCase();
        if (s === 'O' || s === 'OFF' || s === '0') return 'OFF';
        return s;
    };

    let worked = 0; let leaves = 0; let refusedCount = 0;
    if (daysList && rowData && config) {
        daysList.forEach((dayNum: number) => {
            const dayStr = safeString(dayNum);
            const actualCode = normalize(rowData[dayStr]);
            if (actualCode && actualCode !== '' && actualCode !== 'OFF') {
                if (actualCode === 'C') leaves++;
                else if (config.VACATIONS[actualCode] !== undefined) worked++;
                else leaves++; 
            }
            if (preAssignments && preAssignments[agentName]) {
                const req = preAssignments[agentName][dayStr];
                if (req) {
                    const allowed = safeString(req).split(/[,/ ]+/).map((s: string) => normalize(s)).filter((s: string) => s !== '');
                    if (allowed.length > 0 && !allowed.includes(actualCode)) refusedCount++;
                }
            }
        });
    }
    const totalDays = daysList ? daysList.length : 0;
    const workRate = (config?.AGENT_WORK_RATES && config.AGENT_WORK_RATES[agentName]) || 100;
    const target = Math.ceil((workRate / 100) * (totalDays - leaves) / 2);
    const statsColor = worked >= (target - 1) ? '#16a34a' : '#ea580c';
    const isBureau = (config?.CONTROLLERS_AFFECTES_BUREAU || []).includes(agentName);
    const nameStyle = { fontWeight: '800', fontSize: 13, color: isBureau ? '#2563eb' : '#334155' };

    return (
        <div style={{display:'flex', flexDirection:'column', justifyContent:'center', height:'100%', paddingLeft: 8}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={nameStyle}>{agentName} {isBureau && ' 🏢'} {workRate < 100 && <span style={{fontSize:10, color:'#ef4444', marginLeft:4}}>{workRate}%</span>}</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap: 8, marginTop: 2}}>
                <div style={{fontSize: 10, color: statsColor, fontWeight: 700}}>{worked} <span style={{color:'#cbd5e1', fontWeight:400}}>/</span> {target}</div>
                {refusedCount > 0 && ( <div title={`${refusedCount} demande(s) non respectée(s)`} style={{fontSize: 9, color: '#ef4444', fontWeight: '800', background: '#fee2e2', padding: '1px 4px', borderRadius: '4px', border: '1px solid #fca5a5'}}>{refusedCount} ⚠️</div> )}
            </div>
        </div>
    );
};

// --- 5. SHIFT CELL ---
const ShiftCellRenderer = (props: any) => {
    const rawVal = props.value;
    const { preAssignments, showDesiderataMatch, softConstraints, onToggleSoft, isDesiderataView, hideOff } = props.context || {};
    const agentName = props.data.Agent;
    const dayNum = props.colDef.headerComponentParams.dayNum;

    const normalize = (v: any) => {
        const s = safeString(v).trim().toUpperCase();
        if (s === 'O' || s === 'OFF' || s === '0') return 'OFF';
        return s;
    };

    const displayVal = normalize(rawVal);
    if (displayVal === '') return null;

    const dayStr = safeString(dayNum);
    const rawRequest = preAssignments && preAssignments[agentName] ? preAssignments[agentName][dayStr] : '';
    let allowedCodes: string[] = [];
    if (rawRequest) {
        allowedCodes = safeString(rawRequest).split(/[,/ ]+/).map((s: string) => normalize(s)).filter((s: string) => s !== '');
    }

    const hasRequest = allowedCodes.length > 0;
    const isMatch = hasRequest && allowedCodes.includes(displayVal);
    const cellKey = `${agentName}_${dayNum}`;
    const isSoft = softConstraints && softConstraints.has(cellKey);

    const getBorderStyle = () => {
        if (isDesiderataView) return isSoft ? '2px solid #9333ea' : '1px solid #cbd5e1';
        if (showDesiderataMatch && hasRequest) return isMatch ? '2px solid #16a34a' : '2px solid #ef4444';
        return `1px solid ${style.border}`;
    };

    let style = { color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' }; 
    const styleKey = displayVal; 

    switch (styleKey) {
        case 'M': style = { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }; break;
        case 'J1':
        case 'J2':
        case 'J3': style = { color: '#16a34a', bg: '#dcfce7', border: '#86efac' }; break;
        case 'A1': style = { color: '#d97706', bg: '#ffedd5', border: '#fed7aa' }; break;
        case 'A2': style = { color: '#dc2626', bg: '#fee2e2', border: '#fecaca' }; break;
        case 'S': style = { color: '#9333ea', bg: '#f3e8ff', border: '#d8b4fe' }; break;
        case 'C': style = { color: '#db2777', bg: '#fce7f3', border: '#fbcfe8' }; break;
        
        case 'OFF': 
            if (!isDesiderataView && hideOff) {
                style = { color: 'transparent', bg: 'transparent', border: 'transparent' };
            } else {
                style = { color: '#000000', bg: 'transparent', border: 'transparent' }; 
            }
            break;

        case 'FSAU':
        case 'FH': style = { color: '#b45309', bg: '#fef3c7', border: '#fde68a' }; break;
        case 'B': style = { color: '#475569', bg: '#ffffff', border: '#e2e8f0' }; break;
        default: break;
    }

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isDesiderataView && onToggleSoft) { e.preventDefault(); onToggleSoft(agentName, dayNum); }
    };

    let tooltip = undefined;
    if (hasRequest) {
        tooltip = `Demande : ${rawRequest}`;
        if (isSoft) tooltip += " (Soft)";
        if (!isDesiderataView) tooltip += isMatch ? " ✅ Respecté" : " ❌ Non respecté";
    }

    const finalBorder = getBorderStyle();
    const isRed = finalBorder.includes('#ef4444');
    const isGreen = finalBorder.includes('#16a34a');
    const isPurple = finalBorder.includes('#9333ea');

    return (
        <div onContextMenu={handleContextMenu} title={tooltip} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', cursor: isDesiderataView ? 'context-menu' : 'default'}}>
            <span style={{backgroundColor: style.bg, color: style.color, border: finalBorder, borderRadius: '6px', padding: (isRed || isGreen || isPurple) ? '1px 0' : '2px 0', fontSize: '10px', fontWeight: '700', width: '34px', textAlign: 'center', boxShadow: isRed ? '0 0 4px rgba(239, 68, 68, 0.5)' : (isGreen ? '0 0 4px rgba(22, 163, 74, 0.5)' : (isPurple ? '0 0 4px rgba(147, 51, 234, 0.5)' : 'none')), display: 'inline-block', transform: (isRed || isGreen || isPurple) ? 'scale(1.05)' : 'scale(1)', transition: 'all 0.1s'}}>
                {displayVal}
            </span>
        </div>
    );
};

// --- 6. MAIN ---
const PlanningTable: React.FC<any> = (props) => {
  const { data, year, startDay, endDay, config, isDesiderataView } = props;

  const components = useMemo(() => ({
      agColumnHeaderSummary: SummaryHeader, 
      agColumnHeaderGlobal: GlobalHeader,   
      dayColumnHeader: CustomHeader,        
      agentCellRenderer: AgentCellRenderer,
      shiftCellRenderer: ShiftCellRenderer
  }), []);

  const daysList = useMemo(() => {
    const list = [];
    if (startDay <= endDay) { for (let i = startDay; i <= endDay; i++) list.push(i); } 
    else { for (let i = startDay; i <= 365; i++) list.push(i); for (let i = 1; i <= endDay; i++) list.push(i); }
    return list;
  }, [startDay, endDay]);

  const gridContext = { ...props, daysList };

  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = [{ 
        field: 'Agent', headerName: 'AGENT', 
        headerComponent: isDesiderataView ? 'agColumnHeaderGlobal' : 'agColumnHeaderSummary',
        headerComponentParams: { config, context: gridContext },
        pinned: 'left', width: 140, cellRenderer: 'agentCellRenderer', cellStyle: { backgroundColor: '#f8fafc', borderRight: '2px solid #cbd5e1', display:'flex', alignItems:'center', padding:0 } 
    }];
    
    daysList.forEach(dayNum => {
      const dayStr = safeString(dayNum);
      let currentYear = year;
      if (startDay > endDay && dayNum >= startDay) currentYear = year - 1; 
      const date = new Date(currentYear, 0, dayNum); 
      const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        field: dayStr, width: 52, headerClass: isWeekend ? 'weekend-header' : '',
        headerComponent: 'dayColumnHeader',
        headerComponentParams: { displayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }), dayNum: dayNum, fullDate: dateStr, config: config, context: gridContext },
        cellRenderer: 'shiftCellRenderer',
        cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid #cbd5e1', padding: 0, backgroundColor: isWeekend ? '#e5e7eb' : 'white' },
        editable: false 
      });
    });
    return cols; 
  }, [year, startDay, endDay, isDesiderataView, daysList, config, gridContext]);

  return (
    <div className="ag-theme-balham" style={{ height: '100%', width: '100%', zoom: `${props.zoomLevel}%` }}>
      <style>{`.ag-theme-balham .ag-header-cell { padding: 0 !important; } .ag-theme-balham .ag-header-cell-label { width: 100%; height: 100%; padding: 0; } .ag-theme-balham .ag-root-wrapper { border: 1px solid #94a3b8; } .ag-theme-balham .ag-header { border-bottom: 2px solid #cbd5e1; background-color: white; } .ag-theme-balham .ag-row { border-bottom-color: #cbd5e1; } .ag-theme-balham .ag-pinned-left-header { border-right: 2px solid #cbd5e1; } .ag-theme-balham .ag-cell-focus { border-color: #3b82f6 !important; } .ag-theme-balham .weekend-header { background-color: #e5e7eb !important; border-bottom: 1px solid #cbd5e1; }`}</style>
      <AgGridReact 
        rowData={data || []} 
        columnDefs={columnDefs} 
        components={components} 
        theme="legacy"
        context={gridContext}
        defaultColDef={{ resizable: true, sortable: false, filter: false, suppressHeaderMenuButton: true }} 
        headerHeight={110} 
        rowHeight={50}     
      />
    </div>
  );
};

export default PlanningTable;