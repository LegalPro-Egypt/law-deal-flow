import { useEffect, useRef } from 'react';

interface UseFlip3DOnScrollProps {
  flips?: number;
  enabled?: boolean;
}

export const useFlip3DOnScroll = ({ 
  flips = 5, 
  enabled = true 
}: UseFlip3DOnScrollProps = {}) => {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const element = elementRef.current;
    let animationId: number;

    const updateTransform = () => {
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate scroll progress (0 to 1)
      const elementTop = rect.top;
      const elementBottom = rect.bottom;
      const progress = Math.max(0, Math.min(1, 
        (windowHeight - elementTop) / (windowHeight + rect.height)
      ));

      // Calculate rotation values
      const rotateY = progress * flips * 360;
      const rotateX = Math.sin(progress * Math.PI * 2) * 6;

      // Apply transform with GPU acceleration
      element.style.transform = `translateZ(0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      
      // Handle pointer events during extreme rotations
      const normalizedRotation = Math.abs(rotateY % 360);
      element.style.pointerEvents = 
        (normalizedRotation > 90 && normalizedRotation < 270) ? 'none' : 'auto';
    };

    const handleScroll = () => {
      animationId = requestAnimationFrame(updateTransform);
    };

    // Set up 3D context
    if (element.parentElement) {
      element.parentElement.style.perspective = '1200px';
    }
    element.style.transformStyle = 'preserve-3d';
    element.style.backfaceVisibility = 'hidden';
    element.style.willChange = 'transform';

    // Initial transform
    updateTransform();

    // Listen to scroll events
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateTransform, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateTransform);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      // Reset styles
      if (element) {
        element.style.transform = '';
        element.style.pointerEvents = '';
        element.style.transformStyle = '';
        element.style.backfaceVisibility = '';
        element.style.willChange = '';
      }
      if (element.parentElement) {
        element.parentElement.style.perspective = '';
      }
    };
  }, [flips, enabled]);

  return { elementRef };
};