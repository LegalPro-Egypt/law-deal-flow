import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ChatFlip3DProps {
  children: React.ReactNode;
  flips?: number;
  spinOnScroll3D?: boolean;
  trigger?: boolean;
}

export const ChatFlip3D: React.FC<ChatFlip3DProps> = ({ 
  children, 
  flips = 1,
  spinOnScroll3D = true,
  trigger = false
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  if (!spinOnScroll3D) {
    return <div ref={ref}>{children}</div>;
  }

  // Use trigger-based animation instead of scroll-driven
  if (trigger !== undefined) {
    return (
      <div ref={ref} className="[perspective:1200px]">
        <motion.div
          initial={{ rotateY: 0, rotateX: 0 }}
          animate={trigger ? { 
            rotateY: flips * 360,
            rotateX: [0, 6, 0, -6, 0]
          } : { rotateY: 0, rotateX: 0 }}
          transition={{ 
            duration: 1.2, 
            ease: "easeInOut",
            times: trigger ? [0, 0.25, 0.5, 0.75, 1] : undefined
          }}
          style={{
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
  }

  // Fallback to scroll-driven animation
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const rotateY = useTransform(scrollYProgress, [0, 1], [0, flips * 360]);
  const rotateX = useTransform(scrollYProgress, 
    [0, 0.25, 0.5, 0.75, 1], 
    [0, 6, 0, -6, 0]
  );

  const opacity = useTransform(scrollYProgress, 
    [0, 0.125, 0.375, 0.625, 0.875, 1],
    [1, 0.7, 1, 0.7, 1, 1]
  );

  const pointerEvents = useTransform(rotateY, (value) => {
    const normalizedRotation = Math.abs(value % 360);
    return (normalizedRotation > 90 && normalizedRotation < 270) ? 'none' : 'auto';
  });

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