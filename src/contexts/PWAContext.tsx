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
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInstalled = localStorage.getItem('balajibook_installed') === 'true';
    setIsInstalled(isStandalone || isInstalled);

    // Show install prompt on every visit if not installed
    const shouldShowPrompt = !isStandalone && !isInstalled;
    
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      // Show install prompt if not already installed
      if (shouldShowPrompt) {
        setIsInstallable(true);
      }
    };

    // If no beforeinstallprompt event (e.g., already dismissed), still show custom prompt
    setTimeout(() => {
      if (shouldShowPrompt && !deferredPrompt) {
        setIsInstallable(true);
      }
    }, 2000); // Show after 2 seconds

    // Listen for successful app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      localStorage.setItem('balajibook_installed', 'true');
    };

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
    if (!deferredPrompt) return;

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