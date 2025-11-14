import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
      <DialogContent className="max-w-[100vw] max-h-[100vh] h-[100vh] w-full p-0 gap-0 sm:max-w-[95vw] sm:max-h-[95vh] sm:h-auto">
        {/* Image Counter - Mobile Optimized */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium">
          {imageIndex + 1} / {totalImages}
        </div>

        {/* Image Container */}
        <div className="relative flex items-center justify-center w-full h-full bg-black/5">
          <img 
            src={imageUrl} 
            alt={`Order image ${imageIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Navigation Buttons - Only show if multiple images */}
        {totalImages > 1 && (
          <>
            {/* Previous Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={onPrev}
              disabled={imageIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background disabled:opacity-50 sm:left-4"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            {/* Next Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={onNext}
              disabled={imageIndex === totalImages - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 h-10 w-10 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background disabled:opacity-50 sm:right-4"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
