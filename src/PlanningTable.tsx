import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellClassParams } from 'ag-grid-community';
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

interface PlanningTableProps {
  data: any[];
  year: number;
}

const PlanningTable: React.FC<PlanningTableProps> = ({ data, year }) => {

  // --- DEBUG : Vérifier ce qu'on reçoit ---
  console.log("PlanningTable REÇOIT :", data);

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!data || data.length === 0) {
      console.warn("PlanningTable: Données vides !");
      return [];
    }
    
    console.log("PlanningTable: Génération des colonnes...");
    console.log("Clés détectées :", Object.keys(data[0]));

    // 1. Colonne Agent
    const cols: ColDef[] = [{
      field: 'Agent',
      pinned: 'left',
      width: 120,
      cellStyle: { fontWeight: 'bold', backgroundColor: '#f8fafc', borderRight: '2px solid #ccc' }
    }];

    // 2. Colonnes Jours
    const keys = Object.keys(data[0]).filter(k => k !== 'Agent');
    
    // On trie les clés (qui sont des numéros de jours en string) pour qu'elles soient dans l'ordre
    keys.sort((a, b) => parseInt(a) - parseInt(b));

    keys.forEach(dayStr => {
      const dayNum = parseInt(dayStr);
      // Vérification sécurité date
      if (isNaN(dayNum)) return;

      const date = new Date(year, 0, dayNum); 
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' });
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      cols.push({
        field: dayStr,
        headerName: dayName,
        width: 60,
        editable: true,
        headerClass: isWeekend ? 'weekend-header' : '',
        cellStyle: (params: CellClassParams): any => {
          const val = params.value;
          const base = { textAlign: 'center', borderRight: '1px solid #eee' };

          if (val === 'M') return { ...base, backgroundColor: '#fff7ed', color: '#9a3412', fontWeight: 'bold' };
          if (['J1', 'J2', 'J3'].includes(val)) return { ...base, backgroundColor: '#f0fdf4', color: '#166534', fontWeight: 'bold' };
          if (['A1', 'A2'].includes(val)) return { ...base, backgroundColor: '#eff6ff', color: '#1e40af', fontWeight: 'bold' };
          if (val === 'S') return { ...base, backgroundColor: '#fef2f2', color: '#991b1b', fontWeight: 'bold' };
          if (val === 'OFF') return { ...base, backgroundColor: '#ffffff', color: '#cbd5e1', fontSize: '0.8em' };
          if (val === 'C') return { ...base, backgroundColor: '#f1f5f9', color: '#64748b', fontStyle: 'italic' };
          
          return base;
        }
      });
    });
    
    console.log("Colonnes générées :", cols.length);
    return cols;
  }, [data, year]);

  // Si pas de colonnes, on affiche un message d'erreur
  if (columnDefs.length === 0) {
    return <div style={{color:'red', padding: 20}}>Erreur: Aucune colonne générée. Vérifiez la console (F12).</div>
  }

  return (
    // J'ai ajouté une bordure rouge et un background pour être sûr qu'on le voit
    <div className="ag-theme-balham" style={{ height: 600, width: '100%', border: '1px solid blue' }}>
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={{ resizable: true, sortable: false }}
        headerHeight={40}
        rowHeight={35}
      />
    </div>
  );
};

export default PlanningTable;