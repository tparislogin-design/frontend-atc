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
            if (val && val !== 'OFF' && val !== 'C' && val !== '' && val !== 'O') {
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
            if (!code || code === '' || code === 'OFF' || code === 'O') return;

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

// --- 3. COMPOSANT CELLULE SHIFT (LOGIQUE SOFT & VIOLATION) ---
const ShiftCellRenderer = (props: any) => {
    const rawVal = props.value;
    // On récupère isDesiderataView du contexte pour savoir dans quel onglet on est
    const { preAssignments, showDesiderataMatch, softConstraints, onToggleSoft, isDesiderataView } = props.context;
    const agentName = props.data.Agent;
    const dayNum = props.colDef.headerComponentParams.dayNum;

    // --- NORMALISATION ---
    const normalize = (v: any) => {
        if (!v) return '';
        if (v === 'O' || v === 'OFF' || v === '0') return 'OFF';
        return v;
    };

    const displayVal = normalize(rawVal);
    
    // Si vide, on n'affiche rien
    if (!displayVal || displayVal === '') return null;

    // --- RÉCUPÉRATION DE LA DEMANDE ORIGINALE ---
    const rawRequest = preAssignments && preAssignments[agentName] ? preAssignments[agentName][dayNum] : null;
    const requestedShift = normalize(rawRequest);
    
    // Est-ce une demande Soft ?
    const cellKey = `${agentName}_${dayNum}`;
    const isSoft = softConstraints && softConstraints.has(cellKey);

    // --- LOGIQUE DE BORDURE (Le cœur du changement) ---
    const getBorderStyle = () => {
        // 1. Vue DÉSIDÉRATA : On affiche le Violet si Soft
        if (isDesiderataView) {
            if (isSoft) return '2px solid #9333ea'; // Violet
            return '1px solid #cbd5e1'; // Bordure standard
        }

        // 2. Vue PLANNING (Résultat)
        // Si c'était Soft ET que le résultat est différent de la demande -> ROUGE (Violation)
        if (isSoft && requestedShift && requestedShift !== '' && displayVal !== requestedShift) {
            return '2px solid #ef4444'; // Rouge vif
        }

        // Si Match parfait (Soft ou Hard) -> Bleu (si le toggle est activé) ou Violet (si Soft respecté)
        // Ici, priorité au feedback "Match"
        const isMatch = requestedShift && requestedShift !== '' && displayVal === requestedShift;
        if (isMatch && showDesiderataMatch) return '2px solid #2563eb'; // Bleu
        if (isMatch && isSoft) return '2px solid #9333ea'; // Violet (Match Soft respecté)

        return '1px solid #cbd5e1';
    };

    // --- LOGIQUE DE STYLE (Couleur de fond) ---
    let style = { color: '#334155', bg: '#f1f5f9' }; 
    const styleKey = displayVal; // On utilise la valeur normalisée (OFF)

    switch (styleKey) {
        case 'M': style = { color: '#2563eb', bg: '#eff6ff' }; break;
        case 'J1':
        case 'J2':
        case 'J3': style = { color: '#16a34a', bg: '#dcfce7' }; break;
        case 'A1': style = { color: '#d97706', bg: '#ffedd5' }; break;
        case 'A2': style = { color: '#dc2626', bg: '#fee2e2' }; break;
        case 'S': style = { color: '#9333ea', bg: '#f3e8ff' }; break;
        case 'C': style = { color: '#db2777', bg: '#fce7f3' }; break;
        case 'OFF': style = { color: '#94a3b8', bg: '#f8fafc' }; break;
        case 'FSAU':
        case 'FH': style = { color: '#b45309', bg: '#fef3c7' }; break;
        case 'B': style = { color: '#475569', bg: '#ffffff' }; break;
        default: break;
    }

    // --- GESTION DU CLIC DROIT ---
    // Uniquement actif dans la vue DÉSIDÉRATA
    const handleContextMenu = (e: React.MouseEvent) => {
        if (isDesiderataView && onToggleSoft) {
            e.preventDefault(); 
            onToggleSoft(agentName, dayNum);
        }
    };

    // --- TOOLTIP ---
    // Affiche la demande d'origine si match ou violation
    let tooltip = undefined;
    if (requestedShift && requestedShift !== '') {
        tooltip = `Demande : ${requestedShift}`;
        if (isSoft) tooltip += " (Soft)";
        if (!isDesiderataView && displayVal !== requestedShift) tooltip += " ⚠️ Non respecté";
    }

    // Détection de la bordure pour l'ombre
    const finalBorder = getBorderStyle();
    const isRed = finalBorder.includes('#ef4444');
    const isPurple = finalBorder.includes('#9333ea');
    const isBlue = finalBorder.includes('#2563eb');

    return (
        <div 
            onContextMenu={handleContextMenu}
            title={tooltip}
            style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center', 
                height: '100%', width: '100%', 
                cursor: isDesiderataView ? 'context-menu' : 'default'
            }}
        >
            <span style={{
                backgroundColor: style.bg, 
                color: style.color, 
                border: finalBorder,
                borderRadius: '6px', 
                padding: (isRed || isPurple || isBlue) ? '1px 0' : '2px 0', 
                fontSize: '10px', 
                fontWeight: '700',
                width: '34px',
                textAlign: 'center', 
                boxShadow: isRed 
                    ? '0 0 4px rgba(239, 68, 68, 0.5)' // Ombre Rouge
                    : (isPurple 
                        ? '0 0 4px rgba(147, 51, 234, 0.5)' // Ombre Violette
                        : (isBlue ? '0 0 4px rgba(37,99,235,0.3)' : '0 1px 2px rgba(0,0,0,0.03)')), 
                display: 'inline-block',
                transform: (isRed || isPurple) ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.1s'
            }}>
                {displayVal}
            </span>
        </div>
    );
};

