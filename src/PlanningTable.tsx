import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef } from 'ag-grid-community'; 

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

ModuleRegistry.registerModules([ AllCommunityModule ]);

// --- 1. HEADER PERSONNALISÉ ---
const CustomHeader = (props: any) => {
    const { displayName, dayNum, fullDate, api, config } = props;
    
    const targetShifts = config && config.VACATIONS 
        ? Object.keys(config.VACATIONS) 
        : ['M', 'J1', 'J3']; 

    const presentShifts = new Set<string>();
    
    if (api) {
        api.forEachNode((node: any) => {
            const val = node.data ? node.data[dayNum] : null;
            if (val && val !== 'OFF' && val !== 'C' && val !== '') {
                presentShifts.add(val);
            }
        });
    }

    const missingShifts = targetShifts.filter((code: string) => !presentShifts.has(code));

    missingShifts.sort((a: string, b: string) => {
        if (config && config.VACATIONS[a] && config.VACATIONS[b]) {
            return config.VACATIONS[a].debut - config.VACATIONS[b].debut;
        }
        return a.localeCompare(b);
    });

    return (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%', height:'100%', paddingTop: 6, boxSizing:'border-box'}}>
            <div style={{fontSize: 10, fontWeight: '700', color: '#64748b', textTransform:'uppercase', lineHeight:'1.2'}}>
                {displayName.substring(0, 2)}
            </div>
            <div style={{fontSize: 13, fontWeight: '800', color: '#1e293b', lineHeight:'1.4'}}>
                {dayNum}
            </div>
            <div style={{fontSize: 10, color: '#94a3b8', marginBottom: 6}}>
                {fullDate}
            </div>
            <div style={{display:'flex', flexDirection:'column', gap: 1, marginTop: 'auto', paddingBottom: 6}}>
                {missingShifts.map((code: string, idx: number) => (
                    <span key={idx} style={{fontSize: 9, color: '#ef4444', fontWeight: '700', lineHeight: '11px', textAlign:'center'}}>
                        {code}
                    </span>
                ))}
            </div>
        </div>
    );
};

// --- 2. COMPOSANT CELLULE AGENT ---
const AgentCellRenderer = (props: any) => {
    const agentName = props.value;
    const rowData = props.data;
    const { daysList, config } = props.context; 

    let worked = 0;
    let leaves = 0;

    if (daysList && rowData && config) {
        daysList.forEach((dayNum: number) => {
            const code = rowData[dayNum.toString()];
            if (!code || code === '' || code === 'OFF') return;

            if (code === 'C') {
                leaves++;
            } else {
                const isKnownShift = config.VACATIONS[code] !== undefined 
                                     || ['M', 'J1', 'J2', 'J3', 'S', 'A1', 'A2'].includes(code);
                if (isKnownShift) worked++;
            }
        });
    }

    const totalDays = daysList ? daysList.length : 0;
    const target = Math.ceil((totalDays - leaves) / 2);
    const isTargetMet = worked >= (target - 1);
    const statsColor = isTargetMet ? '#16a34a' : '#ea580c';

    const isBureau = ['GNC'].includes(agentName);
    const isParite = ['WBR', 'PLC', 'KGR', 'FRD'].includes(agentName);

    return (
        <div style={{display:'flex', flexDirection:'column', justifyContent:'center', height:'100%', paddingLeft: 8}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontWeight:'700', fontSize: 13, color: '#334155'}}>{agentName}</span>
                <div style={{display:'flex', gap:4, marginRight: 8}}>
                    {isParite && <div style={{width:6, height:6, borderRadius:'50%', background:'#3b82f6'}} title="Parité"></div>}
                    {isBureau && <div style={{width:6, height:6, borderRadius:'50%', background:'#ef4444'}} title="Bureau"></div>}
                </div>
            </div>
            <div style={{fontSize: 10, color: statsColor, fontWeight: 700, marginTop: 2}}>
                {worked} <span style={{color:'#cbd5e1', fontWeight:400}}>/</span> {target}
            </div>
        </div>
    );
};

