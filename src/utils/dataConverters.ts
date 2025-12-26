export const convertPreAssignmentsToRows = (preAssignments: any) => {
    // Si pas de données, on renvoie une liste vide
    if (!preAssignments || Object.keys(preAssignments).length === 0) return [];

    const rows: any[] = [];

    // On parcourt chaque agent (clé du dictionnaire)
    Object.keys(preAssignments).forEach(agent => {
        const row: any = { Agent: agent };
        
        // On récupère les jours associés à cet agent
        const dayData = preAssignments[agent];
        
        if (dayData) {
            Object.keys(dayData).forEach(dayStr => {
                const wishes = dayData[dayStr];
                
                // Si c'est une liste (ex: ["A1", "A2"]), on affiche "A1/A2"
                // Si c'est une chaîne simple, on l'affiche telle quelle
                if (Array.isArray(wishes)) {
                    row[dayStr] = wishes.join('/'); 
                } else {
                    row[dayStr] = wishes;
                }
            });
        }
        rows.push(row);
    });

    return rows;
};