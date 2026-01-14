import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef } from 'ag-grid-community'; 

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

// Enregistrement des modules
ModuleRegistry.registerModules([ AllCommunityModule ]);

// --- COMPOSANT HEADER PERSONNALISÉ ---
// Affiche : Jour Semaine, Numéro Jour, Date, et la liste verticale des vacations
const CustomHeader = (props: any) => {
    const { displayName, dayNum, fullDate } = props; // On passera ces infos via colDef
    
    // Liste mockée des vacations requises (à dynamiser plus tard si besoin)
    const requiredShifts = ['M', 'J1', 'J2', 'J3', 'A1', 'A2', 'S'];

    return (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', width:'100%', height:'100%', paddingTop: 5}}>
            {/* Ligne 1 : Jour Sem (LU, MA...) */}
            <div style={{fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform:'uppercase'}}>
                {displayName.substring(0, 2)}
            </div>
            
            {/* Ligne 2 : Numéro Jour (1, 2...) */}
            <div style={{fontSize: 12, fontWeight: '800', color: '#1e293b'}}>
                {dayNum}
            </div>

            {/* Ligne 3 : Date (01/01) */}
            <div style={{fontSize: 10, color: '#94a3b8', marginBottom: 5}}>
                {fullDate}
            </div>

            {/* Ligne 4 : Liste Verticale Rouge */}
            <div style={{display:'flex', flexDirection:'column', gap: 1, marginTop: 'auto', paddingBottom: 5}}>
                {requiredShifts.map(code => (
                    <span key={code} style={{fontSize: 9, color: '#ef4444', fontWeight: 'bold', lineHeight: '10px'}}>
                        {code}
                    </span>
                ))}
            </div>
        </div>
    );
};

