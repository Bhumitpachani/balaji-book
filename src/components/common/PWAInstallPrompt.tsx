import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import { usePWA } from "@/contexts/PWAContext";

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, installApp, hideInstallPrompt } = usePWA();

  if (!isInstallable) return null;

  return (
    <Card className="install-prompt p-4 bg-card border shadow-lg">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-app-gradient rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">B</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-card-foreground">Install BalajiBook</h3>
          <p className="text-sm text-muted-foreground">Get the full app experience</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={hideInstallPrompt}
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            onClick={installApp}
            size="sm"
            className="bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            <Download className="w-4 h-4 mr-2" />
            Install
          </Button>
        </div>
      </div>
    </Card>
  );
};