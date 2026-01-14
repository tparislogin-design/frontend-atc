import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef } from 'ag-grid-community'; 

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

ModuleRegistry.registerModules([ AllCommunityModule ]);

// --- 1. HEADER PERSONNALISÉ (Identique à avant) ---
const CustomHeader = (props: any) => {
    const { displayName, dayNum, fullDate } = props;
    // Note: Pour coller à ta capture, j'ai mis des exemples de besoins rouges plus réalistes
    // Idéalement, ça viendra du backend plus tard.
    const requiredShifts = ['J3', 'M', 'J1']; 

    return (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%', height:'100%', paddingTop: 5}}>
            <div style={{fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform:'uppercase'}}>
                {displayName.substring(0, 2)}
            </div>
            <div style={{fontSize: 12, fontWeight: '800', color: '#1e293b'}}>
                {dayNum}
            </div>
            <div style={{fontSize: 10, color: '#94a3b8', marginBottom: 4}}>
                {fullDate}
            </div>
            {/* Liste Rouge Verticale */}
            <div style={{display:'flex', flexDirection:'column', gap: 0, marginTop: 'auto', paddingBottom: 4}}>
                {requiredShifts.map((code, idx) => (
                    <span key={idx} style={{fontSize: 9, color: '#ef4444', fontWeight: 'bold', lineHeight: '11px', textAlign:'center'}}>
                        {code}
                    </span>
                ))}
            </div>
        </div>
    );
};

// --- 2. CELLULE AGENT (Identique à avant) ---
const AgentCellRenderer = (props: any) => {
    const agentName = props.value;
    // Mock data pour coller à ta capture
    const isBureau = ['GNC'].includes(agentName);
    const isParite = ['WBR', 'PLC', 'KGR', 'FRD'].includes(agentName);
    
    // Exemple de stats comme sur la capture (mocké)
    const stats = "9 / 12"; 

    return (
        <div style={{display:'flex', flexDirection:'column', justifyContent:'center', height:'100%', paddingLeft: 5}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontWeight:'bold', fontSize: 12, color: '#334155'}}>{agentName}</span>
                <div style={{display:'flex', gap:3, marginRight: 5}}>
                    {isParite && <div style={{width:6, height:6, borderRadius:'50%', background:'#3b82f6'}}></div>}
                    {isBureau && <div style={{width:6, height:6, borderRadius:'50%', background:'#ef4444'}}></div>}
                </div>
            </div>
            <div style={{fontSize: 9, color: '#3b82f6', fontWeight: 600}}>
                {stats}
            </div>
        </div>
    );
};

// --- 3. NOUVEAU : CELLULE "PASTILLE" (Badge) ---
const ShiftCellRenderer = (props: any) => {
    const val = props.value;

    if (!val || val === '' || val === 'OFF') return null;

    // Définition des Styles (Couleur Texte, Fond, Bordure)
    let style = { color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' }; // Défaut gris

    switch (val) {
        case 'M': 
            style = { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }; // Bleu (M)
            break;
        case 'J1':
        case 'J2':
        case 'J3':
            style = { color: '#16a34a', bg: '#dcfce7', border: '#86efac' }; // Vert (J)
            break;
        case 'A1':
            style = { color: '#d97706', bg: '#ffedd5', border: '#fed7aa' }; // Orange (A1)
            break;
        case 'A2':
            style = { color: '#dc2626', bg: '#fee2e2', border: '#fecaca' }; // Rouge clair (A2)
            break;
        case 'S':
            style = { color: '#9333ea', bg: '#f3e8ff', border: '#d8b4fe' }; // Violet (S)
            break;
        case 'C':
            style = { color: '#db2777', bg: '#fce7f3', border: '#fbcfe8' }; // Rose (Congés)
            break;
        case 'FSAU':
        case 'FH':
            style = { color: '#b45309', bg: '#fef3c7', border: '#fde68a' }; // Jaune/Or
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
                borderRadius: '6px', // Arrondi comme sur la capture
                padding: '2px 8px', // Espace intérieur
                fontSize: '11px',
                fontWeight: '700',
                minWidth: '24px', // Largeur min pour que les pastilles soient jolies
                textAlign: 'center',
                boxShadow: '0 1px 1px rgba(0,0,0,0.02)' // Légère ombre subtile
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
  isDesiderataView?: boolean;
}

const PlanningTable: React.FC<PlanningTableProps> = ({ 
  data, year, startDay, endDay, isDesiderataView = false 
}) => {

  const components = useMemo(() => {
      return {
          agColumnHeader: CustomHeader,
          agentCellRenderer: AgentCellRenderer,
          shiftCellRenderer: ShiftCellRenderer // Enregistrement du nouveau renderer
      };
  }, []);

  const columnDefs = useMemo<ColDef[]>(() => {
    // 1. Colonne Agent
    const cols: ColDef[] = [{
      field: 'Agent', 
      headerName: 'CONTRÔLEUR',
      pinned: 'left', 
      width: 120,
      cellRenderer: 'agentCellRenderer',
      cellStyle: { backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', display:'flex', alignItems:'center' }
    }];

    // 2. Génération des Jours
    const daysRange: number[] = [];
    if (startDay <= endDay) {
        for (let i = startDay; i <= endDay; i++) daysRange.push(i);
    } else {
        for (let i = startDay; i <= 365; i++) daysRange.push(i);
        for (let i = 1; i <= endDay; i++) daysRange.push(i);
    }

    daysRange.forEach(dayNum => {
      const dayStr = dayNum.toString();
      let currentYear = year;
      if (startDay > endDay && dayNum >= startDay) currentYear = year - 1; 
      
      const date = new Date(currentYear, 0, dayNum); 
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

      cols.push({
        field: dayStr,
        width: 50, // Ajusté pour bien contenir la pastille
        headerComponentParams: {
            displayName: dayName,
            dayNum: dayNum,
            fullDate: dateStr
        },
        cellRenderer: 'shiftCellRenderer', // Utilisation de la pastille
        
        // Style de base de la cellule (le conteneur)
        cellStyle: { 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            borderRight: '1px solid #f8fafc', // Séparateur très léger
            padding: 0
        },
        editable: false // On désactive l'édition directe pour le moment pour profiter du renderer
      });
    });
    return cols;
  }, [year, startDay, endDay, isDesiderataView]);

  return (
    <div className="ag-theme-balham" style={{ height: '100%', width: '100%' }}>
      <style>{`
        .ag-theme-balham .ag-header-cell { padding: 0 !important; }
        .ag-theme-balham .ag-header-cell-label { width: 100%; height: 100%; padding: 0; }
        .ag-theme-balham .ag-root-wrapper { border: none; }
        .ag-theme-balham .ag-row { border-bottom-color: #f1f5f9; }
        .ag-theme-balham .ag-header { border-bottom-color: #e2e8f0; background-color: white; }
        /* Alternance très légère des lignes pour la lisibilité */
        .ag-theme-balham .ag-row-odd { background-color: #ffffff; }
        .ag-theme-balham .ag-row-even { background-color: #fafafa; }
      `}</style>

      <AgGridReact 
        rowData={data || []} 
        columnDefs={columnDefs} 
        components={components} 
        defaultColDef={{ 
            resizable: true, 
            sortable: false, 
            filter: false,
            //suppressMenu: true
        }}
        headerHeight={140} 
        rowHeight={50} // Un peu plus haut pour laisser respirer les pastilles
      />
    </div>
  );
};

export default PlanningTable;