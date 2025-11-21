import { PubStandard, PipeDef } from './types';

// Based on PUB Code of Practice
export const PUB_STANDARDS: PubStandard = {
  minSize: 150, 
  minGradient: 120, // Default/Fallback if pipe not specified
  maxGradient: 20,  // 1:20 (Steepest allowed usually)
  minVelocity: 0.8,
  maxVelocity: 2.4,
};

export const DRAIN_LINE_CONSTRAINTS = {
  maxLength: 50, // meters per PUB COP 4.2.1(b)(i)
  minLength: 0,
};

export const IC_STANDARDS = {
  minDepth: 0.75, // meters (750mm) per PUB COP 4.2.1(e)(ii)
};

export const PIPE_OPTIONS: PipeDef[] = [
  // 100mm Pipes REMOVED - Only allowed for Pumping Mains (see PUMPING_PIPES below)

  // 150mm Pipes
  { id: '150-vcp', label: '150mm VCP', material: 'VCP', diameter: 150, n: 0.013, minGradient: 80 },
  { id: '150-di', label: '150mm Ductile Iron', material: 'Ductile Iron', diameter: 150, n: 0.011, minGradient: 100 },
  { id: '150-upvc', label: '150mm UPVC', material: 'UPVC', diameter: 150, n: 0.011, minGradient: 100 },

  // 200mm Pipes
  { id: '200-vcp', label: '200mm VCP', material: 'VCP', diameter: 200, n: 0.013, minGradient: 120 },
  { id: '200-di', label: '200mm Ductile Iron', material: 'Ductile Iron', diameter: 200, n: 0.011, minGradient: 150 },
  { id: '200-upvc', label: '200mm UPVC', material: 'UPVC', diameter: 200, n: 0.011, minGradient: 150 },

  // 225mm Pipes
  { id: '225-vcp', label: '225mm VCP', material: 'VCP', diameter: 225, n: 0.013, minGradient: 135 },
  { id: '225-di', label: '225mm Ductile Iron', material: 'Ductile Iron', diameter: 225, n: 0.011, minGradient: 170 },
  { id: '225-upvc', label: '225mm UPVC', material: 'UPVC', diameter: 225, n: 0.011, minGradient: 170 },

  // 300mm Pipes (No VCP usually for larger sizes in standard lists, but maintaining existing structure)
  { id: '300-conc', label: '300mm Concrete', material: 'Concrete', diameter: 300, n: 0.013, minGradient: 180 },
  { id: '300-di', label: '300mm Ductile Iron', material: 'Ductile Iron', diameter: 300, n: 0.011, minGradient: 220 },
  { id: '300-upvc', label: '300mm UPVC', material: 'UPVC', diameter: 300, n: 0.011, minGradient: 220 },
];

// Extra options only available when "Pumping Main" mode is enabled
export const PUMPING_PIPES: PipeDef[] = [
  { id: '100-vcp', label: '100mm VCP', material: 'VCP', diameter: 100, n: 0.013, minGradient: 60 },
  { id: '100-di', label: '100mm Ductile Iron', material: 'Ductile Iron', diameter: 100, n: 0.011, minGradient: 80 },
  { id: '100-upvc', label: '100mm UPVC', material: 'UPVC', diameter: 100, n: 0.011, minGradient: 80 },
];

export const DEFAULT_VALUES = {
  startIC: '1',
  endIC: '2',
  tl1: 19.50,
  il1: 18.43,
  tl2: 19.45,
  distance: 30,
  gradient: 60, // 1:60
  defaultPipeId: '200-vcp'
};