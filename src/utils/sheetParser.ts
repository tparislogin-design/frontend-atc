import Papa from 'papaparse';

const KNOWN_CODES: Record<string, string[]> = {
    'A': ['A1', 'A2'], 
    'S': ['S'], 
    'M': ['M'],
    'J': ['J1', 'J2', 'J3'], 
    'J1': ['J1'], 'J2': ['J2'], 'J3': ['J3'],
    'A1': ['A1'], 'A2': ['A2'],
    'O': ['OFF'], 
    'C': ['C'], 
    'RIEN': ['OFF'], 
    '': ['OFF']
};

// MODIFICATION : On retire "year" des arguments
export const parseGoogleSheet = async (url: string, startDay: number, endDay: number): Promise<any> => {
  console.log(`📡 Téléchargement CSV pour J${startDay} à J${endDay}...`);

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
        throw new Error("Le lien n'est pas public (HTML reçu au lieu de CSV).");
    }

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          if (!rows || rows.length < 5) { reject("Fichier vide"); return; }

          const preAssignments: any = {};
          
          // 1. Trouver la ligne des jours
          let dayRowIndex = -1;
          for (let i = 0; i < 20; i++) {
            if (rows[i] && rows[i].includes(startDay.toString())) {
              dayRowIndex = i;
              break;
            }
          }

          if (dayRowIndex === -1) {
            reject(`Jour de début (${startDay}) introuvable dans les entêtes.`);
            return;
          }

          // 2. Mapper les colonnes
          const colToDay: Record<number, number> = {};
          rows[dayRowIndex].forEach((cell, idx) => {
            const val = parseInt(cell);
            // MODIFICATION : On ne garde que les jours dans la période demandée
            if (!isNaN(val) && val >= startDay && val <= endDay) {
                colToDay[idx] = val;
            }
          });

          // 3. Lire les agents
          let agentsFound = 0;
          for (let i = dayRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const agentName = row[0] ? row[0].trim() : "";

            if (!agentName || agentName.length > 6 || agentName === "Dispo") continue;

            preAssignments[agentName] = {};
            agentsFound++;

            row.forEach((cellVal, colIdx) => {
              const dayNum = colToDay[colIdx];
              
              // Si la colonne correspond à un jour valide (filtré ci-dessus)
              if (dayNum !== undefined && cellVal && cellVal.trim() !== "") {
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
            });
          }
          console.log(`✅ Import terminé : ${agentsFound} agents sur la période J${startDay}-J${endDay}.`);
          resolve(preAssignments);
        },
        error: () => reject("Erreur parsing CSV")
      });
    });
  } catch (error) {
    throw error;
  }
};