import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface WebsiteSettings {
  slug_name?: string | null;
  custom_domain?: string | null;
  website_name?: string | null;
  logo?: string | null;
  contact_email?: string | null;
  meta_description?: string | null;
  live_demo_agent_id?: string | null;
  live_demo_phone_number?: string | null;
  policy_text?: string | null;
}

interface WebsiteSettingsContextType {
  websiteSettings: WebsiteSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const WebsiteSettingsContext = createContext<WebsiteSettingsContextType | undefined>(undefined);

export const useWebsiteSettings = () => {
  const context = useContext(WebsiteSettingsContext);
  if (context === undefined) {
    throw new Error('useWebsiteSettings must be used within a WebsiteSettingsProvider');
  }
  return context;
};

interface WebsiteSettingsProviderProps {
  children: ReactNode;
}

export const WebsiteSettingsProvider: React.FC<WebsiteSettingsProviderProps> = ({ children }) => {
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWebsiteSettings = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/api/v1/whitelabel/website-settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch website settings');
      }

      const data = await response.json();
      if (data.success) {
        setWebsiteSettings(data.settings || {});
      }
    } catch (error) {
      console.error('Error fetching website settings:', error);
      // Set default settings on error
      setWebsiteSettings({
        website_name: null,
        logo: null,
        contact_email: null,
        meta_description: null,
        live_demo_agent_id: null,
        live_demo_phone_number: null,
        policy_text: null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsiteSettings();
  }, []);

  const refreshSettings = async () => {
    await fetchWebsiteSettings();
  };

  const value: WebsiteSettingsContextType = {
    websiteSettings,
    loading,
    refreshSettings,
  };

  return (
    <WebsiteSettingsContext.Provider value={value}>
      {children}
    </WebsiteSettingsContext.Provider>
  );
};