// --- COMPOSANT CELLULE AGENT ---
// Affiche : Nom + Compteur + Puces
const AgentCellRenderer = (props: any) => {
    const agentName = props.value;
    
    // Logique Mockée pour l'exemple (à connecter aux vraies datas plus tard)
    const isBureau = ['GNC', 'FRD'].includes(agentName); // Puce Rouge
    const isParite = ['WBR', 'PLC', 'KGR'].includes(agentName); // Puce Bleue

    return (
        <div style={{display:'flex', flexDirection:'column', justifyContent:'center', height:'100%', paddingLeft: 5}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontWeight:'bold', fontSize: 12, color: '#334155'}}>{agentName}</span>
                
                {/* Puces de statut */}
                <div style={{display:'flex', gap:3, marginRight: 5}}>
                    {isParite && <div style={{width:6, height:6, borderRadius:'50%', background:'#3b82f6'}}></div>}
                    {isBureau && <div style={{width:6, height:6, borderRadius:'50%', background:'#ef4444'}}></div>}
                </div>
            </div>
            {/* Compteur sous le nom */}
            <div style={{fontSize: 9, color: '#3b82f6', fontWeight: 600}}>
                0 / 14
            </div>
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

  // Configuration des composants personnalisés pour la grille
  const components = useMemo(() => {
      return {
          agColumnHeader: CustomHeader,
          agentCellRenderer: AgentCellRenderer
      };
  }, []);

  const columnDefs = useMemo<ColDef[]>(() => {
    // 1. Colonne Agent
    const cols: ColDef[] = [{
      field: 'Agent', 
      headerName: 'CONTRÔLEUR',
      pinned: 'left', 
      width: 120,
      cellRenderer: 'agentCellRenderer', // On utilise notre composant custom
      cellStyle: { backgroundColor: '#f8fafc', borderRight: '1px solid #e2e8f0', display:'flex', alignItems:'center' }
    }];

    // 2. Génération des Jours
    const daysRange: number[] = [];
    
    if (startDay <= endDay) {
        for (let i = startDay; i <= endDay; i++) daysRange.push(i);
    } else {
        // Gestion chevauchement année (ex: 365 -> 28)
        // Note: Pour simplifier l'affichage de la date, on suppose ici que startDay > endDay implique passage d'année.
        // La gestion réelle des dates JS devra être affinée si startDay n'est pas 365.
        for (let i = startDay; i <= 365; i++) daysRange.push(i); // Fin année N-1
        for (let i = 1; i <= endDay; i++) daysRange.push(i);     // Début année N
    }

    daysRange.forEach(dayNum => {
      const dayStr = dayNum.toString();
      
      // Calcul Date
      // Astuce : Si dayNum est grand (>300) et qu'on est au début de la liste, c'est l'année N-1.
      // Sinon c'est l'année N. 
      // C'est une approximation pour l'affichage, à rendre robuste selon tes besoins réels.
      let currentYear = year;
      if (startDay > endDay && dayNum >= startDay) {
          currentYear = year - 1; 
      }
      
      const date = new Date(currentYear, 0, dayNum); 
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' }); // lun., mar.
      const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); // 01/01

      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        field: dayStr,
        width: 45, // Plus étroit comme sur la maquette
        
        // On passe les infos au Header Component via headerComponentParams
        headerComponentParams: {
            displayName: dayName,
            dayNum: dayNum,
            fullDate: dateStr
        },

        cellClass: isWeekend ? 'weekend-cell' : '', // Pourra servir au CSS
        editable: true,
        
        // Styles conditionnels (Code couleur)
        cellStyle: (params: any): any => {
          const val = params.value;
          
          // Style de base centré
          const base: any = { 
              textAlign: 'center', 
              borderRight: '1px solid #f1f5f9', 
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
          };

          // --- MODE DÉSIDÉRATA (Vue Orange) ---
          if (isDesiderataView) {
              if (!val) return base;
              return { ...base, backgroundColor: '#fff7ed', color: '#c2410c' }; // Orange clair
          }

          // --- MODE PLANNING (Vue Couleurs) ---
          if (!val) return base;

          // Mapping couleurs V2 (Inspiré de la capture)
          switch(val) {
              case 'M': return { ...base, color: '#ea580c', backgroundColor: '#fff7ed' }; // Orange
              case 'J1': 
              case 'J2': 
              case 'J3': return { ...base, color: '#16a34a', backgroundColor: '#f0fdf4' }; // Vert
              case 'A1': 
              case 'A2': return { ...base, color: '#2563eb', backgroundColor: '#eff6ff' }; // Bleu
              case 'S': return { ...base, color: '#dc2626', backgroundColor: '#fef2f2' }; // Rouge
              case 'OFF': return { ...base, color: '#cbd5e1', backgroundColor: '#ffffff', fontSize: '9px' }; // Gris
              case 'C': return { ...base, color: '#475569', backgroundColor: '#f1f5f9', fontStyle: 'italic' }; // Congés
              case 'FSAU':
              case 'FH': return { ...base, color: '#9333ea', backgroundColor: '#faf5ff', borderLeft:'2px solid #9333ea' }; // Formation/Autre
              default: return { ...base, fontWeight: 'bold' };
          }
        }
      });
    });
    return cols;
  }, [year, startDay, endDay, isDesiderataView]);

  return (
    <div className="ag-theme-balham" style={{ height: '100%', width: '100%' }}>
      
      {/* CSS INJECTÉ POUR CE COMPOSANT SPÉCIFIQUE */}
      <style>{`
        .ag-theme-balham .ag-header-cell {
            padding: 0 !important; /* Enlever le padding par défaut pour que notre header prenne toute la place */
        }
        .ag-theme-balham .ag-header-cell-label {
            width: 100%;
            height: 100%;
            padding: 0;
        }
        .weekend-cell {
            background-color: #fafafa; /* Légèrement grisé pour les weekends si vide */
        }
        /* Bordures de grille plus douces */
        .ag-theme-balham .ag-root-wrapper { border: none; }
        .ag-theme-balham .ag-row { border-bottom-color: #f1f5f9; }
        .ag-theme-balham .ag-header { border-bottom-color: #e2e8f0; background-color: white; }
      `}</style>

      <AgGridReact 
        rowData={data || []} 
        columnDefs={columnDefs} 
        components={components} // Enregistrement des composants custom
        defaultColDef={{ 
            resizable: true, 
            sortable: false, 
            filter: false,
           // suppressMenu: true // Pas de menu contextuel sur les headers
        }}
        // HAUTEURS
        headerHeight={140} // ⚠️ Très haut pour loger les 4 lignes d'infos !
        rowHeight={45}     // Un peu plus haut pour loger le compteur agent
      />
    </div>
  );
};

export default PlanningTable;