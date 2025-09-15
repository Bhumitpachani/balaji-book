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
    const isInstalled = localStorage.getItem('balajibook_installed') === 'true';
    
    setIsInstalled(isStandalone || isInWebAppiOS || isInstalled);

    // Show install prompt on every visit if not installed
    const shouldShowPrompt = !isStandalone && !isInWebAppiOS && !isInstalled;
    
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

    // If no beforeinstallprompt event, show custom prompt for mobile browsers
    const showCustomPrompt = () => {
      if (shouldShowPrompt) {
        setIsInstallable(true);
      }
    };

    // Show prompt after a delay
    const timer = setTimeout(showCustomPrompt, 3000);

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
      clearTimeout(timer);
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
      // For browsers that don't support the API, show instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        alert('To install this app on your iOS device, tap the Share button and then "Add to Home Screen".');
      } else if (isAndroid) {
        alert('To install this app, tap the menu button in your browser and select "Add to Home Screen" or "Install App".');
      } else {
        alert('To install this app, look for the install button in your browser\'s address bar or menu.');
      }
      
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