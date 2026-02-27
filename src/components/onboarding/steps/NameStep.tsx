import React from "react";
import { motion } from "framer-motion";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NameStep() {
    const { data, updateData, nextStep } = useOnboarding();
    const [name, setName] = React.useState(data.name || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim().length >= 2) {
            updateData({ name });
            nextStep();
        }
    };

    return (
        <div className="text-center max-w-xl mx-auto space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
            >
                <p className="text-lg text-gray-600 font-medium">
                    I'm here to help you get started.
                </p>
                <h1 className="text-5xl font-semibold text-gray-900 tracking-tight">
                    What's your name?
                </h1>
            </motion.div>

            <form onSubmit={handleSubmit} className="space-y-8">

                <Input
                    autoFocus
                    type="text"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 text-center text-xl bg-white hover:bg-white focus:bg-gray-50/50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                    style={{
                        boxShadow: name
                            ? "0 0 20px hsl(var(--primary) / 0.15)"
                            : "none",
                    }} />


                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                >
                    <Button
                        type="submit"
                        disabled={name.trim().length < 2}
                        className="w-full h-14 text-lg font-medium rounded-2xl bg-[#668cff] hover:bg-[#668cff]/90 transition-all duration-300 shadow-lg shadow-[#668cff]/20"
                    >
                        That's me
                    </Button>
                </motion.div>
            </form>
        </div>
    );
}
