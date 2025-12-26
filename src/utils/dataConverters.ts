export const convertPreAssignmentsToRows = (preAssignments: any, year: number, startDay: number, endDay: number) => {
    if (!preAssignments || Object.keys(preAssignments).length === 0) return [];

    const rows: any[] = [];

    // On parcourt chaque agent trouvé dans le fichier importé
    Object.keys(preAssignments).forEach(agent => {
        const row: any = { Agent: agent };
        
        // On remplit les jours avec les demandes
        // format: { '335': ['M'], '336': ['OFF', 'A1'] }
        const dayData = preAssignments[agent];
        
        if (dayData) {
            Object.keys(dayData).forEach(dayStr => {
                const wishes = dayData[dayStr];
                // Si c'est une liste (ex: ["A1", "A2"]), on la transforme en string "A1/A2"
                // Si c'est "OFF", on écrit "OFF"
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