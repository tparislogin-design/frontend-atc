// src/utils/types.ts

export interface AppConfig {
  ANNEE: number;
  CONTROLEURS: string[];
  CONTROLLERS_AFFECTES_BUREAU: string[];
  VACATIONS: {
    [key: string]: { debut: number; fin: number };
  };
  CONTRAT: {
    MIN_REST_HOURS: number;
    MAX_CONSECUTIVE_SHIFTS: number;
    MAX_HOURS_WEEK_CALENDAR: number;
    MAX_HOURS_7_ROLLING: number;
    MAX_BACKTRACKS: number;
    SOLVER_TIME_LIMIT?: number;
  };
}