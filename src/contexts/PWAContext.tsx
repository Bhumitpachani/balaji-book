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
  console.log('usePWA called, context:', context);
  if (!context) {
    console.error('PWA context is undefined - component not wrapped in PWAProvider');
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('PWAProvider rendering');
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const isStorageInstalled = localStorage.getItem('balajibook_installed') === 'true';
    
    const currentlyInstalled = isStandalone || isInWebAppiOS || isStorageInstalled;
    setIsInstalled(currentlyInstalled);
    
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      // Check current installation status at the time of the event
      const isCurrentlyStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isCurrentlyInWebAppiOS = (window.navigator as any).standalone === true;
      const isCurrentlyStorageInstalled = localStorage.getItem('balajibook_installed') === 'true';
      
      const shouldShowPrompt = !isCurrentlyStandalone && !isCurrentlyInWebAppiOS && !isCurrentlyStorageInstalled;
      
      // Only show install prompt if we have the native event and not already installed
      if (shouldShowPrompt) {
        setIsInstallable(true);
      }
    };


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