export const decimalToTime = (decimal: number): string => {
  if (decimal === undefined || decimal === null) return "00:00";
  const hours = Math.floor(decimal);
  const minutes = Math.round((decimal - hours) * 60);
  return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
};

export const timeToDecimal = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h + m / 60;
};