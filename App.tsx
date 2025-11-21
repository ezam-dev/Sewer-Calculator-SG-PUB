import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, AlertTriangle, CheckCircle2, Settings2, TrendingDown, ArrowUpRight, Droplets, ChevronDown, ArrowRight, Copy, History, Save, RefreshCcw, Mail, Phone, Info, ListPlus, FileText, X, Activity } from 'lucide-react';
import { LiquidCard } from './components/LiquidCard';
import { InputGroup } from './components/InputGroup';
import SchematicGraph from './components/SchematicGraph';
import { CalculationMode, CalculationResult, SewerNode, HistoryEntry } from './types';
import { DEFAULT_VALUES, PUB_STANDARDS, PIPE_OPTIONS, PUMPING_PIPES, DRAIN_LINE_CONSTRAINTS } from './constants';

const App: React.FC = () => {
  // State
  const [mode, setMode] = useState<CalculationMode>(CalculationMode.DOWNSTREAM);
  
  // Pipe Selection State
  const [isPumpingMain, setIsPumpingMain] = useState<boolean>(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('VCP');
  const [selectedDiameter, setSelectedDiameter] = useState<number>(200);
  const [pipeId, setPipeId] = useState<string>(DEFAULT_VALUES.defaultPipeId);
  
  // Inputs
  const [ic1, setIc1] = useState<string>(DEFAULT_VALUES.startIC);
  const [tl1, setTl1] = useState<number | ''>(DEFAULT_VALUES.tl1);
  const [il1, setIl1] = useState<number | ''>(DEFAULT_VALUES.il1);
  
  const [ic2, setIc2] = useState<string>(DEFAULT_VALUES.endIC);
  const [tl2, setTl2] = useState<number | ''>(DEFAULT_VALUES.tl2);
  const [il2, setIl2] = useState<number | ''>(''); 
  
  const [distance, setDistance] = useState<number | ''>(DEFAULT_VALUES.distance);
  const [gradient, setGradient] = useState<number | ''>(DEFAULT_VALUES.gradient); // 1 : X

  // Computed Result
  const [result, setResult] = useState<CalculationResult | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [showScheduleCopyFeedback, setShowScheduleCopyFeedback] = useState(false);
  const [copiedNode, setCopiedNode] = useState<string | null>(null);
  const [showStandards, setShowStandards] = useState(false);

  // Derived Lists
  const allPipes = useMemo(() => {
    return isPumpingMain ? [...PIPE_OPTIONS, ...PUMPING_PIPES] : PIPE_OPTIONS;
  }, [isPumpingMain]);

  const materials = useMemo(() => {
    const mats = new Set(allPipes.map(p => p.material));
    return Array.from(mats);
  }, [allPipes]);

  const availableDiameters = useMemo(() => {
    return allPipes
      .filter(p => p.material === selectedMaterial)
      .map(p => p.diameter)
      .sort((a, b) => a - b);
  }, [selectedMaterial, allPipes]);

  const currentPipe = useMemo(() => {
    return allPipes.find(p => p.material === selectedMaterial && p.diameter === selectedDiameter) || allPipes[0];
  }, [selectedMaterial, selectedDiameter, allPipes]);

  // Update pipeId and sync selection whenever currentPipe changes (e.g. fallback)
  useEffect(() => {
    if (currentPipe) {
      setPipeId(currentPipe.id);
      // Ensure visual dropdowns match the fallback logic if selection became invalid
      if (currentPipe.diameter !== selectedDiameter) setSelectedDiameter(currentPipe.diameter);
      if (currentPipe.material !== selectedMaterial) setSelectedMaterial(currentPipe.material);
    }
  }, [currentPipe, selectedDiameter, selectedMaterial]);

  // Calculation Logic
  useEffect(() => {
    calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tl1, il1, tl2, il2, distance, gradient, pipeId]);

  const calculate = () => {
    // Basic parsing
    const dDist = Number(distance);
    const dGrad = Number(gradient);
    const dTl1 = Number(tl1);
    const dIl1 = Number(il1);
    const dTl2 = Number(tl2);
    const dIl2 = Number(il2);

    let startIl = dIl1;
    let endIl = dIl2;
    let calcGradient = dGrad;
    let calcFall = 0;
    const issues: string[] = [];

    // Logic switch based on mode
    if (mode === CalculationMode.VERIFY) {
      if (il1 === '' || il2 === '' || distance === '' || distance === 0) return;
      calcFall = startIl - endIl;
      calcGradient = calcFall !== 0 ? dDist / calcFall : 0; 
    } 
    else if (mode === CalculationMode.DOWNSTREAM) {
      if (il1 === '' || distance === '' || gradient === '' || gradient === 0) return;
      calcFall = dDist / dGrad;
      startIl = dIl1;
      endIl = dIl1 - calcFall;
    } 
    else if (mode === CalculationMode.UPSTREAM) {
      if (il2 === '' || distance === '' || gradient === '' || gradient === 0) return;
      calcFall = dDist / dGrad;
      endIl = dIl2;
      startIl = dIl2 + calcFall;
    }

    // --- Physics & PUB Standards ---
    const absGradient = Math.abs(calcGradient);
    
    // 1. Distance Check (PUB COP 4.2.1)
    if (dDist > DRAIN_LINE_CONSTRAINTS.maxLength) {
      issues.push(`Drain-line length ${dDist.toFixed(2)}m exceeds max 50m (PUB COP 4.2.1).`);
    }

    // 2. Gradient Check
    if (absGradient > currentPipe.minGradient) {
      issues.push(`Gradient 1:${absGradient.toFixed(0)} is flatter than min 1:${currentPipe.minGradient} for ${currentPipe.label}. Risk of silting.`);
    }
    if (absGradient < PUB_STANDARDS.maxGradient && absGradient !== 0) {
      issues.push(`Gradient 1:${absGradient.toFixed(0)} is steeper than max 1:${PUB_STANDARDS.maxGradient}. Risk of scouring.`);
    }
    if (mode === CalculationMode.VERIFY && startIl <= endIl) {
      issues.push("Start IL is lower/equal to End IL. No gravity flow.");
    }
    
    // 3. Depth Check
    const depth1 = dTl1 - startIl;
    const depth2 = dTl2 - endIl;
    if (depth1 < 1.0 && dTl1 !== 0) issues.push(`Upstream Depth ${depth1.toFixed(2)}m is shallow (< 1.0m).`);
    if (depth2 < 1.0 && dTl2 !== 0) issues.push(`Downstream Depth ${depth2.toFixed(2)}m is shallow (< 1.0m).`);

    // 4. Velocity Check (Manning's Formula)
    // V = (1/n) * R^(2/3) * S^(1/2)
    const n = currentPipe.n;
    const D = currentPipe.diameter / 1000; // mm to m
    
    // Hydraulic Radius R = Area / Wetted Perimeter. For Full Flow: R = D / 4.
    const R = D / 4; 
    const S = absGradient > 0 ? 1 / absGradient : 0;
    const velocity = (1 / n) * Math.pow(R, 2/3) * Math.sqrt(S);

    if (velocity < PUB_STANDARDS.minVelocity && velocity > 0) {
      issues.push(`Velocity ${velocity.toFixed(2)} m/s is below ${PUB_STANDARDS.minVelocity} m/s. Self-cleansing fail.`);
    }
    if (velocity > PUB_STANDARDS.maxVelocity) {
      issues.push(`Velocity ${velocity.toFixed(2)} m/s exceeds ${PUB_STANDARDS.maxVelocity} m/s. Scouring risk.`);
    }

    const startNode: SewerNode = { id: ic1, tl: dTl1, il: startIl, depth: depth1 };
    const endNode: SewerNode = { id: ic2, tl: dTl2, il: endIl, depth: depth2 };

    setResult({
      startNode,
      endNode,
      distance: dDist,
      gradient: calcGradient,
      fall: calcFall,
      velocity,
      isCompliant: issues.length === 0,
      complianceIssues: issues,
      pipe: currentPipe,
    });
  };

  // Actions
  const saveToHistory = () => {
    if (!result) return;
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      inputs: { ic1, tl1, il1, ic2, tl2, il2, distance, gradient, pipeId, mode },
      result: result
    };
    setHistory(prev => [newEntry, ...prev]);
  };

  const restoreHistory = (entry: HistoryEntry) => {
    setMode(entry.inputs.mode);
    setIc1(entry.inputs.ic1);
    setTl1(entry.inputs.tl1);
    setIl1(entry.inputs.il1);
    setIc2(entry.inputs.ic2);
    setTl2(entry.inputs.tl2);
    setIl2(entry.inputs.il2);
    setDistance(entry.inputs.distance);
    setGradient(entry.inputs.gradient);
    setPipeId(entry.inputs.pipeId);
    
    // Also restore material selection based on pipeId
    // Check both standard and pumping pipes
    const pipe = [...PIPE_OPTIONS, ...PUMPING_PIPES].find(p => p.id === entry.inputs.pipeId);
    if (pipe) {
      // If it's a small pipe, ensure pumping main mode is on to visualize it correctly
      if (pipe.diameter < 150) {
        setIsPumpingMain(true);
      }
      setSelectedMaterial(pipe.material);
      setSelectedDiameter(pipe.diameter);
    }
  };

  const handleNodeCopy = (ic: string, tl: number, il: number) => {
    const depth = tl - il;
    // Format specifically for CAD MText
    const text = `IC ${ic}\nTL: ${tl.toFixed(2)}\nIL: ${il.toFixed(2)}\nD: ${depth.toFixed(2)} m`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedNode(ic);
      setTimeout(() => setCopiedNode(null), 2000);
    });
  };

  const handleReportCopy = () => {
    if (!result) return;
    
    const text = `SEWERAGE LINE DATA (PUB COMPLIANCE CHECK)
=========================================
Date: ${new Date().toLocaleString()}

PIPE SEGMENT: IC ${ic1} to IC ${ic2}
-----------------------------------------
Material:   ${result.pipe.material}
Diameter:   ${result.pipe.diameter}mm ${isPumpingMain ? '(Pumping Main)' : ''}
Distance:   ${result.distance.toFixed(3)} m
Gradient:   1 : ${Math.abs(result.gradient).toFixed(0)}
Velocity:   ${result.velocity.toFixed(2)} m/s

UPSTREAM MANHOLE (IC ${ic1})
----------------------------
Top Level:    ${result.startNode.tl.toFixed(3)} m
Invert Level: ${result.startNode.il.toFixed(3)} m
Depth:        ${result.startNode.depth.toFixed(3)} m

DOWNSTREAM MANHOLE (IC ${ic2})
------------------------------
Top Level:    ${result.endNode.tl.toFixed(3)} m
Invert Level: ${result.endNode.il.toFixed(3)} m
Depth:        ${result.endNode.depth.toFixed(3)} m

COMPLIANCE STATUS: ${result.isCompliant ? 'PASSED' : 'FAILED'}
${result.complianceIssues.length > 0 ? 'Issues:\n' + result.complianceIssues.map(i => '- ' + i).join('\n') : ''}
`;

    navigator.clipboard.writeText(text).then(() => {
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
      saveToHistory(); // Auto-save on copy
    });
  };

  const handleScheduleCopy = () => {
    if (history.length === 0) return;
    
    // Format: Run 1: ø225 VCP 30m 1:120
    const runs = [...history].reverse();
    
    const lines = runs.map((entry, index) => {
      return `Run ${index + 1}: ø${entry.result.pipe.diameter} ${entry.result.pipe.material} ${entry.result.distance.toFixed(2)}m 1:${Math.abs(entry.result.gradient).toFixed(0)}`;
    });

    const text = `PROJECT SCHEDULE - PIPE RUNS
============================
Date: ${new Date().toLocaleDateString()}

${lines.join('\n')}
`;

    navigator.clipboard.writeText(text).then(() => {
      setShowScheduleCopyFeedback(true);
      setTimeout(() => setShowScheduleCopyFeedback(false), 2000);
    });
  };

  // Gradient Validation for UI Warning
  const isGradientWarning = result && Math.abs(result.gradient) > currentPipe.minGradient;
  
  // Distance Validation for UI Warning
  const isDistanceWarning = Number(distance) > DRAIN_LINE_CONSTRAINTS.maxLength;

  return (
    <div className="min-h-screen w-full p-4 md:p-8 flex flex-col items-center relative overflow-x-hidden selection:bg-cyan-500/30">
      
      {/* Background Liquid Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Standards Popup */}
      {showStandards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#1a1f3c] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowStandards(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-4 text-cyan-300">
              <Info size={24} />
              <h3 className="text-xl font-bold text-white">PUB Standard Reference</h3>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-xs uppercase text-white/40 mb-1">Velocity Limits</p>
                <div className="flex justify-between items-center">
                  <span className="text-white">Minimum</span>
                  <span className="font-mono text-emerald-400">{PUB_STANDARDS.minVelocity} m/s</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-white">Maximum</span>
                  <span className="font-mono text-red-400">{PUB_STANDARDS.maxVelocity} m/s</span>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                 <p className="text-xs uppercase text-white/40 mb-1">Maximum Length</p>
                 <div className="flex justify-between items-center">
                   <span className="text-white">Gravity Sewer</span>
                   <span className="font-mono text-emerald-400">50 m</span>
                 </div>
                 <p className="text-[10px] text-white/30 mt-1">Section 4.2.1(b)(i) - Provide intermediate ICs for longer runs.</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                 <p className="text-xs uppercase text-white/40 mb-1">Common Minimum Gradients</p>
                 <ul className="text-sm space-y-1 text-white/80">
                   <li className="flex justify-between"><span className="text-white/60">150mm</span> <span>1:80 (VCP)</span></li>
                   <li className="flex justify-between"><span className="text-white/60">200mm</span> <span>1:120 (VCP)</span></li>
                   <li className="flex justify-between"><span className="text-white/60">225mm</span> <span>1:135 (VCP)</span></li>
                   <li className="flex justify-between"><span className="text-white/60">300mm</span> <span>1:220 (UPVC)</span></li>
                 </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 mb-12">
        
        {/* Header & Mode Selection */}
        <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-center gap-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/20">
              <Droplets className="text-white h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Sewerage<span className="font-light text-cyan-400">Pro</span>
              </h1>
              <p className="text-white/40 text-sm font-medium">PUB Code of Practice • Singapore</p>
            </div>
          </div>

          <div className="p-1.5 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-1 shadow-2xl overflow-x-auto max-w-full">
             <button 
               onClick={() => setMode(CalculationMode.DOWNSTREAM)}
               className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${mode === CalculationMode.DOWNSTREAM ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
             >
               <TrendingDown size={16} />
               Slope Down
             </button>
             <button 
               onClick={() => setMode(CalculationMode.UPSTREAM)}
               className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${mode === CalculationMode.UPSTREAM ? 'bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
             >
               <ArrowUpRight size={16} />
               Slope Up
             </button>
             <button 
               onClick={() => setMode(CalculationMode.VERIFY)}
               className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${mode === CalculationMode.VERIFY ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
             >
               <Settings2 size={16} />
               Verify
             </button>
          </div>
        </div>

        {/* Left Column: Inputs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Upstream Node (Start) */}
          <LiquidCard className={mode === CalculationMode.UPSTREAM ? 'ring-2 ring-purple-500/50' : ''}>
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-400/30 text-blue-300 font-bold text-sm shadow-[0_0_15px_rgba(59,130,246,0.2)]">IC</div>
                 <input 
                    type="text" 
                    value={ic1} 
                    onChange={(e) => setIc1(e.target.value)} 
                    className="bg-transparent border-b border-white/10 w-24 text-xl text-white font-semibold focus:outline-none focus:border-blue-400 transition-colors"
                  />
               </div>
               <div className="flex items-center gap-2">
                 {result && (
                    <button 
                      onClick={() => handleNodeCopy(result.startNode.id, result.startNode.tl, result.startNode.il)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-[10px] font-bold text-blue-300 transition-all active:scale-95"
                      title="Copy for CAD"
                    >
                      {copiedNode === result.startNode.id ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                      <span>{copiedNode === result.startNode.id ? 'COPIED' : 'COPY'}</span>
                    </button>
                 )}
                 <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-300 uppercase tracking-widest">
                   Upstream
                 </div>
               </div>
            </div>
            
            <div className="space-y-5">
              <InputGroup label="Top Level (TL)" value={tl1} onChange={(v) => setTl1(v === '' ? '' : Number(v))} unit="m" placeholder="0.00" />
              <InputGroup 
                label="Invert Level (IL)" 
                value={mode === CalculationMode.UPSTREAM && result ? result.startNode.il.toFixed(3) : il1} 
                onChange={(v) => setIl1(v === '' ? '' : Number(v))} 
                unit="m" 
                placeholder="0.00"
                readOnly={mode === CalculationMode.UPSTREAM}
              />
              {result && (
                 <div className="flex justify-between items-center px-1 animate-pop-in">
                   <span className="text-xs text-white/40">Depth</span>
                   <span className={`text-sm font-mono font-medium ${result.startNode.depth < 1.0 ? 'text-red-400' : 'text-emerald-400'}`}>
                     {result.startNode.depth.toFixed(3)}m
                   </span>
                 </div>
              )}
            </div>
          </LiquidCard>

          {/* Connection Parameters */}
          <LiquidCard>
             <div className="flex items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                   <div className="h-px w-4 bg-white/10"></div>
                   <span className="text-xs font-medium text-white/40 uppercase tracking-widest whitespace-nowrap">Pipe Connection</span>
                   <div className="h-px w-8 bg-white/10"></div>
                </div>
                
                {/* Pumping Main Toggle */}
                <button 
                   onClick={() => setIsPumpingMain(!isPumpingMain)}
                   className={`flex items-center gap-2 px-2 py-1 rounded-full border transition-all duration-300 ${isPumpingMain ? 'bg-pink-500/10 border-pink-500/30 text-pink-300' : 'bg-white/5 border-white/5 text-white/30 hover:border-white/20'}`}
                   title="Enable pumping main options (allows ø100mm)"
                >
                   <Activity size={12} />
                   <span className="text-[10px] font-bold uppercase">Pumping Main</span>
                   <div className={`w-2 h-2 rounded-full ${isPumpingMain ? 'bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.6)]' : 'bg-white/20'}`}></div>
                </button>
             </div>

             <div className="space-y-5">
                
                {/* Split Material / Diameter Selection */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Size (MM) on the LEFT */}
                  <div className="flex flex-col gap-1.5">
                     <label className="text-xs font-medium text-blue-200/70 uppercase tracking-wider ml-1">
                        SEWER SIZE (MM)
                     </label>
                     <div className="relative group/select">
                      <select 
                        value={selectedDiameter} 
                        onChange={(e) => setSelectedDiameter(Number(e.target.value))}
                        className="w-full bg-black/20 border border-white/10 text-white text-sm rounded-2xl px-3 py-3 appearance-none focus:border-cyan-400/50 outline-none transition-all cursor-pointer hover:bg-white/5 focus:scale-[1.02] focus:bg-black/30 ease-out duration-300"
                      >
                        {availableDiameters.map(d => (
                          <option key={d} value={d} className="bg-[#24243e] text-white">ø{d}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 text-white/40 w-4 h-4 pointer-events-none" />
                    </div>
                     <span className="text-[9px] text-white/30 ml-1">
                        Min ø150mm {isPumpingMain ? '(ø100mm enabled)' : '(ø100mm for pumping only)'}
                     </span>
                  </div>

                  {/* Material on the RIGHT */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-blue-200/70 uppercase tracking-wider ml-1">Material</label>
                      <button onClick={() => setShowStandards(true)} className="group relative outline-none">
                        <Info size={12} className="text-white/30 hover:text-cyan-400 transition-colors" />
                      </button>
                    </div>
                    <div className="relative group/select">
                      <select 
                        value={selectedMaterial} 
                        onChange={(e) => {
                          setSelectedMaterial(e.target.value);
                          // Reset diameter logic handled by currentPipe effect but we force a safe re-selection
                          // logic handled in effect
                        }}
                        className="w-full bg-black/20 border border-white/10 text-white text-sm rounded-2xl px-3 py-3 appearance-none focus:border-cyan-400/50 outline-none transition-all cursor-pointer hover:bg-white/5 focus:scale-[1.02] focus:bg-black/30 ease-out duration-300"
                      >
                        {materials.map(m => (
                          <option key={m} value={m} className="bg-[#24243e] text-white">{m}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-3.5 text-white/40 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Material Specs Info Row */}
                <div className="flex justify-between items-center px-2 py-2 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 uppercase">Roughness</span>
                      <span className="text-xs font-mono text-cyan-300">n={currentPipe.n}</span>
                    </div>
                    <div className="h-3 w-px bg-white/10"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 uppercase">PUB Min Grad</span>
                      <span className="text-xs font-mono text-purple-300">1:{currentPipe.minGradient}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <InputGroup 
                      label={
                        <div className="flex justify-between items-center w-full pr-1">
                           <span>Distance</span>
                           <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider transition-all duration-300 ${
                               isDistanceWarning 
                               ? 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.2)]' 
                               : 'bg-white/5 text-white/30 border-white/10'
                           }`}>Max 50m</span>
                        </div>
                      } 
                      value={distance} 
                      onChange={(v) => setDistance(v === '' ? '' : Number(v))} 
                      unit="m" 
                      placeholder="0.00" 
                    />
                    {isDistanceWarning && (
                      <div className="flex items-start gap-1.5 mt-2 px-2 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] animate-in fade-in slide-in-from-top-1 duration-300">
                         <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                         <div className="flex flex-col">
                             <span className="font-bold">Exceeds PUB Limit (Section 4.2.1)</span>
                             <span className="opacity-80">For longer runs, provide multiple inspection chambers.</span>
                         </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <InputGroup 
                      label="Gradient (1:X)" 
                      value={mode === CalculationMode.VERIFY && result ? (result.gradient === 0 ? '0' : Math.abs(result.gradient).toFixed(1)) : gradient} 
                      onChange={(v) => setGradient(v === '' ? '' : Number(v))} 
                      unit="" 
                      placeholder="60"
                      readOnly={mode === CalculationMode.VERIFY}
                    />
                    {/* Warning Icon for Gradient Input */}
                    {isGradientWarning && !result?.isCompliant && mode !== CalculationMode.VERIFY && (
                       <div className="absolute right-0 top-0 -mt-1 flex items-center gap-1 text-amber-400 animate-pulse bg-black/50 rounded px-1">
                         <AlertTriangle size={10} />
                         <span className="text-[10px] font-bold">Below Min</span>
                       </div>
                    )}
                  </div>
                </div>
             </div>
          </LiquidCard>

          {/* Downstream Node (End) */}
          <LiquidCard className={mode === CalculationMode.DOWNSTREAM ? 'ring-2 ring-cyan-500/50' : ''}>
            <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-400/30 text-purple-300 font-bold text-sm shadow-[0_0_15px_rgba(168,85,247,0.2)]">IC</div>
                 <input 
                    type="text" 
                    value={ic2} 
                    onChange={(e) => setIc2(e.target.value)} 
                    className="bg-transparent border-b border-white/10 w-24 text-xl text-white font-semibold focus:outline-none focus:border-purple-400 transition-colors"
                  />
               </div>
               <div className="flex items-center gap-2">
                 {result && (
                    <button 
                      onClick={() => handleNodeCopy(result.endNode.id, result.endNode.tl, result.endNode.il)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-[10px] font-bold text-purple-300 transition-all active:scale-95"
                      title="Copy for CAD"
                    >
                      {copiedNode === result.endNode.id ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                      <span>{copiedNode === result.endNode.id ? 'COPIED' : 'COPY'}</span>
                    </button>
                 )}
                 <div className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-300 uppercase tracking-widest">
                   Downstream
                 </div>
               </div>
            </div>
            
            <div className="space-y-5">
              <InputGroup label="Top Level (TL)" value={tl2} onChange={(v) => setTl2(v === '' ? '' : Number(v))} unit="m" placeholder="0.00" />
              <InputGroup 
                label="Invert Level (IL)" 
                value={mode === CalculationMode.DOWNSTREAM && result ? result.endNode.il.toFixed(3) : il2} 
                onChange={(v) => setIl2(v === '' ? '' : Number(v))} 
                unit="m" 
                placeholder="0.00"
                readOnly={mode === CalculationMode.DOWNSTREAM}
              />
              {result && (
                 <div className="flex justify-between items-center px-1 animate-pop-in">
                   <span className="text-xs text-white/40">Depth</span>
                   <span className={`text-sm font-mono font-medium ${result.endNode.depth < 1.0 ? 'text-red-400' : 'text-emerald-400'}`}>
                     {result.endNode.depth.toFixed(3)}m
                   </span>
                 </div>
              )}
            </div>
          </LiquidCard>

        </div>

        {/* Right Column: Results & Graph */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Action Bar */}
          <div className="flex flex-wrap gap-3 justify-end">
            <button 
              onClick={saveToHistory}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 text-sm font-medium flex items-center gap-2 transition-all active:scale-95 hover:bg-white/10"
            >
              <ListPlus size={16} />
              Add to Schedule
            </button>
            <button 
              onClick={handleReportCopy}
              className={`px-4 py-2 border rounded-xl text-sm font-medium flex items-center gap-2 transition-all active:scale-95 relative overflow-hidden ${showCopyFeedback ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'}`}
            >
              {showCopyFeedback ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {showCopyFeedback ? 'Copied!' : 'Copy Report'}
            </button>
          </div>

          {/* Results Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <LiquidCard className="flex flex-col justify-center items-center text-center py-8">
                <span className="text-xs text-white/40 uppercase tracking-widest mb-2">Calculated Fall</span>
                <span key={result?.fall} className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 font-mono animate-pop-in">
                  {result ? result.fall.toFixed(3) : '0.000'}
                  <span className="text-sm text-white/30 ml-1">m</span>
                </span>
             </LiquidCard>
             
             <LiquidCard className="flex flex-col justify-center items-center text-center py-8">
                <span className="text-xs text-white/40 uppercase tracking-widest mb-2">Velocity</span>
                <span key={result?.velocity} className={`text-3xl font-bold font-mono animate-pop-in ${
                  result?.velocity && (result.velocity < 0.8 || result.velocity > 2.4) ? 'text-amber-400' : 'text-emerald-300'
                }`}>
                  {result ? result.velocity.toFixed(2) : '0.00'}
                  <span className="text-sm text-white/30 ml-1">m/s</span>
                </span>
             </LiquidCard>

             <LiquidCard className={`flex flex-col justify-center items-center text-center py-8 transition-colors duration-500 ${
                result?.isCompliant ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
             }`}>
                <span className="text-xs text-white/40 uppercase tracking-widest mb-2">Compliance</span>
                {result?.isCompliant ? (
                  <div className="flex items-center gap-2 text-emerald-400 animate-pop-in">
                    <CheckCircle2 size={32} />
                    <span className="font-bold">PASSED</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400 animate-pop-in">
                    <AlertTriangle size={32} />
                    <span className="font-bold">ISSUE</span>
                  </div>
                )}
             </LiquidCard>
          </div>

          {/* Schematic View */}
          <LiquidCard className="flex-1 min-h-[300px] flex flex-col" title="Schematic Profile">
            <div className="flex-1 w-full h-full">
              {result ? (
                <SchematicGraph data={result} />
              ) : (
                 <div className="h-full flex items-center justify-center text-white/20">
                   <div className="flex flex-col items-center gap-2">
                      <Calculator size={40} strokeWidth={1} />
                      <span>Enter data to visualize</span>
                   </div>
                 </div>
              )}
            </div>
          </LiquidCard>

          {/* Compliance Details */}
          {result && !result.isCompliant && (
            <LiquidCard className="bg-red-900/10 border-red-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center gap-3 mb-4 text-red-400">
                 <AlertTriangle size={20} />
                 <h3 className="font-bold uppercase tracking-wider text-sm">Compliance Issues</h3>
               </div>
               <div className="space-y-2">
                 {result.complianceIssues.map((issue, idx) => (
                   <div key={idx} className="flex gap-3 text-sm text-white/70 bg-black/20 p-3 rounded-xl border border-red-500/10">
                     <span className="text-red-500 font-mono opacity-50">0{idx + 1}</span>
                     {issue}
                   </div>
                 ))}
               </div>
            </LiquidCard>
          )}
          
          {result && result.isCompliant && (
             <LiquidCard className="bg-emerald-900/10 border-emerald-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-2 text-emerald-400">
                  <CheckCircle2 size={20} />
                  <h3 className="font-bold uppercase tracking-wider text-sm">Design Compliant</h3>
                </div>
                <div className="mt-3 space-y-1 px-4">
                  <div className="flex items-center gap-2 text-sm text-emerald-300/80">
                     <CheckCircle2 size={14} />
                     <span>Distance within limit ({result.distance.toFixed(1)}m ≤ 50m)</span>
                  </div>
                </div>
                <p className="text-sm text-white/60 mt-3 pt-3 border-t border-white/5 px-4">
                  All hydraulic parameters are within PUB Standard Code of Practice.
                </p>
             </LiquidCard>
          )}

        </div>

        {/* Full Width Project Schedule (History) Section */}
        <div className="lg:col-span-12">
          <LiquidCard 
            title="Project Schedule / Run List" 
            icon={<History size={20} />}
          >
            {/* Schedule Header with Copy Button */}
            <div className="absolute top-6 right-6">
               <button 
                  onClick={handleScheduleCopy}
                  disabled={history.length === 0}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                    history.length === 0 ? 'bg-white/5 text-white/20 cursor-not-allowed' : 
                    showScheduleCopyFeedback ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10'
                  }`}
                >
                  {showScheduleCopyFeedback ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                  {showScheduleCopyFeedback ? 'COPIED' : 'COPY SCHEDULE'}
               </button>
            </div>

            <div className="overflow-x-auto mt-4">
              {history.length === 0 ? (
                <div className="p-8 text-center text-white/20 text-sm">
                  <p>No calculations added to schedule yet.</p>
                  <p className="text-xs mt-2 opacity-50">Click "Add to Schedule" to build your project run list.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 uppercase text-xs">
                      <th className="pb-3 font-medium pl-2">Run #</th>
                      <th className="pb-3 font-medium">Route</th>
                      <th className="pb-3 font-medium">Specs</th>
                      <th className="pb-3 font-medium">Distance</th>
                      <th className="pb-3 font-medium">Grade</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[...history].map((entry, idx) => (
                      <tr key={entry.id} className="group hover:bg-white/5 transition-colors">
                        <td className="py-3 pl-2 font-mono text-white/60">
                           Run {history.length - idx}
                        </td>
                        <td className="py-3 text-white/80">
                           IC {entry.inputs.ic1} <span className="text-white/30 px-1">→</span> IC {entry.inputs.ic2}
                        </td>
                        <td className="py-3 text-white/80">
                           <span className="text-cyan-300 font-bold">ø{entry.result.pipe.diameter}</span> {entry.result.pipe.material}
                        </td>
                        <td className="py-3 text-white/60 font-mono">
                           {entry.result.distance.toFixed(2)}m
                        </td>
                        <td className="py-3 text-white/80 font-mono">
                           1:{Math.abs(entry.result.gradient).toFixed(0)}
                        </td>
                        <td className="py-3">
                           {entry.result.isCompliant ? (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400">PASS</span>
                           ) : (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/10 text-red-400">FAIL</span>
                           )}
                        </td>
                        <td className="py-3 text-right pr-2">
                          <button 
                             onClick={() => restoreHistory(entry)}
                             className="p-1.5 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors transform active:scale-90 hover:scale-110"
                             title="Restore and Edit"
                          >
                            <RefreshCcw size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </LiquidCard>
        </div>

      </div>

      {/* Footer / Credits */}
      <footer className="w-full max-w-7xl mt-auto py-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm z-10">
        <div>
          &copy; {new Date().getFullYear()} SeweragePro Calculator. All rights reserved.
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <span className="flex items-center gap-2">
             <span>Developed by Mohd Ezam Bin Othman</span>
          </span>
          <div className="flex items-center gap-4">
             <a href="tel:+60105561616" className="flex items-center gap-2 hover:text-cyan-400 transition-colors">
               <Phone size={14} />
               <span>+6010-5561616</span>
             </a>
             <a href="mailto:ezamothman@gmail.com" className="flex items-center gap-2 hover:text-cyan-400 transition-colors">
               <Mail size={14} />
               <span>ezamothman@gmail.com</span>
             </a>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;