import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';

// CORRECTION ICI : J'ai retiré "CellClassParams" qui ne servait plus
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef } from 'ag-grid-community'; 

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

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
    // 1. Colonne Agent
    const cols: ColDef[] = [{
      field: 'Agent', 
      pinned: 'left', 
      width: 110,
      cellStyle: { fontWeight: 'bold', backgroundColor: '#f8fafc', borderRight: '2px solid #ccc' }
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
      const date = new Date(year, 0, dayNum); 
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        field: dayStr,
        headerName: dayName,
        width: 65,
        headerClass: isWeekend ? 'weekend-header' : '',
        editable: true,
        
        // On utilise "any" ici, donc CellClassParams n'est plus nécessaire
        cellStyle: (params: any): any => {
          const val = params.value;
          const base = { textAlign: 'center', borderRight: '1px solid #eee' };

          // --- MODE DÉSIDÉRATA ---
          if (isDesiderataView) {
              if (!val) return base;
              return { 
                  ...base, 
                  backgroundColor: '#fffbeb', color: '#b45309', 
                  fontStyle: 'italic', fontSize: '0.85em'
              };
          }

          // --- MODE PLANNING ---
          if (val === 'M') return { ...base, backgroundColor: '#fff7ed', color: '#9a3412', fontWeight: 'bold' };
          if (['J1', 'J2', 'J3'].includes(val)) return { ...base, backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold' };
          if (['A1', 'A2'].includes(val)) return { ...base, backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 'bold' };
          if (val === 'S') return { ...base, backgroundColor: '#fef2f2', color: '#991b1b', fontWeight: 'bold' };
          
          if (val === 'OFF') return { ...base, backgroundColor: '#ffffff', color: '#cbd5e1', fontSize: '0.8em' };
          if (val === 'C') return { ...base, backgroundColor: '#e2e8f0', color: '#475569', fontStyle: 'italic', fontWeight: 'bold' };
          
          if (val && val !== '') {
              return { 
                  ...base, 
                  backgroundColor: '#f3e8ff', 
                  color: '#6b21a8',           
                  fontWeight: 'bold', 
                  borderLeft: '3px solid #a855f7' 
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