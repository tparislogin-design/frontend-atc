// src/utils/timeConverters.ts

export const decimalToTime = (decimal: number): string => {
    if (decimal === undefined || decimal === null || isNaN(decimal)) return "0h00";
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    // Affiche 8h00 au lieu de 8h0
    return `${h}h${m < 10 ? '0' : ''}${m}`;
};

export const timeToDecimal = (str: string): number => {
    if (!str) return 0;
    // On remplace la virgule par un point et on nettoie
    let s = str.toLowerCase().replace(',', '.').trim();
    
    // Cas 1 : Décimal direct (ex: 8.5)
    if (s.includes('.') && !s.includes('h') && !s.includes(':')) {
        return parseFloat(s);
    }
    
    // Cas 2 : Format Heure (8h30, 8:30)
    s = s.replace(':', 'h');
    const parts = s.split('h');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    
    // Retourne le décimal (ex: 8 + 0.5 = 8.5)
    return h + (m / 60);
};