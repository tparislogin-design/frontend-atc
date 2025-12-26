import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';

// 1. Imports obligatoires pour AgGrid v35+
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef, CellClassParams } from 'ag-grid-community'; // Import Type

// Styles CSS
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

// 2. Enregistrement des modules (Une seule fois)
ModuleRegistry.registerModules([ AllCommunityModule ]);

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

  const columnDefs = useMemo<ColDef[]>(() => {
    // A. Colonne Agent (Fixe)
    const cols: ColDef[] = [{
      field: 'Agent', 
      pinned: 'left', 
      width: 110,
      cellStyle: { fontWeight: 'bold', backgroundColor: '#f8fafc', borderRight: '2px solid #ccc' }
    }];

    // B. Calcul des jours à afficher (Basé sur la période demandée)
    const daysRange: number[] = [];
    
    // Gestion du chevauchement d'année (Ex: 360 -> 10)
    if (startDay <= endDay) {
        for (let i = startDay; i <= endDay; i++) daysRange.push(i);
    } else {
        // Fin d'année + Début d'année suivante
        for (let i = startDay; i <= 365; i++) daysRange.push(i);
        for (let i = 1; i <= endDay; i++) daysRange.push(i);
    }

    // C. Création des colonnes Jours
    daysRange.forEach(dayNum => {
      const dayStr = dayNum.toString();
      
      // Date pour l'en-tête (ex: "Lun. 05")
      const date = new Date(year, 0, dayNum); 
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        field: dayStr,
        headerName: dayName,
        width: 65,
        headerClass: isWeekend ? 'weekend-header' : '',
        editable: true,
        
        // D. Gestion des Couleurs (Le plus important !)
        cellStyle: (params: any): any => {
          const val = params.value;
          const base = { textAlign: 'center', borderRight: '1px solid #eee' };

          // --- 1. MODE DÉSIDÉRATA (Post-it Jaune) ---
          if (isDesiderataView) {
              if (!val) return base;
              return { 
                  ...base, 
                  backgroundColor: '#fffbeb', color: '#b45309', 
                  fontStyle: 'italic', fontSize: '0.85em'
              };
          }

          // --- 2. MODE RÉSULTAT (Planning Final) ---
          
          // Codes Standards (Couleurs fixes)
          if (val === 'M') return { ...base, backgroundColor: '#fff7ed', color: '#9a3412', fontWeight: 'bold' };
          if (['J1', 'J2', 'J3'].includes(val)) return { ...base, backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold' };
          if (['A1', 'A2'].includes(val)) return { ...base, backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 'bold' };
          if (val === 'S') return { ...base, backgroundColor: '#fef2f2', color: '#991b1b', fontWeight: 'bold' };
          
          // Codes RH
          if (val === 'OFF') return { ...base, backgroundColor: '#ffffff', color: '#cbd5e1', fontSize: '0.8em' };
          if (val === 'C') return { ...base, backgroundColor: '#e2e8f0', color: '#475569', fontStyle: 'italic', fontWeight: 'bold' };
          
          // CAS GÉNÉRIQUE : Tout autre code non-vide (FSAU, B, ANG, STAGE...) -> VIOLET
          if (val && val !== '') {
              return { 
                  ...base, 
                  backgroundColor: '#f3e8ff', // Violet clair
                  color: '#6b21a8',           // Violet foncé
                  fontWeight: 'bold', 
                  borderLeft: '3px solid #a855f7' // Marqueur visuel
              };
          }
          
          return base;
        }
      });
    });
    return cols;
  }, [year, startDay, endDay, isDesiderataView]);

  return (
    <div className="ag-theme-balham" style={{ height: 600, width: '100%' }}>
      <AgGridReact 
        // Important : on passe [] si data est null pour afficher quand même la grille vide
        rowData={data || []} 
        columnDefs={columnDefs} 
        defaultColDef={{ 
            resizable: true, 
            sortable: false, 
            filter: false 
        }}
        headerHeight={40} 
        rowHeight={35} 
      />
    </div>
  );
};

export default PlanningTable;