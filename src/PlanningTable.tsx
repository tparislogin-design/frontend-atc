import React, { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';

// --- 1. IMPORTS CRITIQUES (TYPES + MODULES) ---
import { 
  ModuleRegistry, 
  AllCommunityModule 
} from 'ag-grid-community'; 

// "import type" est obligatoire pour les interfaces avec Vite/TS récent
import type { ColDef } from 'ag-grid-community';

// --- 2. ENREGISTREMENT DES MODULES (OBLIGATOIRE v35+) ---
ModuleRegistry.registerModules([ AllCommunityModule ]);

// Imports CSS
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-balham.css";

interface PlanningTableProps {
  data: any[];
  year: number;
}

const PlanningTable: React.FC<PlanningTableProps> = ({ data, year }) => {

  // Debug : Pour être sûr que les données arrivent
  if (data && data.length > 0) {
    console.log("PlanningTable: Rendu avec", data.length, "lignes.");
  }

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!data || data.length === 0) return [];
    
    // A. Colonne Agent (Figée à gauche)
    const cols: ColDef[] = [{
      field: 'Agent',
      pinned: 'left',
      width: 110,
      cellStyle: { fontWeight: 'bold', backgroundColor: '#f8fafc', borderRight: '2px solid #e2e8f0' }
    }];

    // B. Colonnes Jours (Dynamiques)
    const keys = Object.keys(data[0]).filter(k => k !== 'Agent');
    
    // Tri numérique des jours (pour éviter que J10 arrive avant J2)
    keys.sort((a, b) => parseInt(a) - parseInt(b));

    keys.forEach(dayStr => {
      const dayNum = parseInt(dayStr);
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
        
        // Utilisation de "any" pour éviter les erreurs strictes de TypeScript sur le CSS
        cellStyle: (params: any) => {
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
    return cols;
  }, [data, year]);

  // Si pas de données, on n'affiche rien (ou un message)
  if (!data || data.length === 0) return null;

  return (
    <div className="ag-theme-balham" style={{ height: 600, width: '100%' }}>
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={{ 
            resizable: true, 
            sortable: false,
            filter: false // Remplace suppressMenu
        }}
        headerHeight={40}
        rowHeight={35}
      />
    </div>
  );
};

export default PlanningTable;