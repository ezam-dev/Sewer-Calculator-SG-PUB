import { PubStandard, PipeDef } from './types';

// Based on PUB Code of Practice (2nd Edition - Jan 2019 + Addendum 2021)
export const PUB_STANDARDS: PubStandard = {
  minSize: 150, // Note: Public sewers min 200mm (3.2.1.d), Drain-lines min 150mm (4.2.1.b)
  minGradient: 120, 
  maxGradient: 20,  // 1:20
  minVelocity: 0.9, // Section 3.2.1(e)(ii)
  maxVelocity: 2.4, // Section 3.2.1(e)(ii)
};

export const PUMPING_STANDARDS = {
  minVelocity: 1.0, // Section 3.3.4(b)
  maxVelocity: 2.4, // Section 3.3.4(b)
  minSize: 100,     // Section 3.3.4(a)
};

export const DROP_STRUCTURE_THRESHOLDS = {
  backdropMin: 0.5, // Section 4.2.1(b)(ii) - 500mm requires tumbling bay/backdrop
  vortexMin: 6.0,   // Table 5 - >6.0m requires vortex
};

export const DRAIN_LINE_CONSTRAINTS = {
  maxLength: 50, // PUB COP 4.2.1(b)(i)
  minLength: 0,
};

export const IC_STANDARDS = {
  minDepth: 0.75, // meters (750mm) per PUB COP 4.2.1(e)(ii)
};

export const PIPE_OPTIONS: PipeDef[] = [
  // 150mm Pipes (Drain-lines)
  { id: '150-vcp', label: '150mm VCP', material: 'VCP', diameter: 150, n: 0.013, minGradient: 80 },
  { id: '150-di', label: '150mm Ductile Iron', material: 'Ductile Iron', diameter: 150, n: 0.011, minGradient: 100 },
  { id: '150-upvc', label: '150mm UPVC', material: 'UPVC', diameter: 150, n: 0.011, minGradient: 100 },

  // 200mm Pipes (Public Sewer Min Size)
  // Note: 1:50 is recommended for small developments (Section 3.2.1 e iii)
  // 1:120 allows approx 0.95m/s, meeting the 0.9m/s min requirement.
  { id: '200-vcp', label: '200mm VCP', material: 'VCP', diameter: 200, n: 0.013, minGradient: 120 },
  { id: '200-di', label: '200mm Ductile Iron', material: 'Ductile Iron', diameter: 200, n: 0.011, minGradient: 150 },
  { id: '200-upvc', label: '200mm UPVC', material: 'UPVC', diameter: 200, n: 0.011, minGradient: 150 },

  // 225mm Pipes
  { id: '225-vcp', label: '225mm VCP', material: 'VCP', diameter: 225, n: 0.013, minGradient: 135 },
  { id: '225-di', label: '225mm Ductile Iron', material: 'Ductile Iron', diameter: 225, n: 0.011, minGradient: 170 },
  { id: '225-upvc', label: '225mm UPVC', material: 'UPVC', diameter: 225, n: 0.011, minGradient: 170 },

  // 300mm Pipes
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
  tl1: 10.00,
  il1: 8.93,
  tl2: 10.00,
  distance: 30,
  gradient: 90, // 1:90
  defaultPipeId: '150-upvc'
};