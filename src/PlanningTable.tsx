import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef } from 'ag-grid-community'; 

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

// Enregistrement des modules Community
ModuleRegistry.registerModules([ AllCommunityModule ]);

// --- 1. COMPOSANT EN-TÊTE PERSONNALISÉ ---
const CustomHeader = (props: any) => {
    const { displayName, dayNum, fullDate } = props;
    
    // MOCK : Liste des vacations requises (Simulé pour le visuel V2.1)
    // Plus tard, ces infos pourront venir des props ou du contexte
    const requiredShifts = ['J3', 'M', 'J1']; 

    return (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%', height:'100%', paddingTop: 6, boxSizing:'border-box'}}>
            {/* Jour Semaine (LUN, MAR...) */}
            <div style={{fontSize: 10, fontWeight: '700', color: '#64748b', textTransform:'uppercase', lineHeight:'1.2'}}>
                {displayName.substring(0, 2)}
            </div>
            
            {/* Numéro Jour (1, 2, 365...) */}
            <div style={{fontSize: 13, fontWeight: '800', color: '#1e293b', lineHeight:'1.4'}}>
                {dayNum}
            </div>

            {/* Date (01/01) */}
            <div style={{fontSize: 10, color: '#94a3b8', marginBottom: 6}}>
                {fullDate}
            </div>

            {/* Liste Verticale Rouge (Besoins) */}
            <div style={{display:'flex', flexDirection:'column', gap: 1, marginTop: 'auto', paddingBottom: 6}}>
                {requiredShifts.map((code, idx) => (
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
    
    // MOCK : Logique de statut pour la démo visuelle
    const isBureau = ['GNC'].includes(agentName);
    const isParite = ['WBR', 'PLC', 'KGR', 'FRD'].includes(agentName);
    
    // MOCK : Stats d'heures ou de tours
    const stats = "9 / 12"; 

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
            {/* Compteur sous le nom */}
            <div style={{fontSize: 10, color: '#3b82f6', fontWeight: 600, marginTop: 2}}>
                {stats}
            </div>
        </div>
    );
};

// --- 3. COMPOSANT CELLULE VACATION (BADGES) ---
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
                borderRadius: '6px',
                padding: '2px 0',
                fontSize: '11px',
                fontWeight: '700',
                width: '32px', // Largeur fixe pour uniformité
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
  isDesiderataView?: boolean;
}

const PlanningTable: React.FC<PlanningTableProps> = ({ 
  data, year, startDay, endDay, isDesiderataView = false 
}) => {

  // Déclaration des composants personnalisés
  const components = useMemo(() => {
      return {
          agColumnHeader: CustomHeader,
          agentCellRenderer: AgentCellRenderer,
          shiftCellRenderer: ShiftCellRenderer
      };
  }, []);

  const columnDefs = useMemo<ColDef[]>(() => {
    // 1. Colonne Agent
    const cols: ColDef[] = [{
      field: 'Agent', 
      headerName: 'CONTRÔLEUR',
      pinned: 'left', 
      width: 140, // Un peu plus large pour le confort
      cellRenderer: 'agentCellRenderer',
      cellStyle: { backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', display:'flex', alignItems:'center', padding:0 }
    }];

    // 2. Génération des Colonnes Jours
    const daysRange: number[] = [];
    
    // Logique pour gérer le passage d'année (ex: 365 -> 28)
    if (startDay <= endDay) {
        for (let i = startDay; i <= endDay; i++) daysRange.push(i);
    } else {
        for (let i = startDay; i <= 365; i++) daysRange.push(i);
        for (let i = 1; i <= endDay; i++) daysRange.push(i);
    }

    daysRange.forEach(dayNum => {
      const dayStr = dayNum.toString();
      
      // Calcul de l'année réelle pour l'affichage de la date
      let currentYear = year;
      if (startDay > endDay && dayNum >= startDay) currentYear = year - 1; 
      
      const date = new Date(currentYear, 0, dayNum); 
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      
      // Weekends (Samedi=6, Dimanche=0)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        field: dayStr,
        width: 52, // Largeur optimisée pour les badges
        
        // Params passés au Header Custom
        headerComponentParams: {
            displayName: dayName,
            dayNum: dayNum,
            fullDate: dateStr
        },
        
        cellRenderer: 'shiftCellRenderer',
        
        // Styles de la case (conteneur)
        cellStyle: { 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            borderRight: '1px solid #f1f5f9', // Séparateur très subtil
            padding: 0,
            backgroundColor: isWeekend ? '#fdfdfd' : 'white' // Fond très légèrement différent WE
        },
        editable: false // Désactivé pour l'instant pour privilégier l'affichage badge
      });
    });
    return cols;
  }, [year, startDay, endDay, isDesiderataView]);

  return (
    <div className="ag-theme-balham" style={{ height: '100%', width: '100%' }}>
      
      {/* Styles CSS injectés pour surcharger Ag-Grid et avoir le look "Clean" */}
      <style>{`
        /* Reset des paddings headers */
        .ag-theme-balham .ag-header-cell { padding: 0 !important; }
        .ag-theme-balham .ag-header-cell-label { width: 100%; height: 100%; padding: 0; }
        
        /* Suppression des bordures par défaut pour un look plus "air" */
        .ag-theme-balham .ag-root-wrapper { border: none; }
        
        /* Lignes et Headers */
        .ag-theme-balham .ag-header { border-bottom: 1px solid #e2e8f0; background-color: white; }
        .ag-theme-balham .ag-row { border-bottom-color: #f1f5f9; }
        
        /* Header Fixe Agent */
        .ag-theme-balham .ag-pinned-left-header { border-right: 1px solid #e2e8f0; }

        /* Couleur de sélection (si on clique sur une case) */
        .ag-theme-balham .ag-cell-focus { border-color: #3b82f6 !important; }
      `}</style>

      <AgGridReact 
        rowData={data || []} 
        columnDefs={columnDefs} 
        components={components} 
        defaultColDef={{ 
            resizable: true, 
            sortable: false, 
            filter: false,
           // suppressMenu: true // Indispensable pour notre header custom
        }}
        headerHeight={140} // Hauteur suffisante pour les 4 niveaux d'infos
        rowHeight={50}     // Hauteur suffisante pour les badges
      />
    </div>
  );
};

export default PlanningTable;