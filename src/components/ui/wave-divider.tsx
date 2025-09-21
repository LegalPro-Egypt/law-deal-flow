import { cn } from "@/lib/utils";

interface WaveDividerProps {
  direction?: 'top' | 'bottom';
  className?: string;
}

export const WaveDivider = ({ direction = 'top', className }: WaveDividerProps) => {
  const topPath = "M0,32L48,37.3C96,43,192,53,288,58.7C384,64,480,64,576,58.7C672,53,768,43,864,42.7C960,43,1056,53,1152,58.7C1248,64,1344,64,1392,64L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z";
  
  const bottomPath = "M0,0L48,5.3C96,11,192,21,288,26.7C384,32,480,32,576,26.7C672,21,768,11,864,10.7C960,11,1056,21,1152,26.7C1248,32,1344,32,1392,32L1440,32L1440,64L1392,64C1344,64,1248,64,1152,64C1056,64,960,64,864,64C768,64,672,64,576,64C480,64,384,64,288,64C192,64,96,64,48,64L0,64Z";

  return (
    <div className={cn(
      "absolute w-full overflow-hidden",
      direction === 'top' ? '-top-1' : '-bottom-1',
      className
    )}>
      <svg
        className="relative block w-full h-16 md:h-20"
        viewBox="0 0 1440 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <path
          d={direction === 'top' ? topPath : bottomPath}
          fill="hsl(var(--primary) / 0.03)"
          className="transition-colors duration-300"
        />
        <path
          d={direction === 'top' ? topPath : bottomPath}
          fill="hsl(var(--accent) / 0.02)"
          transform="scale(1.02)"
          className="transition-colors duration-300"
        />
      </svg>
    </div>
  );
};