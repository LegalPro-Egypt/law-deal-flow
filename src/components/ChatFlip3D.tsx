import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ChatFlip3DProps {
  children: React.ReactNode;
  flips?: number;
  spinOnScroll3D?: boolean;
}

export const ChatFlip3D: React.FC<ChatFlip3DProps> = ({ 
  children, 
  flips = 5,
  spinOnScroll3D = true 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  // Track scroll progress for this specific element
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  // Map scroll progress to rotation values
  const rotateY = useTransform(scrollYProgress, [0, 1], [0, flips * 360]);
  const rotateX = useTransform(scrollYProgress, 
    [0, 0.25, 0.5, 0.75, 1], 
    [0, 6, 0, -6, 0]
  );

  // Calculate when card should be non-interactive (during >90° rotations)
  const opacity = useTransform(scrollYProgress, 
    [0, 0.125, 0.375, 0.625, 0.875, 1],
    [1, 0.7, 1, 0.7, 1, 1]
  );

  // Disable interaction during extreme rotations
  const pointerEvents = useTransform(rotateY, (value) => {
    const normalizedRotation = Math.abs(value % 360);
    return (normalizedRotation > 90 && normalizedRotation < 270) ? 'none' : 'auto';
  });

  if (!spinOnScroll3D) {
    return <div ref={ref}>{children}</div>;
  }

  return (
    <div ref={ref} className="[perspective:1200px]">
      <motion.div
        style={{
          rotateY,
          rotateX,
          opacity,
          pointerEvents,
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          willChange: 'transform'
        }}
        className="transform-gpu"
      >
        {children}
      </motion.div>
    </div>
  );
};