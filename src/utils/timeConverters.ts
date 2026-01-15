// src/utils/timeConverters.ts

export const decimalToTime = (decimal: number): string => {
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${h}h${m < 10 ? '0' : ''}${m}`;
};

export const timeToDecimal = (str: string): number => {
    if (!str) return 0;
    let s = str.toLowerCase().trim();
    
    // Support décimal direct (ex: 8.5)
    if (s.includes('.') && !s.includes('h') && !s.includes(':')) {
        return parseFloat(s);
    }
    
    // Support H:MM ou HhMM
    s = s.replace(':', 'h');
    const parts = s.split('h');
    const h = parseInt(parts[0]) || 0;
    const m = parseInt(parts[1]) || 0;
    return h + (m / 60);
};