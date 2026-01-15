import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef } from 'ag-grid-community'; 

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

// Enregistrement des modules Community
ModuleRegistry.registerModules([ AllCommunityModule ]);

// --- 1. COMPOSANT EN-TÊTE PERSONNALISÉ ---
// --- 1. HEADER PERSONNALISÉ (DYNAMIQUE) ---
const CustomHeader = (props: any) => {
    const { displayName, dayNum, fullDate, api } = props;
    
    // 1. DÉFINITION DE LA CIBLE (TARGET)
    // Idéalement, cela viendra de ta config plus tard.
    // Pour l'instant, on fixe la cible que tu m'as montrée.
    const targetShifts = ['M', 'J1', 'J3']; 

    // 2. ANALYSE DE LA COLONNE (QUI EST LÀ ?)
    const presentShifts = new Set<string>();
    
    if (api) {
        // On parcourt toutes les lignes affichées dans la grille
        api.forEachNode((node: any) => {
            // On récupère la valeur de la cellule pour ce jour précis (dayNum)
            const val = node.data ? node.data[dayNum] : null;
            if (val && val !== 'OFF' && val !== 'C' && val !== '') {
                presentShifts.add(val);
            }
        });
    }

    // 3. CALCUL DES MANQUANTS (Target - Présents)
    const missingShifts = targetShifts.filter(code => !presentShifts.has(code));

    // Si tout est pourvu, on n'affiche rien (ou un petit check vert si tu préfères)
    const isComplete = missingShifts.length === 0;

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

            {/* LISTE DYNAMIQUE DES MANQUANTS */}
            <div style={{display:'flex', flexDirection:'column', gap: 1, marginTop: 'auto', paddingBottom: 6}}>
                {isComplete ? (
                    // Optionnel : Un petit indicateur que tout est OK ?
                    // <span style={{fontSize:9, color:'#16a34a'}}>OK</span>
                    null
                ) : (
                    missingShifts.map((code, idx) => (
                        <span key={idx} style={{fontSize: 9, color: '#ef4444', fontWeight: '700', lineHeight: '11px', textAlign:'center'}}>
                            {code}
                        </span>
                    ))
                )}
            </div>
        </div>
    );
};

// --- 2. COMPOSANT CELLULE AGENT (AVEC CALCUL) ---
const AgentCellRenderer = (props: any) => {
    const agentName = props.value;
    const rowData = props.data;
    
    // Récupération du contexte (données globales + config)
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
                // On vérifie si c'est une vacation valide via la CONFIG ou une liste standard
                const isKnownShift = config.VACATIONS[code] !== undefined 
                                     || ['M', 'J1', 'J2', 'J3', 'S', 'A1', 'A2'].includes(code);
                
                if (isKnownShift) {
                    worked++;
                }
            }
        });
    }

    // Calcul Cible : (Total Jours - Congés) / 2
    const totalDays = daysList ? daysList.length : 0;
    const target = Math.ceil((totalDays - leaves) / 2);
    
    // Indicateur couleur (Tolérance de 1 tour)
    const isTargetMet = worked >= (target - 1);
    const statsColor = isTargetMet ? '#16a34a' : '#ea580c'; // Vert ou Orange

    // Mock Statuts Visuels (pour l'exemple)
    const isBureau = ['GNC'].includes(agentName);
    const isParite = ['WBR', 'PLC', 'KGR', 'FRD'].includes(agentName);

    return (
        <div style={{display:'flex', flexDirection:'column', justifyContent:'center', height:'100%', paddingLeft: 8}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontWeight:'700', fontSize: 13, color: '#334155'}}>{agentName}</span>
                
                {/* Puces de statut */}
                <div style={{display:'flex', gap:4, marginRight: 8}}>
                    {isParite && <div style={{width:6, height:6, borderRadius:'50%', background:'#3b82f6'}} title="Parité"></div>}
                    {isBureau && <div style={{width:6, height:6, borderRadius:'50%', background:'#ef4444'}} title="Bureau"></div>}
                </div>
            </div>
            {/* Ratio Calculé */}
            <div style={{fontSize: 10, color: statsColor, fontWeight: 700, marginTop: 2}}>
                {worked} <span style={{color:'#cbd5e1', fontWeight:400}}>/</span> {target}
            </div>
        </div>
    );
};

