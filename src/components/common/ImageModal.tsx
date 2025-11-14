import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageIndex: number;
  totalImages: number;
  onNext?: () => void;
  onPrev?: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageIndex,
  totalImages,
  onNext,
  onPrev
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center justify-between">
            <span>Image {imageIndex + 1} of {totalImages}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="relative flex items-center justify-center p-4">
          <img 
            src={imageUrl} 
            alt={`Order image ${imageIndex + 1}`}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        </div>
        {totalImages > 1 && (
          <div className="flex justify-center gap-4 p-4">
            <Button 
              variant="outline" 
              onClick={onPrev}
              disabled={imageIndex === 0}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              onClick={onNext}
              disabled={imageIndex === totalImages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
