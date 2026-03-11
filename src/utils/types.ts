export interface AppConfig {
  ANNEE: number;
  CONTROLEURS: string[];
  CONTROLLERS_AFFECTES_BUREAU?: string[];
  CONTROLLERS_PARITE_STRICTE?: string[];
  AGENT_WORK_RATES?: {[agentName: string]: number };
  AGENT_BALANCES?: { [agentName: string]: number }; 
  VACATIONS: {
    [code: string]: {
      debut: number;
      fin: number;
    };
  };
  CYCLES?: {
    [agentName: string]: {
      OR: string[][];
      ARGENT: string[][];
      STRICT_MODE?: boolean;
      BONUS_OR?: number;
      BONUS_ARGENT?: number;
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
    MAX_SHIFT_TOLERANCE?: number;
    LOCKED_UNTIL_DAY?: number; // <--- NOUVEAU
  };
}