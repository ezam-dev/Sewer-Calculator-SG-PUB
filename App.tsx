
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calculator, AlertTriangle, CheckCircle2, Settings2, TrendingDown, ArrowUpRight, Droplets, ChevronDown, ChevronUp, ArrowRight, Copy, History, Save, RefreshCcw, Mail, Phone, Info, ListPlus, FileText, X, Activity, Trash2, Sun, Moon, Volume2, VolumeX, ArrowDownToLine, BookOpen } from 'lucide-react';
import { LiquidCard } from './components/LiquidCard';
import { InputGroup } from './components/InputGroup';
import SchematicGraph from './components/SchematicGraph';
import { CalculationMode, CalculationResult, SewerNode, HistoryEntry } from './types';
import { DEFAULT_VALUES, PUB_STANDARDS, PUMPING_STANDARDS, PIPE_OPTIONS, PUMPING_PIPES, DRAIN_LINE_CONSTRAINTS, IC_STANDARDS, DROP_STRUCTURE_THRESHOLDS } from './constants';

const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // State
  const [mode, setMode] = useState<CalculationMode>(CalculationMode.DOWNSTREAM);
  
  // Pipe Selection State
  const [isPumpingMain, setIsPumpingMain] = useState<boolean>(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string>('UPVC');
  const [selectedDiameter, setSelectedDiameter] = useState<number>(150);
  const [pipeId, setPipeId] = useState<string>(DEFAULT_VALUES.defaultPipeId);
  const [isPipeSettingsCollapsed, setIsPipeSettingsCollapsed] = useState(true);
  
  // Inputs
  const [ic1, setIc1] = useState<string>(DEFAULT_VALUES.startIC);
  const [tl1, setTl1] = useState<number | ''>(DEFAULT_VALUES.tl1);
  const [il1, setIl1] = useState<number | ''>(DEFAULT_VALUES.il1);
  const [depth1, setDepth1] = useState<string>((DEFAULT_VALUES.tl1 - DEFAULT_VALUES.il1).toFixed(3));
  
  const [ic2, setIc2] = useState<string>(DEFAULT_VALUES.endIC);
  const [tl2, setTl2] = useState<number | ''>(DEFAULT_VALUES.tl2);
  const [il2, setIl2] = useState<number | ''>(''); 
  const [depth2, setDepth2] = useState<string>('');

  const [distance, setDistance] = useState<number | ''>(DEFAULT_VALUES.distance);
  const [gradient, setGradient] = useState<number | ''>(DEFAULT_VALUES.gradient); // 1 : X

  // Branch Drop State (for Slope Up mode)
  const [upstreamDrop, setUpstreamDrop] = useState<number>(0);

  // Computed Result
  const [result, setResult] = useState<CalculationResult | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [showScheduleCopyFeedback, setShowScheduleCopyFeedback] = useState(false);
  const [copiedNode, setCopiedNode] = useState<string | null>(null);
  const [showStandards, setShowStandards] = useState(false);
  const [showCopModal, setShowCopModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sound & Haptic Logic
  const triggerFeedback = useCallback((type: 'click' | 'switch' | 'success' | 'error' | 'delete' = 'click') => {
    // Haptics
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'error' || type === 'delete') navigator.vibrate([50, 30, 50]);
      else if (type === 'success') navigator.vibrate([10, 50, 20]);
      else navigator.vibrate(10);
    }

    // Sound
    if (!soundEnabled) return;
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'switch') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'success') {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc2.type = 'sine';
        
        osc.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(554, now); // Major 3rd
        
        gain.gain.setValueAtTime(0.05, now);
        gain2.gain.setValueAtTime(0.05, now);
        
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.4);
        osc2.stop(now + 0.4);
      } else if (type === 'error' || type === 'delete') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.error("Audio Playback Error", e);
    }
  }, [soundEnabled]);

  // Theme Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Reset Upstream Drop when mode changes
  useEffect(() => {
    setUpstreamDrop(0);
  }, [mode]);

  const toggleTheme = () => {
    triggerFeedback('switch');
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleSound = () => {
    if (!soundEnabled) triggerFeedback('click');
    setSoundEnabled(!soundEnabled);
  }

  const changeMode = (newMode: CalculationMode) => {
    if (mode !== newMode) {
      triggerFeedback('switch');
      setMode(newMode);
    }
  };

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
      if (currentPipe.diameter !== selectedDiameter) setSelectedDiameter(currentPipe.diameter);
      if (currentPipe.material !== selectedMaterial) setSelectedMaterial(currentPipe.material);
    }
  }, [currentPipe, selectedDiameter, selectedMaterial]);

  // Calculation Logic
  useEffect(() => {
    calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tl1, il1, tl2, il2, distance, gradient, pipeId, isPumpingMain]);

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
    if (absGradient > currentPipe.minGradient && !isPumpingMain) {
      issues.push(`Gradient 1:${absGradient.toFixed(0)} is flatter than min 1:${currentPipe.minGradient} for ${currentPipe.label}. Risk of silting.`);
    }
    if (absGradient < PUB_STANDARDS.maxGradient && absGradient !== 0 && !isPumpingMain) {
      issues.push(`Gradient 1:${absGradient.toFixed(0)} is steeper than max 1:${PUB_STANDARDS.maxGradient}. Risk of scouring.`);
    }
    if (mode === CalculationMode.VERIFY && startIl <= endIl && !isPumpingMain) {
      issues.push("Start IL is lower/equal to End IL. No gravity flow.");
    }
    
    // 3. Depth Check
    const depth1 = dTl1 - startIl;
    const depth2 = dTl2 - endIl;
    
    // PUB COP 4.2.1(e)(ii) - Minimum depth 750mm
    if (depth1 < IC_STANDARDS.minDepth && dTl1 !== 0) {
      issues.push(`Upstream Depth ${depth1.toFixed(2)}m is less than 750mm min (PUB COP 4.2.1(e)(ii)).`);
    }
    if (depth2 < IC_STANDARDS.minDepth && dTl2 !== 0) {
      issues.push(`Downstream Depth ${depth2.toFixed(2)}m is less than 750mm min (PUB COP 4.2.1(e)(ii)).`);
    }

    // 4. Velocity Check (Manning's Formula)
    // V = (1/n) * R^(2/3) * S^(1/2)
    const n = currentPipe.n;
    const D = currentPipe.diameter / 1000; // mm to m
    
    // Hydraulic Radius R = Area / Wetted Perimeter. For Full Flow: R = D / 4.
    const R = D / 4; 
    const S = absGradient > 0 ? 1 / absGradient : 0;
    const velocity = (1 / n) * Math.pow(R, 2/3) * Math.sqrt(S);

    const minV = isPumpingMain ? PUMPING_STANDARDS.minVelocity : PUB_STANDARDS.minVelocity;
    const maxV = isPumpingMain ? PUMPING_STANDARDS.maxVelocity : PUB_STANDARDS.maxVelocity;

    if (velocity < minV && velocity > 0) {
      issues.push(`Velocity ${velocity.toFixed(2)} m/s is below ${minV} m/s. Self-cleansing fail.`);
    }
    if (velocity > maxV) {
      issues.push(`Velocity ${velocity.toFixed(2)} m/s exceeds ${maxV} m/s. Scouring risk.`);
    }

    // 5. Drop Structure Checks (PUB Table 5 / 4.2.1)
    // If the pipe is a gravity sewer
    if (!isPumpingMain) {
        if (calcFall >= DROP_STRUCTURE_THRESHOLDS.vortexMin) {
            issues.push(`Hydraulic drop ${calcFall.toFixed(2)}m > 6.0m. Vortex drop structure required (Table 5).`);
        } else if (calcFall >= DROP_STRUCTURE_THRESHOLDS.backdropMin) {
             issues.push(`Hydraulic drop ${calcFall.toFixed(2)}m ≥ 0.5m. Backdrop or Tumbling Bay required (4.2.1.b.ii).`);
        }
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

  // Input Handlers with Sync Logic
  const handleTl1Change = (val: string) => {
    const v = val === '' ? '' : Number(val);
    setTl1(v);
    if (v !== '' && il1 !== '') {
      setDepth1((v - (il1 as number)).toFixed(3));
    }
  };

  const handleIl1Change = (val: string) => {
    const v = val === '' ? '' : Number(val);
    setIl1(v);
    if (tl1 !== '' && v !== '') {
      setDepth1(((tl1 as number) - v).toFixed(3));
    }
  };

  const handleDepth1Change = (val: string) => {
    setDepth1(val);
    const d = Number(val);
    if (val !== '' && !isNaN(d) && tl1 !== '') {
      setIl1(Number(((tl1 as number) - d).toFixed(3)));
    }
  };

  const handleTl2Change = (val: string) => {
    const v = val === '' ? '' : Number(val);
    setTl2(v);
    if (v !== '' && il2 !== '') {
      setDepth2((v - (il2 as number)).toFixed(3));
    }
  };

  const handleIl2Change = (val: string) => {
    const v = val === '' ? '' : Number(val);
    setIl2(v);
    if (tl2 !== '' && v !== '') {
      setDepth2(((tl2 as number) - v).toFixed(3));
    }
  };

  const handleDepth2Change = (val: string) => {
    setDepth2(val);
    const d = Number(val);
    if (val !== '' && !isNaN(d) && tl2 !== '') {
      setIl2(Number(((tl2 as number) - d).toFixed(3)));
    }
  };

  // Actions
  const saveToHistory = () => {
    if (!result) return;
    triggerFeedback('success');
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      inputs: { ic1, tl1, il1, ic2, tl2, il2, distance, gradient, pipeId, mode },
      result: result
    };
    setHistory(prev => [newEntry, ...prev]);
  };

  const restoreHistory = (entry: HistoryEntry) => {
    triggerFeedback('click');
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
    if (entry.inputs.tl1 !== '' && entry.inputs.il1 !== '') {
      setDepth1((Number(entry.inputs.tl1) - Number(entry.inputs.il1)).toFixed(3));
    } else {
      setDepth1('');
    }
    if (entry.inputs.tl2 !== '' && entry.inputs.il2 !== '') {
      setDepth2((Number(entry.inputs.tl2) - Number(entry.inputs.il2)).toFixed(3));
    } else {
      setDepth2('');
    }
    const pipe = [...PIPE_OPTIONS, ...PUMPING_PIPES].find(p => p.id === entry.inputs.pipeId);
    if (pipe) {
      if (pipe.diameter < 150) {
        setIsPumpingMain(true);
      }
      setSelectedMaterial(pipe.material);
      setSelectedDiameter(pipe.diameter);
    }
  };

  const requestDelete = (id: string) => {
    triggerFeedback('click');
    setDeleteConfirmId(id);
  };

  const executeDelete = () => {
    if (deleteConfirmId) {
      triggerFeedback('delete');
      setHistory(prev => prev.filter(entry => entry.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const handleNodeCopy = (ic: string, tl: number, il: number) => {
    triggerFeedback('click');
    const depth = tl - il;
    const text = `IC ${ic}\nTL: ${tl.toFixed(2)}\nIL: ${il.toFixed(3)}\nD: ${depth.toFixed(3)} m`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedNode(ic);
      setTimeout(() => setCopiedNode(null), 2000);
    });
  };

  const handleReportCopy = () => {
    if (!result) return;
    triggerFeedback('success');
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
      saveToHistory();
    });
  };

  const handleScheduleCopy = () => {
    if (history.length === 0) return;
    triggerFeedback('success');
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

  const handleRunCopy = (entry: HistoryEntry, runLabel: string) => {
    triggerFeedback('click');
    const text = `${runLabel}: ø${entry.result.pipe.diameter} ${entry.result.pipe.material} ${entry.result.distance.toFixed(2)}m 1:${Math.abs(entry.result.gradient).toFixed(0)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedNode(entry.id);
      setTimeout(() => setCopiedNode(null), 2000);
    });
  };

  const isGradientWarning = result && Math.abs(result.gradient) > currentPipe.minGradient;
  const isDistanceWarning = Number(distance) > DRAIN_LINE_CONSTRAINTS.maxLength;
  const gradientPercentage = result ? (100 / Math.abs(result.gradient)).toFixed(2) : '0.00';

  // Panel Logic Variables
  // Calculate dynamic displayed values for Upstream Panel (taking into account drop)
  const upstreamDisplayIl = mode === CalculationMode.UPSTREAM && result 
    ? result.startNode.il + upstreamDrop 
    : (il1 === '' ? '' : Number(il1));

  const upstreamDisplayDepth = mode === CalculationMode.UPSTREAM && result 
    ? (result.startNode.tl - (result.startNode.il + upstreamDrop))
    : (depth1 === '' ? '' : Number(depth1));

  const UpstreamPanel = (
    <LiquidCard key="upstream" className={mode === CalculationMode.UPSTREAM ? 'ring-2 ring-purple-500/50' : ''}>
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-400/30 text-blue-600 dark:text-blue-300 font-bold text-sm shadow-[0_0_15px_rgba(59,130,246,0.2)]">IC</div>
           <input 
              type="text" 
              value={ic1} 
              onChange={(e) => setIc1(e.target.value)} 
              className="bg-transparent border-b border-slate-300 dark:border-white/10 w-24 text-xl text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-blue-400 transition-colors"
            />
         </div>
         <div className="flex items-center gap-2">
           {result && (
              <button 
                onClick={() => handleNodeCopy(
                  result.startNode.id, 
                  result.startNode.tl, 
                  typeof upstreamDisplayIl === 'number' ? upstreamDisplayIl : result.startNode.il
                )}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-[10px] font-bold text-blue-600 dark:text-blue-300 transition-all active:scale-95"
                title="Copy for CAD"
              >
                {copiedNode === result.startNode.id ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                <span>{copiedNode === result.startNode.id ? 'COPIED' : 'COPY'}</span>
              </button>
           )}
           <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-600 dark:text-blue-300 uppercase tracking-widest">
             Upstream
           </div>
         </div>
      </div>
      
      {mode === CalculationMode.UPSTREAM && (
        <div className="mb-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between items-end mb-2">
             <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/50">
               <ArrowDownToLine size={12} />
               <span>Branch Drop</span>
             </div>
             {upstreamDrop > 0 && (
               <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded font-bold">
                 ACTIVE
               </span>
             )}
          </div>
          <div className="bg-slate-100 dark:bg-black/20 p-1 rounded-xl grid grid-cols-3 gap-1">
             <button 
               onClick={() => { setUpstreamDrop(0); triggerFeedback('click'); }}
               className={`py-2 text-xs font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${upstreamDrop === 0 ? 'bg-white dark:bg-white/20 shadow text-slate-800 dark:text-white' : 'text-slate-500 dark:text-white/40 hover:bg-white/50 dark:hover:bg-white/5'}`}
             >
               <span>Standard</span>
             </button>
             <button 
               onClick={() => { setUpstreamDrop(0.075); triggerFeedback('click'); }}
               className={`py-2 text-xs font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${upstreamDrop === 0.075 ? 'bg-purple-500 text-white shadow' : 'text-slate-500 dark:text-white/40 hover:bg-white/50 dark:hover:bg-white/5'}`}
             >
               <span>+75mm</span>
             </button>
             <button 
               onClick={() => { setUpstreamDrop(0.100); triggerFeedback('click'); }}
               className={`py-2 text-xs font-bold rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 ${upstreamDrop === 0.100 ? 'bg-purple-500 text-white shadow' : 'text-slate-500 dark:text-white/40 hover:bg-white/50 dark:hover:bg-white/5'}`}
             >
               <span>+100mm</span>
             </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <InputGroup label="Top Level (TL)" value={tl1} onChange={handleTl1Change} unit="m" placeholder="0.00" />
        
        <div className="relative">
           <InputGroup 
            label={
              <div className="flex items-center gap-2">
                <span>Invert Level (IL)</span>
                {upstreamDrop > 0 && mode === CalculationMode.UPSTREAM && (
                   <span className="text-[9px] text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/20 px-1.5 py-0.5 rounded">
                     Branch IL (Modified)
                   </span>
                )}
              </div>
            } 
            value={typeof upstreamDisplayIl === 'number' ? upstreamDisplayIl.toFixed(3) : upstreamDisplayIl} 
            onChange={handleIl1Change} 
            unit="m" 
            placeholder="0.00"
            readOnly={mode === CalculationMode.UPSTREAM}
          />
          {mode === CalculationMode.UPSTREAM && result && upstreamDrop === 0 && (
             <div className="absolute right-14 top-[2.1rem] pointer-events-none text-[10px] text-slate-400 dark:text-white/20">
               (Main Pipe)
             </div>
          )}
        </div>

        <InputGroup 
          label="Depth"
          value={typeof upstreamDisplayDepth === 'number' ? upstreamDisplayDepth.toFixed(3) : upstreamDisplayDepth}
          onChange={mode === CalculationMode.UPSTREAM ? () => {} : handleDepth1Change}
          unit="m"
          placeholder="0.00"
          readOnly={mode === CalculationMode.UPSTREAM}
        />
      </div>
    </LiquidCard>
  );

  const DownstreamPanel = (
    <LiquidCard key="downstream" className={mode === CalculationMode.DOWNSTREAM ? 'ring-2 ring-cyan-500/50' : ''}>
      <div className="flex justify-between items-center mb-6">
         <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-400/30 text-purple-600 dark:text-purple-300 font-bold text-sm shadow-[0_0_15px_rgba(168,85,247,0.2)]">IC</div>
           <input 
              type="text" 
              value={ic2} 
              onChange={(e) => setIc2(e.target.value)} 
              className="bg-transparent border-b border-slate-300 dark:border-white/10 w-24 text-xl text-slate-800 dark:text-white font-semibold focus:outline-none focus:border-purple-400 transition-colors"
            />
         </div>
         <div className="flex items-center gap-2">
           {result && (
              <button 
                onClick={() => handleNodeCopy(result.endNode.id, result.endNode.tl, result.endNode.il)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-[10px] font-bold text-purple-600 dark:text-purple-300 transition-all active:scale-95"
                title="Copy for CAD"
              >
                {copiedNode === result.endNode.id ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                <span>{copiedNode === result.endNode.id ? 'COPIED' : 'COPY'}</span>
              </button>
           )}
           <div className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-600 dark:text-purple-300 uppercase tracking-widest">
             Downstream
           </div>
         </div>
      </div>
      
      <div className="space-y-4">
        <InputGroup label="Top Level (TL)" value={tl2} onChange={handleTl2Change} unit="m" placeholder="0.00" />
        <InputGroup 
          label="Invert Level (IL)" 
          value={mode === CalculationMode.DOWNSTREAM && result ? result.endNode.il.toFixed(3) : il2} 
          onChange={handleIl2Change} 
          unit="m" 
          placeholder="0.00"
          readOnly={mode === CalculationMode.DOWNSTREAM}
        />
        <InputGroup 
          label="Depth"
          value={mode === CalculationMode.DOWNSTREAM && result ? result.endNode.depth.toFixed(3) : depth2}
          onChange={mode === CalculationMode.DOWNSTREAM ? () => {} : handleDepth2Change}
          unit="m"
          placeholder="0.00"
          readOnly={mode === CalculationMode.DOWNSTREAM}
        />
      </div>
    </LiquidCard>
  );

  return (
    <div className={`min-h-screen w-full p-4 md:p-8 flex flex-col items-center relative overflow-x-hidden selection:bg-cyan-500/30 bg-slate-100 dark:bg-transparent transition-colors duration-500`}>
      
      {/* Background Liquid Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-[#24243e] dark:via-[#302b63] dark:to-[#0f0c29] transition-colors duration-700">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-300/30 dark:bg-purple-900/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-300/30 dark:bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-cyan-200/30 dark:bg-cyan-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Standards Popup */}
      {showStandards && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-[#1a1f3c] border border-black/5 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <button 
              onClick={() => setShowStandards(false)}
              className="absolute top-4 right-4 text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white"
            >
              <X size={24} />
            </button>
            <div className="flex items-center gap-3 mb-4 text-cyan-600 dark:text-cyan-300">
              <Info size={24} />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">PUB Standard Reference</h3>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                <p className="text-xs uppercase text-slate-500 dark:text-white/40 mb-1">Velocity Limits</p>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-white">Gravity Min</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{PUB_STANDARDS.minVelocity} m/s</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-slate-700 dark:text-white">Pumping Min</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">{PUMPING_STANDARDS.minVelocity} m/s</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-slate-700 dark:text-white">Maximum</span>
                  <span className="font-mono text-red-500 dark:text-red-400">{PUB_STANDARDS.maxVelocity} m/s</span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                 <p className="text-xs uppercase text-slate-500 dark:text-white/40 mb-1">Hydraulic Drops</p>
                 <div className="flex justify-between items-center">
                   <span className="text-slate-700 dark:text-white">≥ 0.5m</span>
                   <span className="font-mono text-amber-600 dark:text-amber-400">Backdrop Required</span>
                 </div>
                 <div className="flex justify-between items-center mt-1">
                   <span className="text-slate-700 dark:text-white">> 6.0m</span>
                   <span className="font-mono text-red-500 dark:text-red-400">Vortex Drop Required</span>
                 </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                 <p className="text-xs uppercase text-slate-500 dark:text-white/40 mb-1">Maximum Length</p>
                 <div className="flex justify-between items-center">
                   <span className="text-slate-700 dark:text-white">Gravity Sewer</span>
                   <span className="font-mono text-emerald-600 dark:text-emerald-400">50 m</span>
                 </div>
                 <p className="text-[10px] text-slate-400 dark:text-white/30 mt-1">Section 4.2.1(b)(i) - Provide intermediate ICs for longer runs.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* COPSSW Guidelines Modal */}
      {showCopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-[#1a1f3c] border border-black/5 dark:border-white/10 rounded-3xl p-0 max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5 backdrop-blur-xl">
              <div className="flex items-center gap-3 text-cyan-600 dark:text-cyan-300">
                <BookOpen size={24} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">COPSSW Guidelines</h3>
                  <p className="text-xs text-slate-500 dark:text-white/50 font-medium">Comparison of Editions & Standards</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCopModal(false)}
                className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Content Scrollable */}
            <div className="overflow-y-auto p-6 space-y-8">
              
              {/* Section 1: Overview */}
              <section>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 mb-4">Historical Overview</h4>
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="w-16 shrink-0 text-xs font-bold py-1 px-2 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white text-center h-fit">2000</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">1st Edition</p>
                      <p className="text-sm text-slate-600 dark:text-white/60">Established foundational sewerage design standards, basic inspection chamber (IC) and manhole provisions.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-16 shrink-0 text-xs font-bold py-1 px-2 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white text-center h-fit">2019</div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">2nd Edition (+2021 Addendum)</p>
                      <p className="text-sm text-slate-600 dark:text-white/60">Updated flow design basis, introduced sewer protection corridors, added structural and waterproofing requirements.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-16 shrink-0 text-xs font-bold py-1 px-2 rounded bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-center h-fit shadow-lg shadow-cyan-500/20">2025</div>
                    <div>
                      <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">3rd Edition (Latest)</p>
                      <p className="text-sm text-slate-600 dark:text-white/60">Strengthened environmental & safety standards, enhanced monitoring, tighter construction tolerance, new annexes for VOCs.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Comparison Table (Simplified as Cards for Mobile/Desktop) */}
              <section>
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 mb-4">Technical Specifications</h4>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Inspection Chambers */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    <h5 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Inspection Chambers
                    </h5>
                    <ul className="space-y-3 text-sm">
                      <li className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 dark:text-white/50">Depth</span>
                        <span className="font-medium text-slate-800 dark:text-white text-right">Min 750mm</span>
                      </li>
                      <li className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 dark:text-white/50">Location</span>
                        <span className="font-medium text-slate-800 dark:text-white text-right">Bends, junctions, grade changes. Max spacing 50m.</span>
                      </li>
                      <li className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 dark:text-white/50">Materials</span>
                        <span className="font-medium text-slate-800 dark:text-white text-right">Heavy-duty cast iron or HDPE. SS EN 124 compliant.</span>
                      </li>
                      <li className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 dark:text-white/50">Watertightness</span>
                        <span className="font-medium text-slate-800 dark:text-white text-right">Mandatory testing (Annex D).</span>
                      </li>
                    </ul>
                  </div>

                  {/* Manholes */}
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                    <h5 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      Manholes
                    </h5>
                    <ul className="space-y-3 text-sm">
                      <li className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 dark:text-white/50">Depth</span>
                        <span className="font-medium text-slate-800 dark:text-white text-right">Min 1.5m</span>
                      </li>
                        <li className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 dark:text-white/50">Structure</span>
                        <span className="font-medium text-slate-800 dark:text-white text-right">Reinforced concrete, lined. No construction under buildings.</span>
                      </li>
                      <li className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 dark:text-white/50">Access</span>
                        <span className="font-medium text-slate-800 dark:text-white text-right">Step irons/ladders (AS/NZS). Platforms for deep shafts.</span>
                      </li>
                      <li className="flex justify-between items-start gap-2">
                        <span className="text-slate-500 dark:text-white/50">Safety</span>
                        <span className="font-medium text-slate-800 dark:text-white text-right">Gas monitoring, safety signage, ventilation.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3: Summary */}
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-800 dark:text-cyan-200 text-sm leading-relaxed">
                <strong>2025 Key Update:</strong> The latest guidelines emphasize operational safety, environmental compliance (VOCs), and routine maintenance access. Flow direction, benching, and watertight pipe connections are critical for both manholes and inspection chambers to ensure durability and system integrity.
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 dark:bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-[#1a1f3c] border border-black/5 dark:border-white/10 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 dark:text-red-400">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Delete Run?</h3>
                <p className="text-sm text-slate-500 dark:text-white/60">This will remove this run from your project schedule. This action cannot be undone.</p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white/80 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => executeDelete()}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium shadow-lg shadow-red-500/20 transition-all transform active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 mb-12">
        
        {/* Header & Mode Selection */}
        <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-center gap-6 mb-8 relative z-20">
          
          {/* Logo Section */}
          <div className="flex items-center gap-4 group">
            <div className="relative">
              <div className="absolute -inset-2 bg-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/20 text-white transform transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                <Droplets className="h-8 w-8" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white tracking-tight drop-shadow-sm">
                Sewerage<span className="font-light text-cyan-600 dark:text-cyan-400">Pro</span>
              </h1>
              <p className="text-slate-500 dark:text-white/40 text-sm font-medium tracking-wide">PUB Code of Practice • Singapore</p>
            </div>
          </div>

          {/* Dynamic Island Control Panel */}
          <div className="flex items-center p-1.5 gap-2 rounded-[2.5rem] bg-white/70 dark:bg-[#0f0c29]/60 backdrop-blur-2xl border border-white/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-500 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgb(0,0,0,0.5)] hover:scale-[1.01] ring-1 ring-white/40 dark:ring-white/5">
            
            {/* Mode Switcher Pill */}
            <div className="flex p-1.5 bg-slate-200/50 dark:bg-white/5 rounded-[2rem] relative">
              <button 
                onClick={() => changeMode(CalculationMode.DOWNSTREAM)}
                className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-[1.6rem] text-sm font-semibold transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  mode === CalculationMode.DOWNSTREAM 
                    ? 'bg-white dark:bg-[#24243e] text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-100' 
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/80 hover:bg-white/40 dark:hover:bg-white/5 scale-95 hover:scale-95'
                }`}
              >
                <TrendingDown size={18} strokeWidth={2.5} />
                <span className="hidden md:inline">Slope Down</span>
              </button>
              
              <button 
                onClick={() => changeMode(CalculationMode.UPSTREAM)}
                className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-[1.6rem] text-sm font-semibold transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                  mode === CalculationMode.UPSTREAM 
                    ? 'bg-white dark:bg-[#24243e] text-purple-600 dark:text-purple-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-100' 
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/80 hover:bg-white/40 dark:hover:bg-white/5 scale-95 hover:scale-95'
                }`}
              >
                <ArrowUpRight size={18} strokeWidth={2.5} />
                <span className="hidden md:inline">Slope Up</span>
              </button>

              <button 
                onClick={() => changeMode(CalculationMode.VERIFY)}
                className={`relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-[1.6rem] text-sm font-semibold transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  mode === CalculationMode.VERIFY 
                    ? 'bg-white dark:bg-[#24243e] text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-black/5 dark:ring-white/10 scale-100' 
                    : 'text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/80 hover:bg-white/40 dark:hover:bg-white/5 scale-95 hover:scale-95'
                }`}
              >
                <Settings2 size={18} strokeWidth={2.5} />
                <span className="hidden md:inline">Verify</span>
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10 mx-1"></div>

            {/* Read Guidelines Button */}
            <button
              onClick={() => { triggerFeedback('click'); setShowCopModal(true); }}
              className="relative p-3 rounded-full text-slate-500 dark:text-white/40 hover:bg-white/50 dark:hover:bg-white/10 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all duration-300 hover:shadow-sm active:scale-90"
              title="Read COP Guidelines"
            >
              <BookOpen size={20} strokeWidth={2.5} />
            </button>

             {/* Sound Toggle */}
             <button
              onClick={toggleSound}
              className={`relative p-3 rounded-full transition-all duration-300 hover:shadow-sm active:scale-90 ${soundEnabled ? 'text-slate-500 dark:text-white/40 hover:bg-white/50 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white' : 'text-slate-300 dark:text-white/20'}`}
              title={soundEnabled ? "Mute Sounds" : "Enable Sounds"}
            >
              {soundEnabled ? <Volume2 size={20} strokeWidth={2.5} /> : <VolumeX size={20} strokeWidth={2.5} />}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="relative p-3 rounded-full text-slate-500 dark:text-white/40 hover:bg-white/50 dark:hover:bg-white/10 hover:text-amber-500 dark:hover:text-yellow-300 transition-all duration-300 hover:shadow-sm active:scale-90 active:rotate-90"
              title="Toggle Theme"
            >
              <div className="relative z-10">
                {theme === 'dark' ? <Sun size={20} strokeWidth={2.5} /> : <Moon size={20} strokeWidth={2.5} />}
              </div>
            </button>
          </div>
        </div>

        {/* Left Column: Inputs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Top Panel (Upstream or Downstream based on mode) */}
          {mode === CalculationMode.UPSTREAM ? DownstreamPanel : UpstreamPanel}

          {/* Connection Parameters */}
          <LiquidCard>
             <div className="flex items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-2">
                   <button 
                      onClick={() => { setIsPipeSettingsCollapsed(!isPipeSettingsCollapsed); triggerFeedback('click'); }}
                      className="p-1 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      title={isPipeSettingsCollapsed ? "Expand Details" : "Minimize Details"}
                   >
                      {isPipeSettingsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                   </button>
                   <div className="h-px w-4 bg-slate-300 dark:bg-white/10"></div>
                   <span 
                      className="text-xs font-medium text-slate-400 dark:text-white/40 uppercase tracking-widest whitespace-nowrap cursor-pointer select-none"
                      onClick={() => { setIsPipeSettingsCollapsed(!isPipeSettingsCollapsed); triggerFeedback('click'); }}
                   >
                      PIPE
                   </span>
                   
                   {/* Summary Pill when Minimized */}
                   {isPipeSettingsCollapsed && (
                      <div className="animate-in fade-in slide-in-from-left-2 duration-300 flex items-center gap-2 ml-2 px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                          <div className={`w-1.5 h-1.5 rounded-full ${isPumpingMain ? 'bg-pink-500' : 'bg-cyan-500'}`}></div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-white/80">ø{selectedDiameter}mm</span>
                          <span className="text-[10px] text-slate-400 dark:text-white/50 hidden sm:inline">{selectedMaterial}</span>
                      </div>
                   )}
                   
                   {!isPipeSettingsCollapsed && <div className="h-px w-8 bg-slate-300 dark:bg-white/10"></div>}
                </div>
                
                {/* Pumping Main Toggle */}
                <button 
                   onClick={() => { setIsPumpingMain(!isPumpingMain); triggerFeedback('switch'); }}
                   className={`flex items-center gap-2 px-2 py-1 rounded-full border transition-all duration-300 ${isPumpingMain ? 'bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-300' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 dark:text-white/30 hover:border-slate-300 dark:hover:border-white/20'}`}
                   title="Enable pumping main options (allows ø100mm)"
                >
                   <Activity size={12} />
                   <span className="text-[10px] font-bold uppercase hidden sm:inline">Pumping Main</span>
                   <span className="text-[10px] font-bold uppercase sm:hidden">PM</span>
                   <div className={`w-2 h-2 rounded-full ${isPumpingMain ? 'bg-pink-500 dark:bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.6)]' : 'bg-slate-300 dark:bg-white/20'}`}></div>
                </button>
             </div>

             {/* Collapsible Pipe Details Section */}
             {!isPipeSettingsCollapsed && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                   {/* Highlighted Active Pipe Card */}
                   <div className="relative mb-6 p-5 rounded-2xl bg-gradient-to-br from-slate-100 to-white dark:from-white/5 dark:to-white/[0.02] border border-slate-200 dark:border-white/10 shadow-inner overflow-hidden group transition-all hover:shadow-lg dark:hover:shadow-cyan-500/10">
                      {/* Active Glow Background */}
                      <div className="absolute inset-0 bg-cyan-500/5 dark:bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute -right-12 -top-12 w-32 h-32 bg-cyan-500/20 dark:bg-cyan-400/10 blur-3xl rounded-full pointer-events-none"></div>
                      
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-cyan-300/70">Selected Pipe</span>
                            {isPumpingMain && <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-600 dark:text-pink-300 text-[9px] font-bold border border-pink-500/20">PUMPING MAIN</span>}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">ø{selectedDiameter}mm</span>
                            <span className="text-lg text-slate-500 dark:text-white/60 font-light">{selectedMaterial}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-200/50 dark:bg-black/30 border border-slate-300/50 dark:border-white/10">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Roughness</span>
                            <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">{currentPipe.n}</span>
                          </div>
                          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-200/50 dark:bg-black/30 border border-slate-300/50 dark:border-white/10">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Min Grad</span>
                            <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">1:{currentPipe.minGradient}</span>
                          </div>
                        </div>
                      </div>
                   </div>

                   {/* Split Material / Diameter Selection */}
                   <div className="grid grid-cols-2 gap-4 mb-5">
                      {/* Size (MM) on the LEFT */}
                      <div className="flex flex-col gap-1.5">
                         <label className="text-xs font-medium text-slate-500 dark:text-blue-200/70 uppercase tracking-wider ml-1">
                            Pipe Size
                         </label>
                         <div className="relative group/select">
                          <select 
                            value={selectedDiameter} 
                            onChange={(e) => setSelectedDiameter(Number(e.target.value))}
                            className="w-full bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-sm rounded-2xl px-3 py-3 appearance-none focus:border-cyan-400/50 outline-none transition-all cursor-pointer hover:bg-white/80 dark:hover:bg-white/5 focus:scale-[1.02] focus:bg-white dark:focus:bg-black/30 ease-out duration-300"
                          >
                            {availableDiameters.map(d => (
                              <option key={d} value={d} className="bg-white dark:bg-[#24243e] text-slate-800 dark:text-white">ø{d}mm</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-3.5 text-slate-400 dark:text-white/40 w-4 h-4 pointer-events-none" />
                        </div>
                      </div>

                      {/* Material on the RIGHT */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-slate-500 dark:text-blue-200/70 uppercase tracking-wider ml-1">Change Material</label>
                          <button onClick={() => setShowStandards(true)} className="group relative outline-none">
                            <Info size={12} className="text-slate-400 dark:text-white/30 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors" />
                          </button>
                        </div>
                        <div className="relative group/select">
                          <select 
                            value={selectedMaterial} 
                            onChange={(e) => {
                              setSelectedMaterial(e.target.value);
                            }}
                            className="w-full bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-sm rounded-2xl px-3 py-3 appearance-none focus:border-cyan-400/50 outline-none transition-all cursor-pointer hover:bg-white/80 dark:hover:bg-white/5 focus:scale-[1.02] focus:bg-white dark:focus:bg-black/30 ease-out duration-300"
                          >
                            {materials.map(m => (
                              <option key={m} value={m} className="bg-white dark:bg-[#24243e] text-slate-800 dark:text-white">{m}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-3.5 text-slate-400 dark:text-white/40 w-4 h-4 pointer-events-none" />
                        </div>
                      </div>
                   </div>
                </div>
             )}

             {/* Always Visible: Distance & Gradient Inputs */}
             <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <InputGroup 
                    label={
                      <div className="flex justify-between items-center w-full pr-1">
                         <span>Distance</span>
                         <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-wider transition-all duration-300 ${
                             isDistanceWarning 
                             ? 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.2)]' 
                             : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 border-slate-200 dark:border-white/10'
                         }`}>Max 50m</span>
                      </div>
                    } 
                    value={distance} 
                    onChange={(v) => setDistance(v === '' ? '' : Number(v))} 
                    unit="m" 
                    placeholder="0.00" 
                  />
                  {isDistanceWarning && (
                    <div className="flex items-start gap-1.5 mt-2 px-2 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-300 text-[10px] animate-in fade-in slide-in-from-top-1 duration-300">
                       <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                       <div className="flex flex-col">
                           <span className="font-bold">Exceeds PUB Limit (Section 4.2.1)</span>
                           <span className="opacity-80">For longer runs, provide intermediate ICs.</span>
                       </div>
                    </div>
                  )}
                </div>
                
                <div className="relative">
                  <InputGroup 
                    label={
                        <div className="flex justify-between items-center w-full pr-1">
                         <span>Gradient (1:X)</span>
                         {result && <span className="text-[9px] text-slate-400 dark:text-white/30 bg-slate-100 dark:bg-white/5 px-1 rounded">{gradientPercentage}%</span>}
                        </div>
                    }
                    value={mode === CalculationMode.VERIFY && result ? (result.gradient === 0 ? '0' : Math.abs(result.gradient).toFixed(1)) : gradient} 
                    onChange={(v) => setGradient(v === '' ? '' : Number(v))} 
                    unit="" 
                    placeholder="60"
                    readOnly={mode === CalculationMode.VERIFY}
                  />
                  {/* Warning Icon for Gradient Input */}
                  {isGradientWarning && !result?.isCompliant && mode !== CalculationMode.VERIFY && !isPumpingMain && (
                     <div className="absolute right-0 top-0 -mt-1 flex items-center gap-1 text-amber-500 dark:text-amber-400 animate-pulse bg-white/50 dark:bg-black/50 rounded px-1">
                       <AlertTriangle size={10} />
                       <span className="text-[10px] font-bold">Below Min</span>
                     </div>
                  )}
                </div>
             </div>
          </LiquidCard>

          {/* Bottom Panel (Downstream or Upstream based on mode) */}
          {mode === CalculationMode.UPSTREAM ? UpstreamPanel : DownstreamPanel}

        </div>

        {/* Right Column: Results & Graph */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Action Bar */}
          <div className="flex flex-wrap gap-3 justify-end">
            <button 
              onClick={saveToHistory}
              className="px-4 py-2 bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-white/40 dark:border-white/10 rounded-xl text-slate-600 dark:text-white/80 text-sm font-medium flex items-center gap-2 transition-all active:scale-95 shadow-sm"
            >
              <ListPlus size={16} />
              Add to Schedule
            </button>
            <button 
              onClick={handleReportCopy}
              className={`px-4 py-2 border rounded-xl text-sm font-medium flex items-center gap-2 transition-all active:scale-95 relative overflow-hidden ${showCopyFeedback ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-300' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/20'}`}
            >
              {showCopyFeedback ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {showCopyFeedback ? 'Copied!' : 'Copy Report'}
            </button>
          </div>

          {/* Results Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <LiquidCard className="flex flex-col justify-center items-center text-center py-8">
                <span className="text-xs text-slate-400 dark:text-white/40 uppercase tracking-widest mb-2">Calculated Fall</span>
                <span key={result?.fall} className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500 dark:from-cyan-300 dark:to-blue-300 font-mono animate-pop-in">
                  {result ? result.fall.toFixed(3) : '0.000'}
                  <span className="text-sm text-slate-400 dark:text-white/30 ml-1">m</span>
                </span>
             </LiquidCard>
             
             <LiquidCard className="flex flex-col justify-center items-center text-center py-8">
                <span className="text-xs text-slate-400 dark:text-white/40 uppercase tracking-widest mb-2">Velocity</span>
                <span key={result?.velocity} className={`text-3xl font-bold font-mono animate-pop-in ${
                  result?.velocity && (result.velocity < (isPumpingMain ? PUMPING_STANDARDS.minVelocity : PUB_STANDARDS.minVelocity) || result.velocity > PUB_STANDARDS.maxVelocity) ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-300'
                }`}>
                  {result ? result.velocity.toFixed(2) : '0.00'}
                  <span className="text-sm text-slate-400 dark:text-white/30 ml-1">m/s</span>
                </span>
             </LiquidCard>

             <LiquidCard className={`flex flex-col justify-center items-center text-center py-8 transition-colors duration-500 ${
                result?.isCompliant ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'
             }`}>
                <span className="text-xs text-slate-400 dark:text-white/40 uppercase tracking-widest mb-2">Compliance</span>
                {result?.isCompliant ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 animate-pop-in">
                    <CheckCircle2 size={32} />
                    <span className="font-bold">PASSED</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400 animate-pop-in">
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
                <SchematicGraph data={result} theme={theme} />
              ) : (
                 <div className="h-full flex items-center justify-center text-slate-300 dark:text-white/20">
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
            <LiquidCard className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center gap-3 mb-4 text-red-500 dark:text-red-400">
                 <AlertTriangle size={20} />
                 <h3 className="font-bold uppercase tracking-wider text-sm">Compliance Issues</h3>
               </div>
               <div className="space-y-2">
                 {result.complianceIssues.map((issue, idx) => (
                   <div key={idx} className="flex gap-3 text-sm text-slate-700 dark:text-white/70 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-red-500/10">
                     <span className="text-red-500 font-mono opacity-50">0{idx + 1}</span>
                     {issue}
                   </div>
                 ))}
               </div>
            </LiquidCard>
          )}
          
          {result && result.isCompliant && (
             <LiquidCard className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={20} />
                  <h3 className="font-bold uppercase tracking-wider text-sm">Design Compliant</h3>
                </div>
                <div className="mt-3 space-y-1 px-4">
                  <div className="flex items-center gap-2 text-sm text-emerald-700/80 dark:text-emerald-300/80">
                     <CheckCircle2 size={14} />
                     <span>Distance within limit ({result.distance.toFixed(1)}m ≤ 50m)</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-white/60 mt-3 pt-3 border-t border-emerald-200 dark:border-white/5 px-4">
                  All hydraulic parameters are within PUB Standard Code of Practice (Section 3 & 4).
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
                    history.length === 0 ? 'bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-white/20 cursor-not-allowed' : 
                    showScheduleCopyFeedback ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10'
                  }`}
                >
                  {showScheduleCopyFeedback ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                  {showScheduleCopyFeedback ? 'COPIED' : 'COPY SCHEDULE'}
               </button>
            </div>

            <div className="overflow-x-auto mt-4">
              {history.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-white/20 text-sm">
                  <p>No calculations added to schedule yet.</p>
                  <p className="text-xs mt-2 opacity-50">Click "Add to Schedule" to build your project run list.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/40 uppercase text-xs">
                      <th className="pb-3 font-medium pl-2">Run #</th>
                      <th className="pb-3 font-medium">Route</th>
                      <th className="pb-3 font-medium">Specs</th>
                      <th className="pb-3 font-medium">Distance</th>
                      <th className="pb-3 font-medium">Grade</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {[...history].map((entry, idx) => (
                      <tr key={entry.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 pl-2 font-mono text-slate-500 dark:text-white/60">
                           Run {history.length - idx}
                        </td>
                        <td className="py-3 text-slate-700 dark:text-white/80">
                           IC {entry.inputs.ic1} <span className="text-slate-300 dark:text-white/30 px-1">→</span> IC {entry.inputs.ic2}
                        </td>
                        <td className="py-3 text-slate-700 dark:text-white/80">
                           <span className="text-cyan-600 dark:text-cyan-300 font-bold">ø{entry.result.pipe.diameter}</span> {entry.result.pipe.material}
                        </td>
                        <td className="py-3 text-slate-500 dark:text-white/60 font-mono">
                           {entry.result.distance.toFixed(2)}m
                        </td>
                        <td className="py-3 text-slate-700 dark:text-white/80 font-mono">
                           1:{Math.abs(entry.result.gradient).toFixed(0)}
                        </td>
                        <td className="py-3">
                           {entry.result.isCompliant ? (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">PASS</span>
                           ) : (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">FAIL</span>
                           )}
                        </td>
                        <td className="py-3 text-right pr-2">
                          <div className="flex justify-end items-center gap-2">
                            <button 
                               onClick={() => restoreHistory(entry)}
                               className="p-1.5 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-lg transition-colors transform active:scale-90 hover:scale-110"
                               title="Restore and Edit"
                            >
                              <RefreshCcw size={16} />
                            </button>
                            <button 
                               onClick={() => handleRunCopy(entry, `Run ${history.length - idx}`)}
                               className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors transform active:scale-90 hover:scale-110"
                               title="Copy Run Details"
                            >
                              {copiedNode === entry.id ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                            </button>
                            <button 
                               onClick={() => requestDelete(entry.id)}
                               className="p-1.5 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors transform active:scale-90 hover:scale-110"
                               title="Delete Run"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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
      <footer className="w-full max-w-7xl mt-auto py-6 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 dark:text-white/40 text-sm z-10">
        <div>
          &copy; {new Date().getFullYear()} SeweragePro Calculator. All rights reserved.
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <span className="flex items-center gap-2">
             <span>Developed by Mohd Ezam Bin Othman</span>
          </span>
          <div className="flex items-center gap-4">
             <a href="tel:+60105561616" className="flex items-center gap-2 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
               <Phone size={14} />
               <span>+6010-5561616</span>
             </a>
             <a href="mailto:ezamothman@gmail.com" className="flex items-center gap-2 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
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
