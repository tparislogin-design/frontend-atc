import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'; 
import type { ColDef } from 'ag-grid-community'; 
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

ModuleRegistry.registerModules([ AllCommunityModule ]);

interface PlanningTableProps {
  data: any[];
  year: number;
  isDesiderataView?: boolean; // NOUVEAU PARAMÈTRE
}

const PlanningTable: React.FC<PlanningTableProps> = ({ data, year, isDesiderataView = false }) => {

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!data || data.length === 0) return [];
    
    // Colonne Agent
    const cols: ColDef[] = [{
      field: 'Agent', pinned: 'left', width: 110,
      cellStyle: { fontWeight: 'bold', backgroundColor: '#f8fafc', borderRight: '2px solid #ccc' }
    }];

    // Colonnes Jours
    const keys = Object.keys(data[0]).filter(k => k !== 'Agent');
    keys.sort((a, b) => parseInt(a) - parseInt(b));

    keys.forEach(dayStr => {
      const dayNum = parseInt(dayStr);
      if (isNaN(dayNum)) return;
      const date = new Date(year, 0, dayNum); 
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        field: dayStr,
        headerName: `${date.getDate()}/${date.getMonth()+1}`,
        width: 65, // Un peu plus large pour "A1/A2"
        headerClass: isWeekend ? 'weekend-header' : '',
        
        cellStyle: (params: any) => {
          const val = params.value;
          const base = { textAlign: 'center', borderRight: '1px solid #eee' };

          // --- MODE DÉSIDÉRATA (VISUALISATION) ---
          if (isDesiderataView) {
              if (!val) return base; // Pas de demande
              // Style "Post-it" jaune pour les demandes
              return { 
                  ...base, 
                  backgroundColor: '#fffbeb', // Jaune très clair
                  color: '#b45309',           // Jaune foncé
                  fontStyle: 'italic',
                  fontSize: '0.8em'
              };
          }

          // --- MODE PLANNING (RÉSULTAT) ---
          if (val === 'M') return { ...base, backgroundColor: '#fff7ed', color: '#9a3412', fontWeight: 'bold' };
          if (['J1', 'J2', 'J3'].includes(val)) return { ...base, backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold' };
          if (['A1', 'A2'].includes(val)) return { ...base, backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 'bold' };
          if (val === 'S') return { ...base, backgroundColor: '#fef2f2', color: '#991b1b', fontWeight: 'bold' };
          if (val === 'STAGE') return { ...base, backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: 'bold', borderLeft: '3px solid #a855f7' };
          if (val === 'C') return { ...base, backgroundColor: '#e2e8f0', color: '#475569', fontStyle: 'italic', fontWeight: 'bold' };
          if (val === 'OFF') return { ...base, backgroundColor: '#ffffff', color: '#cbd5e1', fontSize: '0.8em' };
          
          return base;
        }
      });
    });
    return cols;
  }, [data, year, isDesiderataView]);

  if (!data || data.length === 0) return null;

  return (
    <div className="ag-theme-balham" style={{ height: 600, width: '100%' }}>
      <AgGridReact 
        rowData={data} 
        columnDefs={columnDefs} 
        defaultColDef={{ resizable: true, sortable: false, filter: false }}
        headerHeight={40} 
        rowHeight={35} 
      />
    </div>
  );
};

export default PlanningTable;