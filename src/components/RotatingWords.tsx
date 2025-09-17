import { useState, useEffect } from 'react';

interface RotatingWordsProps {
  words: string[];
  className?: string;
}

export const RotatingWords = ({ words, className = '' }: RotatingWordsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationState, setAnimationState] = useState<'visible' | 'exiting' | 'entering'>('visible');

  useEffect(() => {
    const interval = setInterval(() => {
      // Start exit animation
      setAnimationState('exiting');
      
      setTimeout(() => {
        // Change word and start enter animation
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setAnimationState('entering');
        
        setTimeout(() => {
          // Set to visible state
          setAnimationState('visible');
        }, 400); // Entry animation duration
      }, 600); // Exit animation duration
    }, 3500); // Total cycle time

    return () => clearInterval(interval);
  }, [words.length]);

  const getAnimationClass = () => {
    switch (animationState) {
      case 'exiting':
        return 'animate-[slideRightFade_0.6s_ease-in-out_forwards]';
      case 'entering':
        return 'animate-[slideInFromLeft_0.4s_ease-out_forwards]';
      default:
        return '';
    }
  };

  return (
    <span 
      className={`inline-block relative will-change-transform ${className} ${getAnimationClass()}`}
      style={{ minWidth: '140px', textAlign: 'left' }}
    >
      {words[currentIndex]}
    </span>
  );
};