// --- 4. COMPOSANT PRINCIPAL ---
interface PlanningTableProps {
  data: any[];
  year: number;
  startDay: number;
  endDay: number;
  config: any;
  isDesiderataView?: boolean;
  preAssignments?: any;
  showDesiderataMatch?: boolean;
  zoomLevel?: number;
  softConstraints?: Set<string>;
  onToggleSoft?: (agent: string, day: number) => void;
}

const PlanningTable: React.FC<PlanningTableProps> = ({ 
  data, year, startDay, endDay, config, 
  isDesiderataView = false,
  preAssignments = {}, 
  showDesiderataMatch = false,
  zoomLevel = 100,
  softConstraints,
  onToggleSoft
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
    const cols: ColDef[] = [{
      field: 'Agent', 
      headerName: 'CONTRÔLEUR',
      pinned: 'left', 
      width: 140, 
      cellRenderer: 'agentCellRenderer',
      cellStyle: { 
          backgroundColor: '#f8fafc', 
          borderRight: '2px solid #cbd5e1', 
          display:'flex', 
          alignItems:'center', 
          padding:0 
      }
    }];

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
        cellStyle: { 
            display: 'flex', justifyContent: 'center', alignItems: 'center', 
            borderRight: '1px solid #cbd5e1', 
            padding: 0,
            backgroundColor: isWeekend ? '#e5e7eb' : 'white'
        },
        editable: false 
      });
    });
    return cols; 
  }, [year, startDay, endDay, isDesiderataView, daysList, config]);

  return (
    <div 
        className="ag-theme-balham" 
        style={{ 
            height: '100%', 
            width: '100%',
            zoom: `${zoomLevel}%` 
        }}
    >
      <style>{`
        .ag-theme-balham .ag-header-cell { padding: 0 !important; }
        .ag-theme-balham .ag-header-cell-label { width: 100%; height: 100%; padding: 0; }
        .ag-theme-balham .ag-root-wrapper { border: 1px solid #94a3b8; }
        .ag-theme-balham .ag-header { border-bottom: 2px solid #cbd5e1; background-color: white; }
        .ag-theme-balham .ag-row { border-bottom-color: #cbd5e1; }
        .ag-theme-balham .ag-pinned-left-header { border-right: 2px solid #cbd5e1; }
        .ag-theme-balham .ag-cell-focus { border-color: #3b82f6 !important; }
        .ag-theme-balham .weekend-header { background-color: #e5e7eb !important; border-bottom: 1px solid #cbd5e1; }
      `}</style>

      <AgGridReact 
        rowData={data || []} 
        columnDefs={columnDefs} 
        components={components} 
        // IMPORT : On passe isDesiderataView au contexte pour que la cellule sache où elle est
        context={{ daysList, config, preAssignments, showDesiderataMatch, softConstraints, onToggleSoft, isDesiderataView }}
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