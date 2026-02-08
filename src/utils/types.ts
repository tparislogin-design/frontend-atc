export interface AppConfig {
  ANNEE: number;
  CONTROLEURS: string[];
  CONTROLLERS_AFFECTES_BUREAU?: string[]; // "?" car peut être vide au début
  VACATIONS: {
    [code: string]: {
      debut: number;
      fin: number;
    };
  };
  // AJOUTER CE BLOC :
  CYCLES?: {
    [agentName: string]: {
      OR: string[][];     // Tableau de paires de strings (ex: [["M", "S"]])
      ARGENT: string[][];
    };
  };
  CONTRAT: {
    MIN_REST_HOURS: number;
    MAX_CONSECUTIVE_SHIFTS: number;
    MAX_HOURS_WEEK_CALENDAR: number;
    MAX_HOURS_7_ROLLING: number;
    MAX_BACKTRACKS?: number;
    SOLVER_TIME_LIMIT?: number;
    BUFFER_DAYS?: number;
    REQUIRE_2_CONSECUTIVE_REST_DAYS?: boolean;
  };
}