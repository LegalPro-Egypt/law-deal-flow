import React, { useState, useEffect } from 'react';
import { Shield, Users, Clock, MessageSquare, Check, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  {
    title: 'Secure Messaging',
    desc: 'End-to-end encrypted communication with file sharing and voice notes',
    icon: MessageSquare
  },
  {
    title: 'Case Tracking', 
    desc: 'Real-time updates on your case progress with milestone notifications',
    icon: Check
  },
  {
    title: 'Client Protection Guarantee',
    desc: 'We cover part or all case fees in the rare event of proven misconduct or malpractice',
    icon: ShieldCheck
  },
  {
    title: 'Payment Protection',
    desc: 'Secure escrow with 50% holdback until case delivery and satisfaction', 
    icon: Shield
  },
  {
    title: 'Vetted Lawyers',
    desc: 'Verified professionals with specialization ratings and reviews',
    icon: Users
  },
  {
    title: 'Fast Matching',
    desc: 'Get matched within hours, not days or weeks',
    icon: Clock
  }
];

const FlipFeatureCard: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const nextIndex = (currentIndex + 1) % features.length;
  const currentFeature = features[currentIndex];
  const nextFeature = features[nextIndex];

  const handleFlip = () => {
    if (prefersReducedMotion) {
      // Instant transition for reduced motion
      setCurrentIndex(nextIndex);
      return;
    }
    
    setIsFlipped(true);
  };

  const handleTransitionEnd = () => {
    if (isFlipped) {
      setCurrentIndex(nextIndex);
      setIsFlipped(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFlip();
    }
  };

  const FeatureContent: React.FC<{ feature: typeof features[0] }> = ({ feature }) => {
    const IconComponent = feature.icon;
    return (
      <div className="h-full flex flex-col justify-between p-6">
        <div className="flex flex-col items-center text-center">
          <div className="text-primary mb-4">
            <IconComponent className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {feature.desc}
          </p>
        </div>
        <div className="text-center mt-6">
          <span className="text-xs text-muted-foreground">Tap to flip →</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleFlip}
        onKeyDown={handleKeyDown}
        className="max-w-md w-full aspect-[3/2] [perspective:1200px] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
        aria-label={`Current feature: ${currentFeature.title}. Next feature: ${nextFeature.title}. Press to flip.`}
      >
        <div 
          className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          } ${prefersReducedMotion ? 'transition-opacity' : ''}`}
          onTransitionEnd={handleTransitionEnd}
        >
          {/* Front side */}
          <Card className={`absolute inset-0 [backface-visibility:hidden] bg-gradient-card card-hover ${
            prefersReducedMotion && isFlipped ? 'opacity-0' : 'opacity-100'
          }`}>
            <FeatureContent feature={currentFeature} />
          </Card>
          
          {/* Back side */}
          <Card className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-card card-hover ${
            prefersReducedMotion && isFlipped ? 'opacity-100' : ''
          }`}>
            <FeatureContent feature={nextFeature} />
          </Card>
        </div>
      </button>
      
      {/* Dot indicators */}
      <div className="flex gap-2">
        {features.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default FlipFeatureCard;