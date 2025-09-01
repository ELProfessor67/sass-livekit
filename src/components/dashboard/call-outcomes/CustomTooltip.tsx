
import React from 'react';

interface TooltipData {
  name: string;
  value: number;
  color: string;
  icon: JSX.Element;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TooltipData;
  }>;
}

export const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background/95 backdrop-blur-sm text-foreground shadow-lg rounded-lg p-4 border border-border min-w-[200px]">
        <div className="flex items-center gap-3 mb-4">
          <div 
            className="flex items-center justify-center w-8 h-8 rounded-full text-white"
            style={{ backgroundColor: data.color }}
          >
            {data.icon}
          </div>
          <p className="text-sm font-medium tracking-wide">{data.name}</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Percentage</span>
            <span className="text-sm font-medium tabular-nums">{data.value}%</span>
          </div>
          <div 
            className="h-1.5 w-full rounded-full"
            style={{ backgroundColor: `${data.color}20` }}
          >
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${data.value}%`,
                backgroundColor: data.color
              }}
            />
          </div>
        </div>
      </div>
    );
  }
  return null;
};
