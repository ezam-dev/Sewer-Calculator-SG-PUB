import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, AlertTriangle, CheckCircle2, Settings2, TrendingDown, ArrowUpRight, Droplets, ChevronDown, ArrowRight, Copy, History, Save, RefreshCcw, Mail, Phone } from 'lucide-react';
import { LiquidCard } from './components/LiquidCard';
import { InputGroup } from './components/InputGroup';
import SchematicGraph from './components/SchematicGraph';
import { CalculationMode, CalculationResult, SewerNode, HistoryEntry } from './types';
import { DEFAULT_VALUES, PUB_STANDARDS, PIPE_OPTIONS } from './constants';

const App: React.FC = () => {
  // State
  const [mode, setMode] = useState<CalculationMode>(CalculationMode.DOWNSTREAM);
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
  const [copiedNode, setCopiedNode] = useState<string | null>(null);

  // Group pipes by diameter for UI
  const pipeGroups = useMemo(() => {
    const groups: { [key: number]: typeof PIPE_OPTIONS } = {};
    PIPE_OPTIONS.forEach(p => {
      if (!groups[p.diameter]) groups[p.diameter] = [];
      groups[p.diameter].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b));
  }, []);

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

    const selectedPipe = PIPE_OPTIONS.find(p => p.id === pipeId) || PIPE_OPTIONS.find(p => p.diameter === 200) || PIPE_OPTIONS[0];

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
    
    // 1. Gradient Check
    if (absGradient > selectedPipe.minGradient) {
      issues.push(`Gradient 1:${absGradient.toFixed(0)} is flatter than min 1:${selectedPipe.minGradient} for ${selectedPipe.label}. Risk of silting.`);
    }
    if (absGradient < PUB_STANDARDS.maxGradient && absGradient !== 0) {
      issues.push(`Gradient 1:${absGradient.toFixed(0)} is steeper than max 1:${PUB_STANDARDS.maxGradient}. Risk of scouring.`);
    }
    if (mode === CalculationMode.VERIFY && startIl <= endIl) {
      issues.push("Start IL is lower/equal to End IL. No gravity flow.");
    }
    
    // 2. Depth Check
    const depth1 = dTl1 - startIl;
    const depth2 = dTl2 - endIl;
    if (depth1 < 1.0 && dTl1 !== 0) issues.push(`Upstream Depth ${depth1.toFixed(2)}m is shallow (< 1.0m).`);
    if (depth2 < 1.0 && dTl2 !== 0) issues.push(`Downstream Depth ${depth2.toFixed(2)}m is shallow (< 1.0m).`);

    // 3. Velocity Check (Manning's Formula)
    // V = (1/n) * R^(2/3) * S^(1/2)
    const n = selectedPipe.n;
    const D = selectedPipe.diameter / 1000; // mm to m
    
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
      pipe: selectedPipe,
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
  };

  const handleNodeCopy = (ic: string, tl: number, il: number) => {
    const depth = tl - il;
    // Format specifically for CAD MText
    // IC X
    // TL: 0.00
    // IL: 0.00
    // D: 0.00 m
    const text = `IC ${ic}\nTL: ${tl.toFixed(2)}\nIL: ${il.toFixed(2)}\nD: ${depth.toFixed(2)} m`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedNode(ic);
      setTimeout(() => setCopiedNode(null), 2000);
    });
  };

  const handleReportCopy = () => {
    if (!result) return;
    
    // Format specifically for Full Report
    const text = `SEWERAGE LINE DATA (PUB COMPLIANCE CHECK)
=========================================
Date: ${new Date().toLocaleString()}

PIPE SEGMENT: IC ${ic1} to IC ${ic2}
-----------------------------------------
Material:   ${result.pipe.label}
Diameter:   ${result.pipe.diameter}mm
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

  const currentPipe = PIPE_OPTIONS.find(p => p.id === pipeId) || PIPE_OPTIONS[0];

  return (
    <div className="min-h-screen w-full p-4 md:p-8 flex flex-col items-center relative overflow-x-hidden selection:bg-cyan-500/30">
      
      {/* Background Liquid Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]"></div>
      </div>

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
                      <span>{copiedNode === result.startNode.id ? 'COPIED' : 'CAD'}</span>
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
                 <div className="flex justify-between items-center px-1">
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
             <div className="flex items-center gap-2 mb-6">
                <div className="h-px flex-1 bg-white/10"></div>
                <span className="text-xs font-medium text-white/40 uppercase tracking-widest">Connection</span>
                <div className="h-px flex-1 bg-white/10"></div>
             </div>

             <div className="space-y-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-blue-200/70 uppercase tracking-wider ml-1">Pipe Type</label>
                  <div className="relative group/select">
                    <select 
                      value={pipeId} 
                      onChange={(e) => setPipeId(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 text-white text-sm rounded-2xl px-4 py-3 appearance-none focus:border-cyan-400/50 outline-none transition-all cursor-pointer hover:bg-white/5"
                    >
                      {pipeGroups.map(([diameter, pipes]) => (
                        <optgroup key={diameter} label={`${diameter}mm Pipes`} className="bg-[#24243e] text-white">
                          {pipes.map(pipe => (
                            <option key={pipe.id} value={pipe.id} className="bg-[#24243e] text-white">{pipe.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-3.5 text-white/40 w-4 h-4 pointer-events-none group-hover/select:text-cyan-400 transition-colors" />
                  </div>
                  <div className="flex justify-between px-1 mt-1">
                     <span className="text-[10px] text-white/30">n = {currentPipe.n}</span>
                     <span className="text-[10px] text-white/30">Min Grad 1:{currentPipe.minGradient}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Distance" value={distance} onChange={(v) => setDistance(v === '' ? '' : Number(v))} unit="m" placeholder="0.00" />
                  <InputGroup 
                    label="Gradient (1:X)" 
                    value={mode === CalculationMode.VERIFY && result ? (result.gradient === 0 ? '0' : Math.abs(result.gradient).toFixed(1)) : gradient} 
                    onChange={(v) => setGradient(v === '' ? '' : Number(v))} 
                    unit="" 
                    placeholder="60"
                    readOnly={mode === CalculationMode.VERIFY}
                  />
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
                      <span>{copiedNode === result.endNode.id ? 'COPIED' : 'CAD'}</span>
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
                 <div className="flex justify-between items-center px-1">
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
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 text-sm font-medium flex items-center gap-2 transition-all active:scale-95"
            >
              <Save size={16} />
              Save Log
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
                <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 font-mono">
                  {result ? result.fall.toFixed(3) : '0.000'}
                  <span className="text-sm text-white/30 ml-1">m</span>
                </span>
             </LiquidCard>
             
             <LiquidCard className="flex flex-col justify-center items-center text-center py-8">
                <span className="text-xs text-white/40 uppercase tracking-widest mb-2">Velocity</span>
                <span className={`text-3xl font-bold font-mono ${
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
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={32} />
                    <span className="font-bold">PASSED</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
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
            <LiquidCard className="bg-red-900/10 border-red-500/20">
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
             <LiquidCard className="bg-emerald-900/10 border-emerald-500/20">
                <div className="flex items-center gap-3 mb-2 text-emerald-400">
                  <CheckCircle2 size={20} />
                  <h3 className="font-bold uppercase tracking-wider text-sm">Design Compliant</h3>
                </div>
                <p className="text-sm text-white/60 ml-8">
                  All hydraulic parameters are within PUB Standard Code of Practice.
                </p>
             </LiquidCard>
          )}

        </div>

        {/* Full Width History Section */}
        <div className="lg:col-span-12">
          <LiquidCard title="History Log" icon={<History size={20} />}>
            <div className="overflow-x-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center text-white/20 text-sm">No calculations saved yet.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 uppercase text-xs">
                      <th className="pb-3 font-medium pl-2">Time</th>
                      <th className="pb-3 font-medium">Route</th>
                      <th className="pb-3 font-medium">Pipe</th>
                      <th className="pb-3 font-medium">Grade</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.map((entry) => (
                      <tr key={entry.id} className="group hover:bg-white/5 transition-colors">
                        <td className="py-3 pl-2 font-mono text-white/60">
                           {new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="py-3 text-white/80">
                           IC {entry.inputs.ic1} <span className="text-white/30 px-1">→</span> IC {entry.inputs.ic2}
                        </td>
                        <td className="py-3 text-white/80">
                           {entry.result.pipe.label}
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
                             className="p-1.5 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors"
                             title="Restore this calculation"
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