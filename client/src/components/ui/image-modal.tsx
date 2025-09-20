import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './dialog';
import { Button } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageModalProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function ImageModal({ 
  images, 
  initialIndex = 0, 
  isOpen, 
  onClose, 
  title 
}: ImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentIndex]);

  const goToPrevious = () => {
    setCurrentIndex(prev => 
      prev > 0 ? prev - 1 : images.length - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex(prev => 
      prev < images.length - 1 ? prev + 1 : 0
    );
  };

  if (!images.length) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/90 border-0">{/* Dialog has its own close button */}

        {/* Title */}
        {title && (
          <div className="absolute top-4 left-4 z-50 text-white bg-black/50 px-3 py-1 rounded">
            {title}
          </div>
        )}

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 text-white bg-black/50 px-3 py-1 rounded">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full p-2"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full p-2"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </>
        )}

        {/* Main image */}
        <div className="flex items-center justify-center min-h-[400px] max-h-[80vh]">
          <img
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1} of ${images.length}`}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = '/placeholder-image.jpg';
            }}
          />
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-50">
            <div className="flex gap-2 bg-black/50 p-2 rounded">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-white' 
                      : 'border-transparent opacity-60 hover:opacity-80'
                  }`}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = '/placeholder-image.jpg';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}