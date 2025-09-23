import React from 'react';

export const AnimatedDots = () => {
  return (
    <span className="inline-flex">
      <span 
        className="animate-dot-blink text-current"
        style={{ animationDelay: '0s' }}
      >
        .
      </span>
      <span 
        className="animate-dot-blink text-current"
        style={{ animationDelay: '0.5s' }}
      >
        .
      </span>
      <span 
        className="animate-dot-blink text-current"
        style={{ animationDelay: '1s' }}
      >
        .
      </span>
    </span>
  );
};