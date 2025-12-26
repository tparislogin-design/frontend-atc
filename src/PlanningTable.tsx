import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef } from 'ag-grid-community'; 
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

// Enregistrement obligatoire pour AgGrid v35+
ModuleRegistry.registerModules([ AllCommunityModule ]);

interface PlanningTableProps {
  data: any[];
  year: number;
  startDay: number; // Requis pour forcer l'affichage des colonnes
  endDay: number;   // Requis pour forcer l'affichage des colonnes
  isDesiderataView?: boolean;
}

const PlanningTable: React.FC<PlanningTableProps> = ({ 
  data, year, startDay, endDay, isDesiderataView = false 
}) => {

  const columnDefs = useMemo<ColDef[]>(() => {
    // 1. Colonne Agent (Toujours fixe)
    const cols: ColDef[] = [{
      field: 'Agent', 
      pinned: 'left', 
      width: 110,
      cellStyle: { fontWeight: 'bold', backgroundColor: '#f8fafc', borderRight: '2px solid #ccc' }
    }];

    // 2. Génération des Jours (Basée sur la période, pas sur les données)
    const daysRange: number[] = [];
    
    // Gestion chevauchement année (Ex: 360 -> 10) ou normal (1 -> 28)
    if (startDay <= endDay) {
        for (let i = startDay; i <= endDay; i++) daysRange.push(i);
    } else {
        // Cas complexe : Fin d'année + Début d'année suivante
        for (let i = startDay; i <= 365; i++) daysRange.push(i); // Note: 366 si bissextile, simplifié ici
        for (let i = 1; i <= endDay; i++) daysRange.push(i);
    }

    daysRange.forEach(dayNum => {
      const dayStr = dayNum.toString();
      
      // Calcul de la date pour l'en-tête
      const date = new Date(year, 0, dayNum); 
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        field: dayStr, // La clé de donnée correspond au numéro du jour (string)
        headerName: `${date.getDate()}/${date.getMonth()+1}`, // Ex: 5/1
        width: 65,
        headerClass: isWeekend ? 'weekend-header' : '',
        
        // Style dynamique
        cellStyle: (params: any) => {
          const val = params.value;
          const base = { textAlign: 'center', borderRight: '1px solid #eee' };

          // --- MODE DÉSIDÉRATA (Vue Jaune) ---
          if (isDesiderataView) {
              if (!val) return base; // Case vide
              return { 
                  ...base, 
                  backgroundColor: '#fffbeb', color: '#b45309', 
                  fontStyle: 'italic', fontSize: '0.8em'
              };
          }

          // --- MODE PLANNING (Vue Resultat) ---
          if (val === 'M') return { ...base, backgroundColor: '#fff7ed', color: '#9a3412', fontWeight: 'bold' };
          if (['J1', 'J2', 'J3'].includes(val)) return { ...base, backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold' };
          if (['A1', 'A2'].includes(val)) return { ...base, backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 'bold' };
          if (val === 'S') return { ...base, backgroundColor: '#fef2f2', color: '#991b1b', fontWeight: 'bold' };
          
          // Nouveaux codes : STAGE et CONGES
          if (val === 'STAGE') return { ...base, backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: 'bold', borderLeft: '3px solid #a855f7' };
          if (val === 'C') return { ...base, backgroundColor: '#e2e8f0', color: '#475569', fontStyle: 'italic', fontWeight: 'bold' };
          
          if (val === 'OFF') return { ...base, backgroundColor: '#ffffff', color: '#cbd5e1', fontSize: '0.8em' };
          
          return base;
        }
      });
    });
    return cols;
  }, [year, startDay, endDay, isDesiderataView]); // Recalcule si les dates changent

  return (
    <div className="ag-theme-balham" style={{ height: 600, width: '100%' }}>
      <AgGridReact 
        // Si data est null/undefined, on passe un tableau vide pour afficher quand même les colonnes
        rowData={data || []} 
        columnDefs={columnDefs} 
        defaultColDef={{ resizable: true, sortable: false, filter: false }}
        headerHeight={40} 
        rowHeight={35} 
      />
    </div>
  );
};

export default PlanningTable;