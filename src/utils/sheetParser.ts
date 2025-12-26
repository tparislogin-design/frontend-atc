import Papa from 'papaparse';

// Liste des codes "Standards" que le moteur connait.
// Tout ce qui N'EST PAS ici (ex: FSAU, B, FORM, SIMU...) deviendra "STAGE".
const KNOWN_CODES: Record<string, string[]> = {
    'A': ['A1', 'A2'], 
    'S': ['S'], 
    'M': ['M'],
    'J': ['J1', 'J2', 'J3'], 
    'J1': ['J1'], 'J2': ['J2'], 'J3': ['J3'],
    'A1': ['A1'], 'A2': ['A2'],
    'O': ['OFF'], 
    'C': ['C'], 
    'RIEN': ['OFF'], // La ligne bleue "RIEN" sur ton image sera ignorée
    '': ['OFF']
};

export const parseGoogleSheet = async (url: string, startDay: number, endDay: number): Promise<any> => {
  console.log(`📡 Analyse de l'image pour J${startDay} à J${endDay}...`);

  // Détection du chevauchement d'année (Ex: Du jour 360 au jour 10)
  // Sur ton image, on voit bien 365 suivi de 1.
  const isCrossover = startDay > endDay; 

  // Nettoyage de l'URL pour avoir le CSV
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
        throw new Error("Le lien n'est pas public (HTML reçu). Changez le partage en 'Public'.");
    }

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          if (!rows || rows.length < 5) { reject("Fichier vide ou trop court"); return; }

          const preAssignments: any = {};
          
          // --- 1. REPERAGE DE LA LIGNE DES JOURS (Ligne 4 sur ton image) ---
          let dayRowIndex = -1;
          
          // On cherche la ligne qui contient le numéro du jour de début
          // Ex: Si tu demandes le jour 1, on cherche la ligne qui a une cellule "1"
          for (let i = 0; i < 20; i++) {
            // .some() parcourt toutes les cellules de la ligne
            // On trim() pour éviter les espaces invisibles (" 1 " devient "1")
            if (rows[i].some(cell => cell.trim() === startDay.toString())) {
                dayRowIndex = i;
                console.log(`✅ Ligne des jours identifiée : Index ${i} (Contient ${startDay})`);
                break;
            }
          }

          if (dayRowIndex === -1) {
            reject(`Impossible de trouver la ligne contenant le jour ${startDay}. Vérifiez que la période demandée est bien dans le fichier.`);
            return;
          }

          // --- 2. MAPPING DES COLONNES (Quelle colonne = Quel jour ?) ---
          const colToDay: Record<number, number> = {};
          
          rows[dayRowIndex].forEach((cell, idx) => {
            const val = parseInt(cell.trim());
            
            if (!isNaN(val)) {
                // On ne garde que les colonnes qui sont dans la période demandée
                let isIncluded = false;
                
                if (isCrossover) {
                    // Cas Spécial (Ton image) : Période [360 -> 10]
                    // On prend si >= 360 OU <= 10
                    if (val >= startDay || val <= endDay) isIncluded = true;
                } else {
                    // Cas Standard : Période [1 -> 10]
                    if (val >= startDay && val <= endDay) isIncluded = true;
                }

                if (isIncluded) {
                    colToDay[idx] = val;
                }
            }
          });
          
          console.log(`Colonnes valides trouvées : ${Object.keys(colToDay).length}`);

          // --- 3. LECTURE DES AGENTS (Lignes suivantes) ---
          let agentsFound = 0;
          for (let i = dayRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            const agentName = row[0] ? row[0].trim() : "";

            // Filtres pour ignorer les lignes inutiles (Ligne "RIEN", Ligne "Dispo", Lignes vides)
            if (!agentName || agentName.length > 5 || agentName === "Dispo" || agentName === "RIEN") continue;

            preAssignments[agentName] = {};
            agentsFound++;

            // On parcourt seulement les colonnes identifiées comme des jours valides
            for (const [colIdxStr, dayNum] of Object.entries(colToDay)) {
                const colIdx = parseInt(colIdxStr);
                const cellVal = row[colIdx];

                if (cellVal && cellVal.trim() !== "") {
                    const rawCode = cellVal.trim().toUpperCase();
                    
                    // Gestion des barres (ex: "O/A/S")
                    const parts = rawCode.split('/').map(p => p.trim());
                    let shifts: string[] = [];
                    
                    parts.forEach(p => {
                        if (p === "") return;
                        
                        // C'EST ICI QUE TA REGLE S'APPLIQUE :
                        if (KNOWN_CODES[p]) {
                            // Si c'est connu (M, J1, C...), on prend le code
                            shifts.push(...KNOWN_CODES[p]);
                        } else {
                            // Si c'est inconnu (FSAU, B, etc...), c'est un STAGE
                            shifts.push('STAGE');
                        }
                    });
                    
                    if (shifts.length > 0) {
                        preAssignments[agentName][dayNum] = [...new Set(shifts)];
                    }
                }
            }
          }
          console.log(`✅ Import réussi : ${agentsFound} agents.`);
          resolve(preAssignments);
        },
        error: (err: any) => {
            console.error("Erreur PapaParse:", err);
            reject(`Erreur CSV : ${err.message || err}`);
        }
      });
    });
  } catch (error) {
    throw error;
  }
};