// --- 3. COMPOSANT CELLULE SHIFT ---
const ShiftCellRenderer = (props: any) => {
    const val = props.value;
    const { preAssignments, showDesiderataMatch } = props.context;
    const agentName = props.data.Agent;
    const dayNum = props.colDef.headerComponentParams.dayNum;

    const requestedShift = preAssignments && preAssignments[agentName] 
        ? preAssignments[agentName][dayNum] 
        : null;

    const isDesiderataMatch = showDesiderataMatch && requestedShift && requestedShift !== '';

    if (!val || val === '' || val === 'OFF') return null;

    let style = { color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' }; 

    switch (val) {
        case 'M': style = { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }; break;
        case 'J1':
        case 'J2':
        case 'J3': style = { color: '#16a34a', bg: '#dcfce7', border: '#86efac' }; break;
        case 'A1': style = { color: '#d97706', bg: '#ffedd5', border: '#fed7aa' }; break;
        case 'A2': style = { color: '#dc2626', bg: '#fee2e2', border: '#fecaca' }; break;
        case 'S': style = { color: '#9333ea', bg: '#f3e8ff', border: '#d8b4fe' }; break;
        case 'C': style = { color: '#db2777', bg: '#fce7f3', border: '#fbcfe8' }; break;
        case 'FSAU':
        case 'FH': style = { color: '#b45309', bg: '#fef3c7', border: '#fde68a' }; break;
        case 'B': style = { color: '#475569', bg: '#ffffff', border: '#e2e8f0' }; break;
        default: break;
    }

    return (
        <div 
            title={isDesiderataMatch ? `Désidérata d'origine : ${requestedShift}` : undefined}
            style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%'}}
        >
            <span style={{
                backgroundColor: style.bg, 
                color: style.color, 
                border: isDesiderataMatch ? '2px solid #2563eb' : `1px solid ${style.border}`,
                borderRadius: '6px', 
                padding: isDesiderataMatch ? '1px 0' : '2px 0', 
                fontSize: '11px', 
                fontWeight: '700',
                width: '32px', 
                textAlign: 'center', 
                boxShadow: isDesiderataMatch ? '0 0 4px rgba(37,99,235,0.3)' : '0 1px 2px rgba(0,0,0,0.03)', 
                display: 'inline-block'
            }}>
                {val}
            </span>
        </div>
    );
};


interface PlanningTableProps {
  data: any[];
  year: number;
  startDay: number;
  endDay: number;
  config: any;
  isDesiderataView?: boolean;
  preAssignments?: any;
  showDesiderataMatch?: boolean;
}

const PlanningTable: React.FC<PlanningTableProps> = ({ 
  data, year, startDay, endDay, config, 
  isDesiderataView = false,
  preAssignments = {}, 
  showDesiderataMatch = false 
}) => {

  const components = useMemo(() => ({
      agColumnHeader: CustomHeader,
      agentCellRenderer: AgentCellRenderer,
      shiftCellRenderer: ShiftCellRenderer
  }), []);

  const daysList = useMemo(() => {
    const list = [];
    if (startDay <= endDay) {
        for (let i = startDay; i <= endDay; i++) list.push(i);
    } else {
        for (let i = startDay; i <= 365; i++) list.push(i);
        for (let i = 1; i <= endDay; i++) list.push(i);
    }
    return list;
  }, [startDay, endDay]);

  const columnDefs = useMemo<ColDef[]>(() => {
    // 1. Colonne Agent
    const cols: ColDef[] = [{
      field: 'Agent', 
      headerName: 'CONTRÔLEUR',
      pinned: 'left', 
      width: 140, 
      cellRenderer: 'agentCellRenderer',
      // Bordure droite plus prononcée pour séparer les noms du planning
      cellStyle: { 
          backgroundColor: '#f8fafc', 
          borderRight: '2px solid #cbd5e1', // <-- Bordure plus visible ici
          display:'flex', 
          alignItems:'center', 
          padding:0 
      }
    }];

    // 2. Colonnes Jours
    daysList.forEach(dayNum => {
      const dayStr = dayNum.toString();
      let currentYear = year;
      if (startDay > endDay && dayNum >= startDay) currentYear = year - 1; 
      
      const date = new Date(currentYear, 0, dayNum); 
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        field: dayStr,
        width: 52, 
        
        headerClass: isWeekend ? 'weekend-header' : '',

        headerComponentParams: {
            displayName: dayName,
            dayNum: dayNum,
            fullDate: dateStr,
            config: config 
        },
        cellRenderer: 'shiftCellRenderer',
        
        // Bordures de cellules plus visibles
        cellStyle: { 
            display: 'flex', justifyContent: 'center', alignItems: 'center', 
            borderRight: '1px solid #cbd5e1', // <-- Bordure verticale grise visible
            padding: 0,
            backgroundColor: isWeekend ? '#e5e7eb' : 'white' // <-- Gris weekend un peu plus foncé
        },
        editable: false 
      });
    });
    
    return cols; 

  }, [year, startDay, endDay, isDesiderataView, daysList, config]);

  return (
    <div className="ag-theme-balham" style={{ height: '100%', width: '100%' }}>
      <style>{`
        /* Reset des paddings headers */
        .ag-theme-balham .ag-header-cell { padding: 0 !important; }
        .ag-theme-balham .ag-header-cell-label { width: 100%; height: 100%; padding: 0; }
        
        /* BORDURES EXTÉRIEURES ET LIGNES PLUS PRONONCÉES */
        .ag-theme-balham .ag-root-wrapper { border: 1px solid #94a3b8; } /* Bordure extérieure solide */
        
        .ag-theme-balham .ag-header { 
            border-bottom: 2px solid #cbd5e1; /* Séparation Header/Body marquée */
            background-color: white; 
        }
        
        /* Lignes horizontales plus visibles */
        .ag-theme-balham .ag-row { 
            border-bottom-color: #cbd5e1; 
        }
        
        /* Séparation Colonne fixée (Agent) */
        .ag-theme-balham .ag-pinned-left-header { 
            border-right: 2px solid #cbd5e1; 
        }
        
        /* Couleur focus */
        .ag-theme-balham .ag-cell-focus { border-color: #3b82f6 !important; }

        /* Style weekend */
        .ag-theme-balham .weekend-header { 
            background-color: #e5e7eb !important; /* Gris plus visible */
            border-bottom: 1px solid #cbd5e1;
        }
      `}</style>

      <AgGridReact 
        rowData={data || []} 
        columnDefs={columnDefs} 
        components={components} 
        context={{ daysList, config, preAssignments, showDesiderataMatch }}
        defaultColDef={{ 
            resizable: true, 
            sortable: false, 
            filter: false,
            suppressHeaderMenuButton: true 
        }}
        headerHeight={140} 
        rowHeight={50}     
      />
    </div>
  );
};

export default PlanningTable;