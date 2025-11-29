import React, { useState, useEffect, useContext, createContext } from "react";

export interface OnboardingData {
  companyName: string;
  industry: string;
  teamSize: string;
  role: string;
  useCase: string;
  theme: string;
  notifications: boolean;
  goals: string[];
  plan: string;
  name?: string;
  email?: string;
  paymentMethodId?: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  subscriptionStatus?: string;
}

export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  isCompleted: boolean;
  data: OnboardingData;
}

const STORAGE_KEY = "onboarding-state";
const COMPLETED_KEY = "onboarding-completed";

interface OnboardingContextValue extends OnboardingState {
  updateData: (updates: Partial<OnboardingData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  complete: () => void;
  reset: () => void;
  getProgress: () => number;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const isCompleted = localStorage.getItem(COMPLETED_KEY) === "true";

    const defaultState: OnboardingState = {
      currentStep: 0,
      totalSteps: 7,
      isCompleted,
      data: {
        companyName: "",
        industry: "",
        teamSize: "",
        role: "",
        useCase: "appointment-setting",
        theme: "glass",
        notifications: true,
        goals: [],
        plan: "starter",
      },
    };

    let initial: OnboardingState = saved ? JSON.parse(saved) : defaultState;

    // Normalize legacy saved state (pre-pricing step) to ensure navigation works
    if (!initial.data?.plan) {
      initial = {
        ...initial,
        data: { ...initial.data, plan: "starter" },
      };
    }
    if (!initial.totalSteps || initial.totalSteps < 7) {
      initial = { ...initial, totalSteps: 7 };
    }
    if (initial.currentStep > initial.totalSteps - 1) {
      initial = { ...initial, currentStep: initial.totalSteps - 1 };
    }

    return initial;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateData = (updates: Partial<OnboardingData>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...updates }
    }));
  };

  const nextStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, prev.totalSteps - 1)
    }));
  };

  const prevStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0)
    }));
  };

  const goToStep = (step: number) => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, prev.totalSteps - 1))
    }));
  };

  const complete = () => {
    localStorage.setItem(COMPLETED_KEY, "true");
    setState(prev => ({ ...prev, isCompleted: true }));
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COMPLETED_KEY);
    setState({
      currentStep: 0,
      totalSteps: 7,
      isCompleted: false,
      data: {
        companyName: "",
        industry: "",
        teamSize: "",
        role: "",
        useCase: "appointment-setting",
        theme: "glass",
        notifications: true,
        goals: [],
        plan: "starter"
      }
    });
  };

  const getProgress = () => {
    return ((state.currentStep + 1) / state.totalSteps) * 100;
  };

  const value: OnboardingContextValue = {
    ...state,
    updateData,
    nextStep,
    prevStep,
    goToStep,
    complete,
    reset,
    getProgress,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return ctx;
}


