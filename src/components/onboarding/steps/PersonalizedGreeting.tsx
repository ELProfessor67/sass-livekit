import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useTypewriter } from "../animations/useTypewriter";

// Floating particle component
function Particle({ delay }: { delay: number }) {
    return (
        <motion.div
            className="absolute w-1 h-1 rounded-full bg-[#668cff]"
            initial={{
                opacity: 0,
                scale: 0,
                x: Math.random() * 100 - 50,
                y: Math.random() * 40 - 20,
            }}
            animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                y: [0, -30, -60],
            }}
            transition={{
                duration: 2,
                delay: delay,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "easeOut",
            }}
            style={{
                boxShadow: "0 0 6px rgba(102, 140, 255, 0.8)",
            }}
        />
    );
}

export function PersonalizedGreeting() {
    const { data, nextStep } = useOnboarding();
    const [showWonderful, setShowWonderful] = useState(false);
    const [showHello, setShowHello] = useState(false);
    const [showFinalLine, setShowFinalLine] = useState(false);
    const [showButton, setShowButton] = useState(false);

    // Extract first name from full name
    const firstName = data.name?.split(' ')[0] || "there";

    // Typewriter for "Hello, "
    const helloTypewriter = useTypewriter({
        text: "Hello, ",
        speed: 60,
        delay: 0,
    });

    // Typewriter for name (slightly slower for emphasis)
    const nameTypewriter = useTypewriter({
        text: firstName,
        speed: 80,
        delay: 0,
        onComplete: () => {
            setTimeout(() => setShowFinalLine(true), 500);
        },
    });

    useEffect(() => {
        // Timeline
        const wonderfulTimer = setTimeout(() => setShowWonderful(true), 300);
        const helloTimer = setTimeout(() => setShowHello(true), 1100);

        return () => {
            clearTimeout(wonderfulTimer);
            clearTimeout(helloTimer);
        };
    }, []);

    useEffect(() => {
        if (showFinalLine) {
            const buttonTimer = setTimeout(() => setShowButton(true), 800);
            return () => clearTimeout(buttonTimer);
        }
    }, [showFinalLine]);

    // Generate particles around the name
    const particles = Array.from({ length: 8 }, (_, i) => (
        <Particle key={i} delay={i * 0.2} />
    ));

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <div className="flex flex-col items-center space-y-6">
                {/* "Wonderful." */}
                <motion.p
                    className="text-2xl text-gray-500 font-light"
                    initial={{ opacity: 0, y: 20 }}
                    animate={showWonderful ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                >
                    Wonderful.
                </motion.p>

                {/* "Hello, [Name]." with typewriter */}
                <div className="relative">
                    <motion.h1
                        className="text-5xl md:text-7xl font-light text-gray-900"
                        initial={{ opacity: 0 }}
                        animate={showHello ? { opacity: 1 } : {}}
                        transition={{ duration: 0.3 }}
                    >
                        {showHello && (
                            <>
                                <span>{helloTypewriter.displayedText}</span>
                                {helloTypewriter.isComplete && (
                                    <span className="relative inline-block">
                                        <span className="text-[#668cff] font-normal">
                                            {nameTypewriter.displayedText}
                                        </span>
                                        {/* Particles around name */}
                                        {nameTypewriter.isComplete && (
                                            <span className="absolute inset-0 flex items-center justify-center">
                                                {particles}
                                            </span>
                                        )}
                                    </span>
                                )}
                                {nameTypewriter.isComplete && <span>.</span>}
                            </>
                        )}
                    </motion.h1>

                    {/* Subtle glow behind name */}
                    {nameTypewriter.isComplete && (
                        <motion.div
                            className="absolute inset-0 blur-3xl bg-[#668cff]/10 -z-10"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1.2 }}
                            transition={{ duration: 0.8 }}
                        />
                    )}
                </div>

                {/* "Let's create something beautiful together." */}
                <motion.p
                    className="text-xl md:text-2xl text-gray-500 font-light max-w-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={showFinalLine ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    Let's create something beautiful together.
                </motion.p>

                {/* Continue button */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={showButton ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                    className="pt-6"
                >
                    <Button
                        onClick={nextStep}
                        size="lg"
                        className="px-10 py-6 text-lg rounded-xl bg-[#668cff] hover:bg-[#5a7ee6] shadow-lg shadow-[#668cff]/25 hover:shadow-xl hover:shadow-[#668cff]/35 transition-all duration-300"
                    >
                        Let's begin
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
