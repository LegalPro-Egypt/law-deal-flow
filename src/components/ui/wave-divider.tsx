import { cn } from "@/lib/utils";

interface WaveDividerProps {
  direction?: 'top' | 'bottom';
  className?: string;
}

export const WaveDivider = ({ direction = 'top', className }: WaveDividerProps) => {
  // Natural, gentle wave curves - subtly different between top and bottom
  const topPath = "M0,0L80,8C160,16,320,32,480,28C640,24,800,0,960,8C1120,16,1280,48,1360,64L1440,80L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z";
  
  const bottomPath = "M0,120L60,108C120,96,240,72,360,64C480,56,600,64,720,76C840,88,960,104,1080,100C1200,96,1320,72,1380,60L1440,48L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z";

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