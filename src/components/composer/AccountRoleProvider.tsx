import { ReactNode } from 'react';
import { useAccountRole, AccountRoleContext } from '@/hooks/useAccountRole';

interface AccountRoleProviderProps {
    children: ReactNode;
}

export function AccountRoleProvider({ children }: AccountRoleProviderProps) {
    const roleState = useAccountRole();

    return (
        <AccountRoleContext.Provider value={roleState}>
            {children}
        </AccountRoleContext.Provider>
    );
}
