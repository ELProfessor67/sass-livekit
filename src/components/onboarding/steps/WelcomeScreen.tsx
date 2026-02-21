import React, { useState, useEffect } from "react";
import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { getTimeGreeting } from "../animations/useTypewriter";

// Breathing orb animation
const orbVariants: Variants = {
    initial: {
        scale: 0,
        opacity: 0
    },
    breathe: {
        scale: [1, 1.08, 1],
        opacity: 1,
        transition: {
            scale: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
            },
            opacity: {
                duration: 1.2,
                ease: "easeOut",
            },
        },
    },
};

const glowVariants: Variants = {
    initial: {
        opacity: 0,
        scale: 0.8,
    },
    animate: {
        opacity: [0.3, 0.6, 0.3],
        scale: [1, 1.2, 1],
        transition: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
        },
    },
};

const textVariants: Variants = {
    hidden: {
        opacity: 0,
        y: 20
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: "easeOut"
        }
    },
};

const buttonVariants: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.9
    },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.5,
            ease: "easeOut"
        }
    },
    pulse: {
        boxShadow: [
            "0 0 20px rgba(102, 140, 255, 0.3)",
            "0 0 40px rgba(102, 140, 255, 0.5)",
            "0 0 20px rgba(102, 140, 255, 0.3)",
        ],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
        },
    },
};

export function WelcomeScreen() {
    const { nextStep } = useOnboarding();
    const [showGreeting, setShowGreeting] = useState(false);
    const [showSubtext, setShowSubtext] = useState(false);
    const [showButton, setShowButton] = useState(false);

    const greeting = getTimeGreeting();

    useEffect(() => {
        // Animation timeline
        const greetingTimer = setTimeout(() => setShowGreeting(true), 2000);
        const subtextTimer = setTimeout(() => setShowSubtext(true), 3500);
        const buttonTimer = setTimeout(() => setShowButton(true), 4500);

        return () => {
            clearTimeout(greetingTimer);
            clearTimeout(subtextTimer);
            clearTimeout(buttonTimer);
        };
    }, []);

    return (
        <div className="w-full max-w-lg mx-auto text-center min-h-[60vh] flex flex-col items-center justify-center relative">
            {/* Ambient glow background */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2 }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#668cff]/5 blur-3xl" />
            </motion.div>

            {/* Breathing orb */}
            <div className="relative mb-12">
                {/* Outer glow */}
                <motion.div
                    className="absolute inset-0 w-24 h-24 rounded-full bg-[#668cff]/20 blur-2xl"
                    variants={glowVariants}
                    initial="initial"
                    animate="animate"
                />

                {/* Main orb */}
                <motion.div
                    className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#668cff]/30 to-[#668cff]/10 backdrop-blur-sm border border-[#668cff]/30 flex items-center justify-center"
                    variants={orbVariants}
                    initial="initial"
                    animate="breathe"
                    style={{
                        boxShadow: "0 0 60px rgba(102, 140, 255, 0.3), inset 0 0 30px rgba(102, 140, 255, 0.1)",
                    }}
                >
                    {/* Inner core */}
                    <motion.div
                        className="w-8 h-8 rounded-full bg-[#668cff]/40"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                        }}
                        style={{
                            boxShadow: "0 0 20px rgba(102, 140, 255, 0.6)",
                        }}
                    />
                </motion.div>
            </div>

            {/* Greeting text */}
            <motion.h1
                className="text-4xl md:text-5xl font-light text-theme-primary mb-4"
                variants={textVariants}
                initial="hidden"
                animate={showGreeting ? "visible" : "hidden"}
            >
                {greeting}.
            </motion.h1>

            {/* Subtext */}
            <motion.p
                className="text-xl text-gray-500 mb-12 font-light"
                variants={textVariants}
                initial="hidden"
                animate={showSubtext ? "visible" : "hidden"}
            >
                Nice to finally meet you.
            </motion.p>

            {/* Enter button */}
            <motion.div
                variants={buttonVariants}
                initial="hidden"
                animate={showButton ? ["visible", "pulse"] : "hidden"}
            >
                <Button
                    onClick={nextStep}
                    size="lg"
                    className="px-12 py-6 text-lg rounded-xl bg-[#668cff] hover:bg-[#5a7ee6] transition-all duration-300"
                >
                    Begin your journey
                </Button>
            </motion.div>
        </div>
    );
}
