import { useState, useCallback, createContext, useContext } from 'react';

export type AccountRole = 'platform_owner' | 'agency' | 'client';

const ROLE_STORAGE_KEY = 'composer_dev_role';

export function useAccountRole() {
    const [role, setRoleState] = useState<AccountRole>(() => {
        // Check localStorage for dev role override
        const stored = localStorage.getItem(ROLE_STORAGE_KEY);
        if (stored && ['platform_owner', 'agency', 'client'].includes(stored)) {
            return stored as AccountRole;
        }
        // Default to agency for demo purposes
        return 'agency';
    });

    const setRole = useCallback((newRole: AccountRole) => {
        localStorage.setItem(ROLE_STORAGE_KEY, newRole);
        setRoleState(newRole);
    }, []);

    // Helper functions
    const isPlatformOwner = role === 'platform_owner';
    const isAgency = role === 'agency';
    const isClient = role === 'client';

    // Role display names
    const roleDisplayName = {
        platform_owner: 'Platform Owner',
        agency: 'Agency',
        client: 'Client',
    }[role];

    return {
        role,
        setRole,
        isPlatformOwner,
        isAgency,
        isClient,
        roleDisplayName,
    };
}

// Context for sharing role across components
export interface AccountRoleContextType {
    role: AccountRole;
    setRole: (role: AccountRole) => void;
    isPlatformOwner: boolean;
    isAgency: boolean;
    isClient: boolean;
    roleDisplayName: string;
}

export const AccountRoleContext = createContext<AccountRoleContextType | null>(null);

export function useAccountRoleContext() {
    const context = useContext(AccountRoleContext);
    if (!context) {
        throw new Error('useAccountRoleContext must be used within AccountRoleProvider');
    }
    return context;
}
