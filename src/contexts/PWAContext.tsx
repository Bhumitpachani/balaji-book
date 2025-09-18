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
    const checkIfInstalled = () => {
      // Check if app is running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check if app is installed on iOS Safari
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      // Check localStorage flag
      const isStorageInstalled = localStorage.getItem('balajibook_installed') === 'true';
      
      return isStandalone || isInWebAppiOS || isStorageInstalled;
    };

    // Set initial installation status
    setIsInstalled(checkIfInstalled());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      // Only show install prompt if not already installed
      if (!checkIfInstalled()) {
        setIsInstallable(true);
      }
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.setItem('balajibook_installed', 'true');
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const showInstallPrompt = () => {
    setIsInstallable(true);
  };

  const hideInstallPrompt = () => {
    setIsInstallable(false);
  };

  const installApp = async () => {
    if (!deferredPrompt) {
      // For browsers that don't support the install prompt API
      setIsInstallable(false);
      return;
    }

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