
import React from 'react';

interface LegendPayloadItem {
  value: string;
  color: string;
  payload: {
    name: string;
    value: number;
    color: string;
    icon: JSX.Element;
  };
}

export const CustomLegend = (props: { payload?: LegendPayloadItem[] }) => {
  const { payload = [] } = props;
  
  return (
    <ul className="flex flex-col gap-4 py-2">
      {payload.map((entry, index) => (
        <li key={`item-${index}`} className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center justify-center w-8 h-8 rounded-full text-white transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundColor: entry.color }}
            >
              {entry.payload.icon}
            </div>
            <span className="text-sm font-medium tracking-wide text-foreground/90">
              {entry.value}
            </span>
          </div>
          <span className="text-sm font-medium tabular-nums">
            {entry.payload.value}%
          </span>
        </li>
      ))}
    </ul>
  );
};
