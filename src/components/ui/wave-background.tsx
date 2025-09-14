import React from 'react';
import { cn } from '@/lib/utils';
import styles from './voice-demo.module.css';

interface WaveBackgroundProps {
  className?: string;
  isActive?: boolean;
}

export const WaveBackground: React.FC<WaveBackgroundProps> = ({ 
  className, 
  isActive = false 
}) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Wave pattern 1 */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path
          d="M0,100 Q100,50 200,100 T400,100 L400,400 L0,400 Z"
          fill="url(#wave1)"
          className={cn(
            "transition-all duration-1000 ease-in-out",
            isActive ? "animate-pulse" : "",
            isActive ? styles.waveFlowActive : styles.waveFlow
          )}
        />
      </svg>

      {/* Wave pattern 2 */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path
          d="M0,150 Q150,80 300,150 T600,150 L600,400 L0,400 Z"
          fill="url(#wave2)"
          className={isActive ? styles.waveFlowActiveReverse : styles.waveFlowReverse}
        />
      </svg>

      {/* Wave pattern 3 */}
      <svg
        className="absolute inset-0 w-full h-full opacity-15"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="wave3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.03" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path
          d="M0,200 Q200,120 400,200 T800,200 L800,400 L0,400 Z"
          fill="url(#wave3)"
          className={isActive ? styles.waveFlowActive : styles.waveFlow}
        />
      </svg>

      {/* Floating particles */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "absolute w-1 h-1 rounded-full bg-primary/20",
              "transition-all duration-1000",
              styles.floatParticle
            )}
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
              animationDuration: `${3 + i * 0.5}s`,
              animationDelay: `${i * 0.2}s`,
              opacity: isActive ? 0.6 : 0.3
            }}
          />
        ))}
      </div>

    </div>
  );
};