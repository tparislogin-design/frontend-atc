import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
// CORRECTION 1 : On ajoute "type" explicitement
import type { ColDef, CellClassParams } from 'ag-grid-community'; 
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

interface PlanningTableProps {
  data: any[];
  year: number;
}

const PlanningTable: React.FC<PlanningTableProps> = ({ data, year }) => {

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!data || data.length === 0) return [];
    
    const cols: ColDef[] = [{
      field: 'Agent',
      pinned: 'left',
      width: 100,
      cellStyle: { fontWeight: 'bold', backgroundColor: '#f8fafc', borderRight: '2px solid #e2e8f0' }
    }];

    const keys = Object.keys(data[0]).filter(k => k !== 'Agent');
    
    keys.forEach(dayStr => {
      const dayNum = parseInt(dayStr);
      const date = new Date(year, 0, dayNum); 
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        field: dayStr,
        headerName: dayName,
        width: 65,
        editable: true,
        headerClass: isWeekend ? 'weekend-header' : '',
        // CORRECTION 2 : On force le type de retour à "any" pour ignorer les erreurs CSS strictes
        cellStyle: (params: CellClassParams): any => {
          const val = params.value;
          
          // Style par défaut commun pour éviter les objets incomplets
          const baseStyle = { textAlign: 'center', borderRight: '1px solid #eee' };

          if (val === 'M') return { ...baseStyle, backgroundColor: '#fff7ed', color: '#9a3412', fontWeight: 'bold' };
          if (['J1', 'J2', 'J3'].includes(val)) return { ...baseStyle, backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold' };
          if (['A1', 'A2'].includes(val)) return { ...baseStyle, backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 'bold' };
          if (val === 'S') return { ...baseStyle, backgroundColor: '#fef2f2', color: '#991b1b', fontWeight: 'bold' };
          
          if (val === 'OFF') return { ...baseStyle, backgroundColor: '#ffffff', color: '#cbd5e1', fontSize: '0.8em' };
          if (val === 'C') return { ...baseStyle, backgroundColor: '#f1f5f9', color: '#64748b', fontStyle: 'italic' };
          
          return baseStyle;
        }
      });
    });
    return cols;
  }, [data, year]);

  return (
    <div className="ag-theme-balham" style={{ height: 600, width: '100%' }}>
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={{ resizable: true, suppressMenu: true, sortable: false }}
        headerHeight={40}
        rowHeight={35}
      />
    </div>
  );
};

export default PlanningTable;