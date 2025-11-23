import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { Play, RotateCcw, Zap, AlertTriangle } from 'lucide-react';
import { CalculationResult } from '../types';
import { PUB_STANDARDS } from '../constants';

interface SchematicGraphProps {
  data: CalculationResult;
  theme: 'dark' | 'light';
}

// Helper component to capture coordinates from Recharts context
const CoordinateTracker = ({ cx, cy, type, onUpdate }: any) => {
  useEffect(() => {
    if (typeof cx === 'number' && typeof cy === 'number') {
      onUpdate(type, cx, cy);
    }
  }, [cx, cy, type, onUpdate]);
  return <circle cx={cx} cy={cy} r={0} fill="none" />;
};

const SchematicGraph: React.FC<SchematicGraphProps> = ({ data, theme }) => {
  // Animation State
  const [coords, setCoords] = useState<{ start: {x:number,y:number}, end: {x:number,y:number} }>({ start: {x:0,y:0}, end: {x:0,y:0} });
  const [isPlaying, setIsPlaying] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  // Check for steep gradient (PUB Standard: Max Gradient 1:20)
  // If gradient number is LOWER than maxGradient (e.g. 10 < 20), it is steeper.
  const isTooSteep = useMemo(() => {
    const g = Math.abs(data.gradient);
    return g < PUB_STANDARDS.maxGradient && g > 0;
  }, [data.gradient]);

  // Auto-play and Loop if too steep
  useEffect(() => {
    if (isTooSteep) {
      setIsPlaying(true);
      // Force re-render of animation if it was already playing
      setAnimKey(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [isTooSteep]);

  // Prepare data for Recharts
  const chartData = [
    {
      name: data.startNode.id,
      distance: 0,
      tl: data.startNode.tl,
      il: data.startNode.il,
      depth: data.startNode.depth,
    },
    {
      name: data.endNode.id,
      distance: data.distance,
      tl: data.endNode.tl,
      il: data.endNode.il,
      depth: data.endNode.depth,
    }
  ];

  // Calculate domain for Y Axis to look good
  const minVal = Math.min(data.startNode.il, data.endNode.il);
  const maxVal = Math.max(data.startNode.tl, data.endNode.tl);
  // Add buffer to scale
  const buffer = (maxVal - minVal) * 0.15; 

  // Theme-based colors
  const axisColor = theme === 'dark' ? '#ffffff40' : '#64748b'; // slate-500
  const gridColor = theme === 'dark' ? '#ffffff10' : '#00000010';
  const tooltipBg = theme === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const tooltipText = theme === 'dark' ? '#ffffff' : '#0f172a';

  // Physics Calculation for Object
  const slopeDelta = data.startNode.il - data.endNode.il;
  const isGravityFlow = slopeDelta > 0; // Downwards
  const absSlope = Math.abs(slopeDelta / (data.distance || 1));
  const safeSlope = absSlope > 0 ? absSlope : 0.001;
  
  // Duration Formula: 
  // T ~ 1/sqrt(slope). Steep (High slope) -> Low Duration. Flat (Low slope) -> High Duration.
  // Base: 1:100 (0.01) -> 3s. 
  // k / sqrt(0.01) = 3 => k = 0.3.
  // 1:10 (0.1) -> 0.3 / 0.316 = ~0.95s.
  const duration = Math.min(5, Math.max(0.8, 0.3 / Math.sqrt(safeSlope)));
  
  // Easing: Gravity accelerates (cubic-bezier). Pump is constant (linear).
  const easing = isGravityFlow ? 'cubic-bezier(0.55, 0.085, 0.68, 0.53)' : 'linear';

  // Memoized updater to prevent render loops
  const updateCoords = useMemo(() => (type: 'start'|'end', x: number, y: number) => {
    setCoords(prev => {
        if (Math.abs(prev[type].x - x) < 1 && Math.abs(prev[type].y - y) < 1) return prev;
        return { ...prev, [type]: { x, y } };
    });
  }, []);

  const handlePlay = () => {
    // If it's too steep, it's already auto-playing infinitely, so ignore manual toggle off
    if (isTooSteep) return; 

    setIsPlaying(false);
    // Small timeout to reset animation
    setTimeout(() => {
        setAnimKey(k => k + 1);
        setIsPlaying(true);
    }, 50);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const tl = payload.find((p: any) => p.dataKey === 'tl')?.value;
      const il = payload.find((p: any) => p.dataKey === 'il')?.value;
      const nodeName = label === 0 ? data.startNode.id : data.endNode.id;

      return (
        <div style={{ backgroundColor: tooltipBg, borderColor: tooltipBorder }} className="backdrop-blur-xl border p-4 rounded-2xl text-xs shadow-xl">
          <div className={`flex items-center gap-2 mb-2 border-b pb-2 ${theme === 'dark' ? 'border-white/10' : 'border-black/5'}`}>
            <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-white' : 'bg-slate-800'}`}></div>
            <p style={{ color: tooltipText }} className="font-bold text-sm uppercase tracking-wider">IC {nodeName}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-emerald-500 dark:text-emerald-300 flex justify-between gap-4">
              <span>Top Level:</span> 
              <span className="font-mono font-bold">{tl?.toFixed(3)}m</span>
            </p>
            <p className="text-cyan-600 dark:text-cyan-300 flex justify-between gap-4">
              <span>Invert Level:</span> 
              <span className="font-mono font-bold">{il?.toFixed(3)}m</span>
            </p>
            <div className={`h-px my-1 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/5'}`}></div>
            <p className={`${theme === 'dark' ? 'text-white/60' : 'text-slate-500'} flex justify-between gap-4`}>
              <span>Depth:</span> 
              <span className={`font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{(tl - il).toFixed(3)}m</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full pt-4 relative group/graph" onMouseEnter={handlePlay}>
      
      {/* Animation Controls */}
      <div className="absolute top-0 right-4 z-20 opacity-0 group-hover/graph:opacity-100 transition-opacity duration-300">
         {isTooSteep ? (
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 shadow-lg border border-white/10 text-white text-xs font-bold uppercase tracking-wider animate-pulse">
                <AlertTriangle size={14} />
                <span>Steep Gradient Loop</span>
             </div>
         ) : (
            <button 
                onClick={(e) => { e.stopPropagation(); handlePlay(); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 shadow-lg border border-slate-200 dark:border-white/10 text-cyan-600 dark:text-cyan-400 hover:scale-105 transition-all active:scale-95 text-xs font-bold uppercase tracking-wider"
            >
                {isPlaying ? <RotateCcw size={14} /> : <Play size={14} fill="currentColor" />}
                <span>Run Flow</span>
            </button>
         )}
      </div>

      {/* Animation Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
            {isPlaying && coords.start.x !== 0 && (
                <div
                    key={animKey}
                    className="absolute w-0 h-0"
                    style={{
                        // Initial position
                        transform: `translate3d(${coords.start.x}px, ${coords.start.y}px, 0)`,
                        // Loop infinitely if steep, otherwise run once
                        animation: `flowDrive ${duration}s ${easing} ${isTooSteep ? 'infinite' : 'forwards'}`
                    }}
                >
                     {/* Rotation & Graphic Wrapper */}
                     <div style={{ 
                         transform: `rotate(${Math.atan2(coords.end.y - coords.start.y, coords.end.x - coords.start.x) * 180 / Math.PI}deg) translate(-50%, -70%)`,
                         transition: 'transform 0.2s'
                     }}>
                        <div className="relative">
                            <div className="text-3xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)] select-none">
                              💩
                            </div>
                            
                            {/* Speed Lines / Effects based on duration */}
                            {(duration < 1.5 || isTooSteep) && (
                                <div className="absolute top-2 -left-6 space-y-1 opacity-60">
                                    <div className="w-4 h-0.5 bg-slate-400 dark:bg-white rounded-full animate-pulse"></div>
                                    <div className="w-8 h-0.5 bg-slate-400 dark:bg-white rounded-full animate-pulse delay-75"></div>
                                    <div className="w-5 h-0.5 bg-slate-400 dark:bg-white rounded-full animate-pulse delay-100"></div>
                                </div>
                            )}
                            
                            {/* Pump Effect for Uphill */}
                            {!isGravityFlow && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                                    <Zap size={12} className="text-yellow-400 animate-pulse" fill="currentColor" />
                                </div>
                            )}
                        </div>
                     </div>
                </div>
            )}
            <style>{`
                @keyframes flowDrive {
                    0% { transform: translate3d(${coords.start.x}px, ${coords.start.y}px, 0); }
                    100% { transform: translate3d(${coords.end.x}px, ${coords.end.y}px, 0); }
                }
            `}</style>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 40, left: 0, bottom: 20 }}
        >
          <defs>
            <linearGradient id="colorTl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
          
          <XAxis 
            dataKey="distance" 
            type="number" 
            domain={[0, 'dataMax']}
            stroke={axisColor} 
            tick={{fill: axisColor, fontSize: 10}}
            tickLine={false}
            axisLine={false}
            unit="m"
            dy={10}
          />
          
          <YAxis 
            domain={[minVal - buffer, maxVal + buffer]} 
            stroke={axisColor} 
            tick={{fill: axisColor, fontSize: 10}}
            tickLine={false}
            axisLine={false}
            width={45}
            tickFormatter={(val) => val.toFixed(2)}
          />
          
          <Tooltip content={<CustomTooltip />} cursor={{stroke: axisColor, strokeWidth: 2}} />
          
          {/* Top Level (Ground) */}
          <Area 
            type="monotone" 
            dataKey="tl" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorTl)" 
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={1000}
          />

          {/* Invert Level (Pipe) */}
          <Line 
            type="monotone" 
            dataKey="il" 
            stroke="#22d3ee" 
            strokeWidth={4} 
            dot={{r: 6, strokeWidth: 0, fill: '#22d3ee'}}
            activeDot={{r: 8, strokeWidth: 4, stroke: 'rgba(34, 211, 238, 0.3)'}}
            isAnimationActive={true}
            animationDuration={1000}
          />
          
           {/* Reference lines to simulate manholes */}
           <ReferenceLine x={0} stroke={axisColor} strokeDasharray="3 3" label={{ value: 'START', position: 'top', fill: axisColor, fontSize: 10 }} />
           <ReferenceLine x={data.distance} stroke={axisColor} strokeDasharray="3 3" label={{ value: 'END', position: 'top', fill: axisColor, fontSize: 10 }} />

           {/* Hidden dots to capture coordinate positions for the overlay */}
           <ReferenceDot x={0} y={data.startNode.il} r={0} shape={(props) => <CoordinateTracker {...props} type="start" onUpdate={updateCoords} />} />
           <ReferenceDot x={data.distance} y={data.endNode.il} r={0} shape={(props) => <CoordinateTracker {...props} type="end" onUpdate={updateCoords} />} />

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SchematicGraph;