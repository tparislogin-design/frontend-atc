import Papa from 'papaparse';

const KNOWN_CODES: Record<string, string[]> = {
    'A': ['A1', 'A2'], 'S': ['S'], 'M': ['M'],
    'J': ['J1', 'J2', 'J3'], 'J1': ['J1'], 'J2': ['J2'], 'J3': ['J3'],
    'A1': ['A1'], 'A2': ['A2'],
    'O': ['OFF'], 'C': ['C'], 'RIEN': ['OFF'], '': ['OFF']
};

export const parseGoogleSheet = async (url: string, startDay: number, endDay: number, year: number): Promise<any> => {
  const csvUrl = url.replace('/edit', '/export?format=csv');
  const response = await fetch(csvUrl);
  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      complete: (results) => {
        const rows = results.data as string[][];
        const preAssignments: any = {};
        
        let dayRowIndex = -1;
        for (let i = 0; i < 15; i++) {
          if (rows[i] && rows[i].includes(startDay.toString())) { dayRowIndex = i; break; }
        }
        if (dayRowIndex === -1) { reject("Ligne des jours introuvable"); return; }

        const colToDay: Record<number, number> = {};
        rows[dayRowIndex].forEach((cell, idx) => {
          const val = parseInt(cell);
          if (!isNaN(val)) colToDay[idx] = val;
        });

        for (let i = dayRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          const agent = row[0];
          if (!agent || agent.length > 5) continue;

          preAssignments[agent] = {};
          row.forEach((cell, colIdx) => {
            const day = colToDay[colIdx];
            if (day !== undefined && cell) {
                const parts = cell.trim().toUpperCase().split('/').map(p => p.trim());
                let shifts: string[] = [];
                
                parts.forEach(p => {
                    if (p === "") return;
                    // SI CONNU -> ON GARDE, SINON -> STAGE
                    if (KNOWN_CODES[p]) shifts.push(...KNOWN_CODES[p]);
                    else shifts.push('STAGE');
                });
                
                if (shifts.length > 0) preAssignments[agent][day] = [...new Set(shifts)];
            }
          });
        }
        resolve(preAssignments);
      },
      error: (err: any) => reject(err)
    });
  });
};