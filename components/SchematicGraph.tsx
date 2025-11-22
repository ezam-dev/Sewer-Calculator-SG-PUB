import React from 'react';
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
} from 'recharts';
import { CalculationResult } from '../types';

interface SchematicGraphProps {
  data: CalculationResult;
  theme: 'dark' | 'light';
}

const SchematicGraph: React.FC<SchematicGraphProps> = ({ data, theme }) => {
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
    <div className="w-full h-full pt-4">
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
            <linearGradient id="colorIl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
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

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SchematicGraph;