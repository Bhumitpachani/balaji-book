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

    const checkIfDismissed = () => {
      const dismissed = localStorage.getItem('balajibook_install_dismissed');
      if (!dismissed) return false;
      
      // Check if dismissed more than 7 days ago
      const dismissedTime = parseInt(dismissed);
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return dismissedTime > sevenDaysAgo;
    };

    // Set initial installation status
    const installed = checkIfInstalled();
    setIsInstalled(installed);

    // Show prompt if not installed and not recently dismissed
    if (!installed && !checkIfDismissed()) {
      setIsInstallable(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      // Only show install prompt if not already installed and not dismissed
      if (!checkIfInstalled() && !checkIfDismissed()) {
        setIsInstallable(true);
      }
    };

    // Listen for app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.setItem('balajibook_installed', 'true');
      localStorage.removeItem('balajibook_install_dismissed');
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
    localStorage.removeItem('balajibook_install_dismissed');
  };

  const hideInstallPrompt = () => {
    setIsInstallable(false);
    // Remember dismissal for 7 days
    localStorage.setItem('balajibook_install_dismissed', Date.now().toString());
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
        localStorage.removeItem('balajibook_install_dismissed');
      } else {
        // User dismissed the native prompt
        localStorage.setItem('balajibook_install_dismissed', Date.now().toString());
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