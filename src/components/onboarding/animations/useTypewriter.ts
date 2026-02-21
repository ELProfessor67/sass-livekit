import { useState, useEffect, useCallback } from "react";

interface UseTypewriterOptions {
    text: string;
    speed?: number;
    delay?: number;
    onComplete?: () => void;
}

export function useTypewriter({
    text,
    speed = 60,
    delay = 0,
    onComplete,
}: UseTypewriterOptions) {
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    const startTyping = useCallback(() => {
        setIsTyping(true);
        setDisplayedText("");
        setIsComplete(false);
    }, []);

    useEffect(() => {
        if (!text) return;

        const delayTimer = setTimeout(() => {
            setIsTyping(true);
        }, delay);

        return () => clearTimeout(delayTimer);
    }, [text, delay]);

    useEffect(() => {
        if (!isTyping || !text) return;

        if (displayedText.length < text.length) {
            const timer = setTimeout(() => {
                setDisplayedText(text.slice(0, displayedText.length + 1));
            }, speed);

            return () => clearTimeout(timer);
        } else {
            setIsTyping(false);
            setIsComplete(true);
            onComplete?.();
        }
    }, [displayedText, text, speed, isTyping, onComplete]);

    return {
        displayedText,
        isTyping,
        isComplete,
        startTyping,
    };
}

// Helper function to get time-aware greeting
export function getTimeGreeting(): string {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
        return "Good morning";
    } else if (hour >= 12 && hour < 17) {
        return "Good afternoon";
    } else if (hour >= 17 && hour < 21) {
        return "Good evening";
    } else {
        return "Hello, night owl";
    }
}
