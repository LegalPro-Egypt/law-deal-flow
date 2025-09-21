import { cn } from "@/lib/utils";

interface WaveDividerProps {
  direction?: 'top' | 'bottom';
  className?: string;
}

export const WaveDivider = ({ direction = 'top', className }: WaveDividerProps) => {
  const topPath = "M0,0L48,10.7C96,21,192,43,288,48C384,53,480,43,576,37.3C672,32,768,32,864,37.3C960,43,1056,53,1152,48C1248,43,1344,21,1392,10.7L1440,0L1440,64L1392,64C1344,64,1248,64,1152,64C1056,64,960,64,864,64C768,64,672,64,576,64C480,64,384,64,288,64C192,64,96,64,48,64L0,64Z";
  
  const bottomPath = "M0,64L48,53.3C96,43,192,21,288,16C384,11,480,21,576,26.7C672,32,768,32,864,26.7C960,21,1056,11,1152,16C1248,21,1344,43,1392,53.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z";

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