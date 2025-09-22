import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SiteProtectionContextType {
  isProtectionEnabled: boolean;
  showLaunchingPage: boolean;
  hasValidSession: boolean;
  isAdminBypassed: boolean;
  grantAccess: () => void;
  checkSession: () => boolean;
}

const SiteProtectionContext = createContext<SiteProtectionContextType | undefined>(undefined);

interface SiteProtectionProviderProps {
  children: ReactNode;
}

const PROTECTION_ENABLED = import.meta.env.VITE_ENABLE_SITE_PROTECTION === 'true';
const SHOW_LAUNCHING_PAGE = import.meta.env.VITE_SHOW_LAUNCHING_SOON === 'true';
const ADMIN_IP_BYPASS = import.meta.env.VITE_ADMIN_IP_BYPASS;

export const SiteProtectionProvider = ({ children }: SiteProtectionProviderProps) => {
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isAdminBypassed, setIsAdminBypassed] = useState(false);

  // Check if user has a valid session
  const checkSession = (): boolean => {
    const sessionExpiry = localStorage.getItem('sitePasswordSession');
    if (!sessionExpiry) return false;
    
    const expiryTime = parseInt(sessionExpiry, 10);
    const isValid = Date.now() < expiryTime;
    
    if (!isValid) {
      localStorage.removeItem('sitePasswordSession');
    }
    
    return isValid;
  };

  // Check for admin IP bypass
  const checkAdminBypass = async (): Promise<boolean> => {
    if (!ADMIN_IP_BYPASS) return false;
    
    try {
      // Simple client-side IP check (not secure, but sufficient for development)
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip === ADMIN_IP_BYPASS;
    } catch (error) {
      console.warn('Could not check IP for admin bypass:', error);
      return false;
    }
  };

  // Grant access after successful password entry
  const grantAccess = () => {
    setHasValidSession(true);
  };

  // Initialize protection state
  useEffect(() => {
    const initializeProtection = async () => {
      // Check for valid session
      const sessionValid = checkSession();
      setHasValidSession(sessionValid);

      // Check for admin bypass
      const adminBypass = await checkAdminBypass();
      setIsAdminBypassed(adminBypass);
    };

    if (PROTECTION_ENABLED) {
      initializeProtection();
    } else {
      setHasValidSession(true); // No protection needed
    }
  }, []);

  // Clean up expired sessions periodically
  useEffect(() => {
    if (!PROTECTION_ENABLED) return;

    const interval = setInterval(() => {
      const sessionValid = checkSession();
      if (!sessionValid && hasValidSession) {
        setHasValidSession(false);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [hasValidSession]);

  const contextValue: SiteProtectionContextType = {
    isProtectionEnabled: PROTECTION_ENABLED,
    showLaunchingPage: SHOW_LAUNCHING_PAGE,
    hasValidSession: hasValidSession || isAdminBypassed,
    isAdminBypassed,
    grantAccess,
    checkSession
  };

  return (
    <SiteProtectionContext.Provider value={contextValue}>
      {children}
    </SiteProtectionContext.Provider>
  );
};

export const useSiteProtection = (): SiteProtectionContextType => {
  const context = useContext(SiteProtectionContext);
  if (context === undefined) {
    throw new Error('useSiteProtection must be used within a SiteProtectionProvider');
  }
  return context;
};