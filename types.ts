export enum CalculationMode {
  VERIFY = 'VERIFY', // Input both ends, calculate slope
  DOWNSTREAM = 'DOWNSTREAM', // Input start + slope, calculate end
  UPSTREAM = 'UPSTREAM', // Input end + slope, calculate start
}

export interface SewerNode {
  id: string;
  tl: number; // Top Level
  il: number; // Invert Level
  depth: number; // Depth (Computed or Input)
}

export interface PipeDef {
  id: string;
  label: string;
  material: string; // New field for filtering
  diameter: number; // mm
  n: number; // Manning's n
  minGradient: number; // 1:X (The flatter limit, e.g., 120)
}

export interface CalculationResult {
  startNode: SewerNode;
  endNode: SewerNode;
  distance: number;
  gradient: number; // 1 : X
  fall: number;
  velocity: number; // m/s (New)
  isCompliant: boolean;
  complianceIssues: string[];
  pipe: PipeDef;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  inputs: {
     ic1: string; tl1: number | ''; il1: number | '';
     ic2: string; tl2: number | ''; il2: number | '';
     distance: number | ''; gradient: number | '';
     pipeId: string;
     mode: CalculationMode;
  };
  result: CalculationResult;
}

export interface PubStandard {
  minSize: number; // mm
  minGradient: number; // 1:X (e.g. 120)
  maxGradient: number; // 1:X (e.g. 30)
  minVelocity: number; // m/s
  maxVelocity: number; // m/s
}