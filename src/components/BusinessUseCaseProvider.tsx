import { createContext, useContext, useEffect, useState } from "react";
import { BusinessUseCase, BusinessUseCaseConfig, BUSINESS_USE_CASE_TEMPLATES } from "@/types/businessUseCase";

type BusinessUseCaseProviderProps = {
  children: React.ReactNode;
  defaultUseCase?: BusinessUseCase;
  storageKey?: string;
};

type BusinessUseCaseProviderState = {
  useCase: BusinessUseCase;
  config: BusinessUseCaseConfig;
  setUseCase: (useCase: BusinessUseCase) => void;
};

const initialState: BusinessUseCaseProviderState = {
  useCase: "appointment-setting",
  config: BUSINESS_USE_CASE_TEMPLATES["appointment-setting"],
  setUseCase: () => null,
};

const BusinessUseCaseProviderContext = createContext<BusinessUseCaseProviderState>(initialState);

export function BusinessUseCaseProvider({
  children,
  defaultUseCase = "appointment-setting",
  storageKey = "business-use-case",
  ...props
}: BusinessUseCaseProviderProps) {
  const [useCase, setUseCase] = useState<BusinessUseCase>(
    () => (localStorage.getItem(storageKey) as BusinessUseCase) || defaultUseCase
  );

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply use case specific styling
    root.classList.remove("use-case-appointment-setting", "use-case-customer-service", "use-case-recruitment", "use-case-ecommerce", "use-case-general");
    root.classList.add(`use-case-${useCase}`);
    
    // Set CSS custom properties for the primary color
    const config = BUSINESS_USE_CASE_TEMPLATES[useCase];
    root.style.setProperty('--use-case-primary', config.primaryColor);
  }, [useCase]);

  const value = {
    useCase,
    config: BUSINESS_USE_CASE_TEMPLATES[useCase],
    setUseCase: (useCase: BusinessUseCase) => {
      localStorage.setItem(storageKey, useCase);
      setUseCase(useCase);
    },
  };

  return (
    <BusinessUseCaseProviderContext.Provider {...props} value={value}>
      {children}
    </BusinessUseCaseProviderContext.Provider>
  );
}

export const useBusinessUseCase = () => {
  const context = useContext(BusinessUseCaseProviderContext);

  if (context === undefined)
    throw new Error("useBusinessUseCase must be used within a BusinessUseCaseProvider");

  return context;
};