import React from "react";
import { motion } from "framer-motion";
import {
    Building2,
    Rocket,
    Settings,
    CreditCard,
    Lock,
    CheckCircle,
    Star,
    Sparkles
} from "lucide-react";

interface ProgressRingProps {
    currentStep: number;
    totalSteps: number;
}

const stepIcons = [
    null, // Welcome (step 0) - no progress ring shown
    Sparkles, // Platform Introduction
    Building2, // Business Profile
    Rocket, // Use Case
    Settings, // Preferences
    CreditCard, // Pricing
    Lock, // Payment
    CheckCircle, // Complete
];

export function ProgressRing({ currentStep, totalSteps }: ProgressRingProps) {
    // Calculate progress (excluding welcome step)
    const adjustedCurrent = currentStep;
    const adjustedTotal = totalSteps - 1;
    const progress = (adjustedCurrent / adjustedTotal) * 100;

    // SVG circle math
    const size = 100;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    // Get current step icon
    const IconComponent = stepIcons[currentStep] || Star;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center gap-3"
        >
            {/* Progress Ring Container */}
            <div className="relative w-[100px] h-[100px]">
                {/* Glow effect */}
                <div
                    className="absolute inset-0 rounded-full blur-xl opacity-40"
                    style={{
                        background: `conic-gradient(from 0deg, #668cff ${progress}%, transparent ${progress}%)`,
                    }}
                />

                {/* SVG Ring */}
                <svg
                    viewBox={`0 0 ${size} ${size}`}
                    className="w-full h-full -rotate-90"
                >
                    {/* Background track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#668cff"
                        strokeOpacity="0.2"
                        strokeWidth={strokeWidth}
                    />

                    {/* Progress arc */}
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#668cff"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{
                            duration: 0.5,
                            ease: "easeInOut",
                            type: "spring",
                            stiffness: 100,
                            damping: 15
                        }}
                        style={{
                            filter: "drop-shadow(0 0 6px rgba(102, 140, 255, 0.5))",
                        }}
                    />
                </svg>

                {/* Center Icon */}
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                >
                    <div className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
                        <IconComponent
                            className="w-6 h-6 text-[#668cff]"
                        />
                    </div>
                </motion.div>
            </div>

            {/* Step Counter */}
            <motion.p
                key={`step-${currentStep}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-theme-secondary font-medium"
            >
                Step {currentStep} of {adjustedTotal}
            </motion.p>
        </motion.div>
    );
}