// --- 3. COMPOSANT CELLULE VACATION (BADGES) ---
const ShiftCellRenderer = (props: any) => {
    const val = props.value;

    if (!val || val === '' || val === 'OFF') return null;

    // Styles par défaut
    let style = { color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' }; 

    switch (val) {
        case 'M': 
            style = { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }; // Bleu
            break;
        case 'J1':
        case 'J2':
        case 'J3':
            style = { color: '#16a34a', bg: '#dcfce7', border: '#86efac' }; // Vert
            break;
        case 'A1':
            style = { color: '#d97706', bg: '#ffedd5', border: '#fed7aa' }; // Orange
            break;
        case 'A2':
            style = { color: '#dc2626', bg: '#fee2e2', border: '#fecaca' }; // Rouge clair
            break;
        case 'S':
            style = { color: '#9333ea', bg: '#f3e8ff', border: '#d8b4fe' }; // Violet
            break;
        case 'C':
            style = { color: '#db2777', bg: '#fce7f3', border: '#fbcfe8' }; // Rose
            break;
        case 'FSAU':
        case 'FH':
            style = { color: '#b45309', bg: '#fef3c7', border: '#fde68a' }; // Jaune
            break;
        case 'B':
            style = { color: '#475569', bg: '#ffffff', border: '#e2e8f0' }; // Blanc/Gris
            break;
    }

    return (
        <div style={{
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            height: '100%',
            width: '100%'
        }}>
            <span style={{
                backgroundColor: style.bg,
                color: style.color,
                border: `1px solid ${style.border}`,
                borderRadius: '6px',
                padding: '2px 0',
                fontSize: '11px',
                fontWeight: '700',
                width: '32px', // Largeur fixe
                textAlign: 'center',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
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
  config: any; // Requis pour le contexte
  isDesiderataView?: boolean;
}

const PlanningTable: React.FC<PlanningTableProps> = ({ 
  data, year, startDay, endDay, config, isDesiderataView = false 
}) => {

  // Déclaration des composants personnalisés
  const components = useMemo(() => {
      return {
          agColumnHeader: CustomHeader,
          agentCellRenderer: AgentCellRenderer,
          shiftCellRenderer: ShiftCellRenderer
      };
  }, []);

  // Calcul de la liste des jours pour le passer au contexte
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
      cellStyle: { backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', display:'flex', alignItems:'center', padding:0 }
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
        width: 52, // Largeur optimisée pour les badges
        
        // Params Header
        headerComponentParams: {
            displayName: dayName,
            dayNum: dayNum,
            fullDate: dateStr
        },
        
        cellRenderer: 'shiftCellRenderer',
        
        // Styles de la case
        cellStyle: { 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            borderRight: '1px solid #f1f5f9',
            padding: 0,
            backgroundColor: isWeekend ? '#fdfdfd' : 'white'
        },
        editable: false 
      });
    });
    return cols;
  }, [year, startDay, endDay, isDesiderataView, daysList]);

  return (
    <div className="ag-theme-balham" style={{ height: '100%', width: '100%' }}>
      
      {/* Styles CSS injectés pour le look "Clean" */}
      <style>{`
        .ag-theme-balham .ag-header-cell { padding: 0 !important; }
        .ag-theme-balham .ag-header-cell-label { width: 100%; height: 100%; padding: 0; }
        .ag-theme-balham .ag-root-wrapper { border: none; }
        .ag-theme-balham .ag-header { border-bottom: 1px solid #e2e8f0; background-color: white; }
        .ag-theme-balham .ag-row { border-bottom-color: #f1f5f9; }
        .ag-theme-balham .ag-pinned-left-header { border-right: 1px solid #e2e8f0; }
        .ag-theme-balham .ag-cell-focus { border-color: #3b82f6 !important; }
      `}</style>

      <AgGridReact 
        rowData={data || []} 
        columnDefs={columnDefs} 
        components={components} 
        // ⚠️ Passage du contexte CRITIQUE pour AgentCellRenderer
        context={{ daysList, config }}
        defaultColDef={{ 
            resizable: true, 
            sortable: false, 
            filter: false,
            //suppressMenu: true 
        }}
        headerHeight={140} 
        rowHeight={50}     
      />
    </div>
  );
};

export default PlanningTable;