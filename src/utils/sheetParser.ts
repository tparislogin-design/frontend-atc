import Papa from 'papaparse';

const KNOWN_CODES: Record<string, string[]> = {
    'A': ['A1', 'A2'], 'S': ['S'], 'M': ['M'],
    'J': ['J1', 'J2', 'J3'], 'J1': ['J1'], 'J2': ['J2'], 'J3': ['J3'],
    'A1': ['A1'], 'A2': ['A2'],
    'O': ['OFF'], 'C': ['C'], 'RIEN': ['OFF'], '': ['OFF']
};

export const parseGoogleSheet = async (url: string, startDay: number, endDay: number): Promise<any> => {
  console.log(`📡 Téléchargement CSV... Recherche J${startDay} à J${endDay}`);

  const isCrossover = startDay > endDay; 

  let csvUrl = url;
  if (url.includes('/edit')) {
      csvUrl = url.replace(/\/edit.*$/, '/export?format=csv');
  } else if (!url.includes('export?format=csv')) {
      csvUrl = `${url}/export?format=csv`;
  }

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`Erreur réseau: ${response.status}`);
    const csvText = await response.text();

    if (csvText.trim().startsWith('<!DOCTYPE html>')) {
        throw new Error("Le lien n'est pas public (HTML reçu).");
    }

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          if (!rows || rows.length < 5) { reject("Fichier vide"); return; }

          const preAssignments: any = {};
          
          let dayRowIndex = -1;
          const nextDayCheck = startDay >= 365 ? 1 : startDay + 1;

          for (let i = 0; i < 20; i++) {
            // CORRECTION : Suppression de rowStr ici
            
            // On regarde si la case contient juste le chiffre (ex: "1" et "2")
            const hasStart = rows[i].some(cell => cell.trim() === startDay.toString());
            const hasNext = rows[i].some(cell => cell.trim() === nextDayCheck.toString());

            if (hasStart && hasNext) {
              dayRowIndex = i;
              console.log(`✅ Ligne des jours identifiée : Index ${i}`);
              break;
            }
          }

          if (dayRowIndex === -1) {
             // Tentative de secours (juste le startDay)
             for (let i = 0; i < 20; i++) {
                if (rows[i].some(cell => cell.trim() === startDay.toString())) {
                    dayRowIndex = i;
                    console.warn(`⚠️ Ligne identifiée (mode souple) : Index ${i}`);
                    break;
                }
             }
          }

          if (dayRowIndex === -1) {
            reject(`Impossible de trouver la ligne contenant le jour ${startDay}.`);
            return;
          }

          const colToDay: Record<number, number> = {};
          rows[dayRowIndex].forEach((cell, idx) => {
            const val = parseInt(cell.trim());
            if (!isNaN(val)) {
                let isIncluded = false;
                if (isCrossover) {
                    if (val >= startDay || val <= endDay) isIncluded = true;
                } else {
                    if (val >= startDay && val <= endDay) isIncluded = true;
                }
                if (isIncluded) colToDay[idx] = val;
            }
          });
          
          console.log(`Colonnes mappées : ${Object.keys(colToDay).length} jours.`);

          let agentsFound = 0;
          for (let i = dayRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const agentName = row[0] ? row[0].trim() : "";

            if (!agentName || agentName.length > 6 || agentName === "Dispo") continue;

            preAssignments[agentName] = {};
            agentsFound++;

            for (const [colIdxStr, dayNum] of Object.entries(colToDay)) {
                const colIdx = parseInt(colIdxStr);
                const cellVal = row[colIdx];

                if (cellVal && cellVal.trim() !== "") {
                    const rawCode = cellVal.trim().toUpperCase();
                    const parts = rawCode.split('/').map(p => p.trim());
                    let shifts: string[] = [];
                    
                    parts.forEach(p => {
                        if (p === "") return;
                        if (KNOWN_CODES[p]) shifts.push(...KNOWN_CODES[p]);
                        else shifts.push('STAGE');
                    });
                    
                    if (shifts.length > 0) {
                        preAssignments[agentName][dayNum] = [...new Set(shifts)];
                    }
                }
            }
          }
          console.log(`✅ Import terminé : ${agentsFound} agents.`);
          resolve(preAssignments);
        },
        // On utilise 'err' dans le console.error et dans le message de rejet
        error: (err: any) => {
            console.error("Erreur interne PapaParse :", err); 
            reject(`Erreur parsing CSV : ${err.message || err}`); 
        }
      });
    });
  } catch (error) {
    throw error;
  }
};