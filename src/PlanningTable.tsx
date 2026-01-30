import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef } from 'ag-grid-community'; 

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

ModuleRegistry.registerModules([ AllCommunityModule ]);

// --- 1. HEADER (Couverture Optionnelle) ---
const CustomHeader = (props: any) => {
    const { displayName, dayNum, fullDate, api, config, context } = props;
    const { optionalCoverage, onToggleOptionalCoverage, isDesiderataView } = context;

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

    return (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%', height:'100%', paddingTop: 6}}>
            <div style={{fontSize: 10, fontWeight: '700', color: '#64748b', textTransform:'uppercase'}}>{displayName.substring(0, 2)}</div>
            <div style={{fontSize: 13, fontWeight: '800', color: '#1e293b'}}>{dayNum}</div>
            <div style={{fontSize: 10, color: '#94a3b8', marginBottom: 6}}>{fullDate}</div>
            <div style={{display:'flex', flexDirection:'column', gap: 1, marginTop: 'auto', paddingBottom: 6}}>
                {missingShifts.map((code: string, idx: number) => {
                    // Vérif si optionnel
                    const isOptional = optionalCoverage && optionalCoverage[dayNum.toString()]?.includes(code);
                    const color = isOptional ? '#2563eb' : '#ef4444'; // Bleu ou Rouge
                    return (
                        <span 
                            key={idx} 
                            onClick={(e) => { 
                                if (isDesiderataView && onToggleOptionalCoverage) {
                                    e.stopPropagation(); 
                                    onToggleOptionalCoverage(dayNum, code);
                                }
                            }}
                            title={isDesiderataView ? "Clic pour rendre Optionnel/Obligatoire" : ""}
                            style={{fontSize: 9, color: color, fontWeight: '700', lineHeight: '11px', cursor: isDesiderataView ? 'pointer':'default'}}
                        >
                            {code}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

// --- 2. AGENT CELL ---
const AgentCellRenderer = (props: any) => {
    const agentName = props.value;
    const rowData = props.data;
    const { daysList, config, preAssignments } = props.context; 
    
    const normalize = (v: any) => {
        if (!v) return '';
        const s = v.toString().trim().toUpperCase();
        return (s === 'O' || s === 'OFF' || s === '0') ? 'OFF' : s;
    };

    let worked = 0; let leaves = 0; let refusedCount = 0;
    if (daysList && rowData && config) {
        daysList.forEach((dayNum: number) => {
            const dayStr = dayNum.toString();
            const actualCode = normalize(rowData[dayStr]);
            if (actualCode && actualCode !== '' && actualCode !== 'OFF') {
                if (actualCode === 'C') leaves++;
                else {
                    const isKnown = config.VACATIONS[actualCode] !== undefined || ['M','J1','J2','J3','S','A1','A2'].includes(actualCode);
                    if (isKnown) worked++;
                }
            }
            if (preAssignments && preAssignments[agentName]) {
                const req = preAssignments[agentName][dayStr];
                if (req) {
                    const allowed = req.toString().split(/[,/ ]+/).map((s: string) => normalize(s)).filter((s: string) => s !== '');
                    if (allowed.length > 0 && !allowed.includes(actualCode)) refusedCount++;
                }
            }
        });
    }
    const target = Math.ceil((daysList.length - leaves) / 2);
    const isBureau = (config.CONTROLLERS_AFFECTES_BUREAU || []).includes(agentName);

    return (
        <div style={{display:'flex', flexDirection:'column', justifyContent:'center', height:'100%', paddingLeft: 8}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontWeight:'800', fontSize: 13, color: isBureau ? '#2563eb' : '#334155'}}>{agentName} {isBureau && '🏢'}</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap: 8, marginTop: 2}}>
                <div style={{fontSize: 10, color: (worked >= target - 1) ? '#16a34a' : '#ea580c', fontWeight: 700}}>{worked} <span style={{color:'#cbd5e1', fontWeight:400}}>/</span> {target}</div>
                {refusedCount > 0 && ( <div style={{fontSize: 9, color: '#ef4444', fontWeight: '800', background: '#fee2e2', padding: '1px 4px', borderRadius: '4px', border: '1px solid #fca5a5'}}>{refusedCount} ⚠️</div> )}
            </div>
        </div>
    );
};

// --- 3. SHIFT CELL ---
const ShiftCellRenderer = (props: any) => {
    const rawVal = props.value;
    const { preAssignments, showDesiderataMatch, softConstraints, onToggleSoft, isDesiderataView, hideOff } = props.context;
    const agentName = props.data.Agent;
    const dayNum = props.colDef.headerComponentParams.dayNum;

    const normalize = (v: any) => {
        if (!v) return '';
        const s = v.toString().trim().toUpperCase();
        return (s === 'O' || s === 'OFF' || s === '0') ? 'OFF' : s;
    };

    const displayVal = normalize(rawVal);
    if (!displayVal || displayVal === '') return null;
    if (hideOff && displayVal === 'OFF' && !isDesiderataView) return null;

    const rawRequest = preAssignments && preAssignments[agentName] ? preAssignments[agentName][dayNum] : '';
    let allowedCodes: string[] = [];
    if (rawRequest) {
        allowedCodes = rawRequest.toString().split(/[,/ ]+/).map((s: string) => normalize(s)).filter((s: string) => s !== '');
    }

    const hasRequest = allowedCodes.length > 0;
    const isMatch = hasRequest && allowedCodes.includes(displayVal);
    const isSoft = softConstraints?.has(`${agentName}_${dayNum}`);

    const getBorderStyle = () => {
        if (isDesiderataView) return isSoft ? '2px solid #9333ea' : '1px solid #cbd5e1';
        if (showDesiderataMatch && hasRequest) return isMatch ? '2px solid #16a34a' : '2px solid #ef4444';
        return `1px solid #cbd5e1`;
    };

    // Style simple pour l'exemple, à enrichir
    let bg = '#f1f5f9'; let col = '#334155';
    if(displayVal === 'M') { bg='#eff6ff'; col='#2563eb'; }
    else if(['J1','J2','J3'].includes(displayVal)) { bg='#dcfce7'; col='#16a34a'; }
    else if(['A1','A2'].includes(displayVal)) { bg='#fee2e2'; col='#dc2626'; }
    else if(displayVal === 'S') { bg='#f3e8ff'; col='#9333ea'; }
    else if(displayVal === 'OFF') { bg='#f8fafc'; col='#94a3b8'; }

    return (
        <div onContextMenu={(e)=>{ if(isDesiderataView && onToggleSoft) { e.preventDefault(); onToggleSoft(agentName, dayNum); }}} 
             title={hasRequest ? `Demande: ${rawRequest} ${isMatch?'✅':'❌'}` : ''}
             style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%'}}>
            <span style={{backgroundColor: bg, color: col, border: getBorderStyle(), borderRadius: '6px', fontSize: '10px', fontWeight: '700', width: '34px', textAlign: 'center', display: 'inline-block'}}>
                {displayVal}
            </span>
        </div>
    );
};

// --- 4. MAIN ---
const PlanningTable: React.FC<any> = (props) => {
  const { data, year, startDay, endDay, config } = props;
  const components = useMemo(() => ({ agColumnHeader: CustomHeader, agentCellRenderer: AgentCellRenderer, shiftCellRenderer: ShiftCellRenderer }), []);
  const daysList = useMemo(() => {
    const list = [];
    if (startDay <= endDay) { for (let i = startDay; i <= endDay; i++) list.push(i); } 
    else { for (let i = startDay; i <= 365; i++) list.push(i); for (let i = 1; i <= endDay; i++) list.push(i); }
    return list;
  }, [startDay, endDay]);

  const columnDefs = useMemo<ColDef[]>(() => {
    const cols: ColDef[] = [{ field: 'Agent', headerName: 'CONTRÔLEUR', pinned: 'left', width: 140, cellRenderer: 'agentCellRenderer', cellStyle: { backgroundColor: '#f8fafc', borderRight: '2px solid #cbd5e1', display:'flex', alignItems:'center', padding:0 } }];
    daysList.forEach(dayNum => {
      cols.push({
        field: dayNum.toString(), width: 52, 
        headerComponentParams: { displayName: '', dayNum: dayNum, fullDate: '', config: config, context: props }, // Passer props au header
        cellRenderer: 'shiftCellRenderer',
        cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid #cbd5e1', padding: 0 }
      });
    });
    return cols; 
  }, [year, startDay, endDay, daysList, config, props]); // Props en dépendance

  return (
    <div className="ag-theme-balham" style={{ height: '100%', width: '100%', zoom: `${props.zoomLevel}%` }}>
      <AgGridReact rowData={data} columnDefs={columnDefs} components={components} context={props} defaultColDef={{ resizable: true, sortable: false }} headerHeight={140} rowHeight={50} />
    </div>
  );
};

export default PlanningTable;