import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

interface PlanningTableProps { data: any[]; year: number; }

const PlanningTable: React.FC<PlanningTableProps> = ({ data, year }) => {
  const columnDefs = useMemo<ColDef[]>(() => {
    if (!data || data.length === 0) return [];
    const cols: ColDef[] = [{ field: 'Agent', pinned: 'left', width: 100, cellStyle: { fontWeight: 'bold' } }];
    Object.keys(data[0]).filter(k => k !== 'Agent').forEach(dayStr => {
      const date = new Date(year, 0, parseInt(dayStr));
      const isWe = date.getDay() === 0 || date.getDay() === 6;
      cols.push({
        field: dayStr,
        headerName: `${date.getDate()}/${date.getMonth()+1}`,
        width: 60,
        cellStyle: params => {
          if (params.value === 'M') return { backgroundColor: '#fff7ed', color: '#9a3412' };
          if (params.value === 'S') return { backgroundColor: '#fef2f2', color: '#991b1b' };
          if (params.value === 'OFF') return { color: '#ccc' };
          return { textAlign: 'center' };
        },
        headerClass: isWe ? 'weekend-header' : ''
      });
    });
    return cols;
  }, [data, year]);

  return (
    <div className="ag-theme-balham" style={{ height: 600, width: '100%' }}>
      <AgGridReact rowData={data} columnDefs={columnDefs} />
    </div>
  );
};
export default PlanningTable;