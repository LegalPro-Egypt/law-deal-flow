import { cn } from "@/lib/utils";

interface WaveDividerProps {
  direction?: 'top' | 'bottom';
  className?: string;
}

export const WaveDivider = ({ direction = 'top', className }: WaveDividerProps) => {
  // Master wave pattern - gentle, natural curves
  // Top wave: flows from flat (Y=0) to valleys (Y=70) back to connection (Y=120)
  const topPath = "M0,0L120,8C240,16,360,35,480,45C600,55,720,35,840,25C960,15,1080,35,1200,50C1320,65,1440,70,1440,70L1440,120L1320,120C1200,120,1080,120,960,120C840,120,720,120,600,120C480,120,360,120,240,120C120,120,0,120,0,120Z";
  
  // Bottom wave: perfect mathematical mirror of top wave
  // Mirror logic: Y_bottom = 120 - Y_top, creating seamless connection
  const bottomPath = "M0,120L120,112C240,104,360,85,480,75C600,65,720,85,840,95C960,105,1080,85,1200,70C1320,55,1440,50,1440,50L1440,0L1320,0C1200,0,1080,0,960,0C840,0,720,0,600,0C480,0,360,0,240,0C120,0,0,0,0,0Z";

  return (
    <div className={cn(
      "absolute w-full overflow-hidden",
      direction === 'top' ? 'top-0' : 'bottom-0',
      className
    )}>
      <svg
        className="relative block w-full h-20 md:h-24"
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d={direction === 'top' ? topPath : bottomPath}
          fill="hsl(var(--primary) / 0.06)"
          className="transition-colors duration-300"
        />
        <path
          d={direction === 'top' ? topPath : bottomPath}
          fill="hsl(var(--accent) / 0.04)"
          transform="scale(1.01)"
          className="transition-colors duration-300"
        />
      </svg>
    </div>
  );
};