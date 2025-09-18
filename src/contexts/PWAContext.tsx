import React, { createContext, useContext, useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  showInstallPrompt: () => void;
  hideInstallPrompt: () => void;
  installApp: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    const checkInstallationStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isStorageInstalled = localStorage.getItem('balajibook_installed') === 'true';
      
      return isStandalone || isInWebAppiOS || isStorageInstalled;
    };

    setIsInstalled(checkInstallationStatus());
    
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      // Only show install prompt if not already installed
      if (!checkInstallationStatus()) {
        setIsInstallable(true);
      }
    };

    // Listen for successful app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      localStorage.setItem('balajibook_installed', 'true');
    };

    // Listen for display mode changes
    const handleDisplayModeChange = () => {
      setIsInstalled(checkInstallationStatus());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const showInstallPrompt = () => {
    setIsInstallable(true);
  };

  const hideInstallPrompt = () => {
    setIsInstallable(false);
  };

  const installApp = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          localStorage.setItem('balajibook_installed', 'true');
        }
        
        setIsInstallable(false);
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error installing app:', error);
      }
    } else {
      // For browsers that don't support the API, just hide the prompt
      // The user can still install manually through browser menu
      setIsInstallable(false);
    }
  };

  return (
    <PWAContext.Provider 
      value={{ 
        isInstallable, 
        isInstalled, 
        showInstallPrompt, 
        hideInstallPrompt, 
        installApp 
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};