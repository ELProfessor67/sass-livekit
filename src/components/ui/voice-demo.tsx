import React, { useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import styles from './voice-demo.module.css';

interface VoiceDemoProps {
  className?: string;
}

export const VoiceDemo: React.FC<VoiceDemoProps> = ({ className }) => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleVoiceDemoClick = async () => {
    try {
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsActive(true);
      setIsListening(true);

      // Simulate conversation flow for now
      setTimeout(() => {
        setIsListening(false);
        setIsSpeaking(true);
      }, 2000);

      setTimeout(() => {
        setIsSpeaking(false);
        setIsActive(false);
      }, 4000);
    } catch (error) {
      console.error('Microphone access denied:', error);
      // Could show a toast or modal here
    }
  };

  return (
    <div className={cn("relative flex flex-col items-center py-12 px-8", className)}>
      <div className="relative flex flex-col items-center space-y-6">
        <div className="relative">

          <button
            onClick={handleVoiceDemoClick}
            className={cn(
              "relative group w-36 h-36 rounded-full transition-all duration-500 ease-out",
              "transform-gpu will-change-transform",
              "hover:scale-110 active:scale-105",
              "focus:outline-none focus:ring-4 focus:ring-indigo-400/20",
              isActive ? "scale-110" : "scale-100",
              !isActive && styles.breathingFloat
            )}
            style={{
              filter: isActive
                ? 'drop-shadow(0 30px 60px hsl(var(--primary) / 0.3))'
                : 'drop-shadow(0 15px 35px hsl(var(--primary) / 0.15))'
            }}
            aria-label="Try AI Voice Demo"
          >
            {/* Base shadow layer */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-400/5 to-indigo-400/2 blur-xl" />

            {/* Enhanced Glass base layer */}
            <div className={cn(
              "absolute inset-0 rounded-full transition-all duration-500",
              "bg-gradient-to-br from-white/25 via-white/15 to-white/8",
              "dark:from-white/15 dark:via-white/8 dark:to-white/3",
              "border border-white/40 dark:border-white/25",
              "backdrop-blur-3xl shadow-2xl",
              "group-hover:border-white/50 dark:group-hover:border-white/35",
              "group-hover:bg-gradient-to-br group-hover:from-white/30 group-hover:via-white/20 group-hover:to-white/10",
              "dark:group-hover:from-white/20 dark:group-hover:via-white/12 dark:group-hover:to-white/5"
            )} />

            {/* Glass surface texture */}
            <div className={cn(
              "absolute inset-0 rounded-full transition-all duration-500",
              "bg-gradient-to-br from-white/20 via-transparent to-white/10",
              "dark:from-white/12 dark:via-transparent dark:to-white/6",
              "backdrop-blur-2xl"
            )} />

            {/* Inner glass highlight */}
            <div className={cn(
              "absolute inset-1 rounded-full transition-all duration-500",
              "bg-gradient-to-br from-white/40 via-white/20 to-transparent",
              "dark:from-white/25 dark:via-white/12 dark:to-transparent",
              "group-hover:from-white/50 dark:group-hover:from-white/30"
            )} />

            {/* Glass edge highlight */}
            <div className={cn(
              "absolute inset-0 rounded-full transition-all duration-500",
              "bg-gradient-to-t from-transparent via-transparent to-white/30",
              "dark:to-white/20",
              "group-hover:to-white/40 dark:group-hover:to-white/25"
            )} />

            {/* Apple-style concentric rings when active */}
            {isActive && (
              <>
                <div className={cn("absolute -inset-6 rounded-full border border-indigo-400/30", styles.concentricRing)} style={{ animationDelay: '0s' }} />
                <div className={cn("absolute -inset-4 rounded-full border border-indigo-400/40", styles.concentricRing)} style={{ animationDelay: '0.3s' }} />
                <div className={cn("absolute -inset-2 rounded-full border border-indigo-400/50", styles.concentricRing)} style={{ animationDelay: '0.6s' }} />
              </>
            )}

            {/* Main icon container */}
            <div className="relative z-20 flex items-center justify-center w-full h-full">
              <div className={cn(
                "transition-all duration-300 ease-out",
                "group-hover:scale-110",
                isActive && "animate-pulse"
              )}>
                {isListening ? (
                  <Mic className={cn(
                    "w-10 h-10 transition-all duration-300",
                    "text-indigo-500 drop-shadow-lg",
                    "animate-pulse"
                  )} />
                ) : isSpeaking ? (
                  <Volume2 className={cn(
                    "w-10 h-10 transition-all duration-300",
                    "text-indigo-500 drop-shadow-lg",
                    "animate-pulse"
                  )} />
                ) : (
                  <Mic className={cn(
                    "w-11 h-11 transition-all duration-300",
                    "text-indigo-500 drop-shadow-lg",
                    "group-hover:scale-110"
                  )} />
                )}
              </div>
            </div>

            {/* Dynamic glow overlay */}
            <div className={cn(
              "absolute inset-0 rounded-full transition-all duration-500",
              "bg-gradient-to-br from-indigo-400/20 via-indigo-400/10 to-transparent",
              "opacity-0 group-hover:opacity-100",
              isActive && "opacity-60 animate-pulse"
            )} />

            {/* Reflection highlight */}
            <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-gradient-to-br from-white/50 to-transparent blur-sm opacity-60" />
          </button>
        </div>

        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-black transition-all duration-300">
            {isActive ? (
              isListening ? "Listening..." : "AI Speaking..."
            ) : (
              "Try our AI Agent"
            )}
          </p>
          <p className="text-sm text-gray-600 max-w-xs transition-all duration-300">
            {isActive ? "Experience real-time conversation" : "Click to start voice demo"}
          </p>
        </div>
      </div>

    </div>
  );
};