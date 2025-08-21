import { motion } from 'framer-motion';

interface AdminSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const AdminSparkline = ({ 
  data, 
  width = 100, 
  height = 32, 
  color = 'hsl(var(--primary))',
  className 
}: AdminSparklineProps) => {
  if (!data || data.length === 0) {
    return (
      <div 
        className={`bg-muted-foreground/10 rounded ${className}`}
        style={{ width, height }}
      />
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  if (range === 0) {
    // Flat line when all values are the same
    const points = data.map((_, i) => `${(i / (data.length - 1)) * width},${height / 2}`).join(' ');
    return (
      <svg width={width} height={height} className={className}>
        <motion.polyline
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          points={points}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeInOut" }}
        />
      </svg>
    );
  }

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className={className}>
      <defs>
        <linearGradient id={`gradient-${Math.random()}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      
      <motion.polygon
        fill={`url(#gradient-${Math.random()})`}
        points={areaPoints}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />
      
      {data.length <= 7 && data.map((_, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((data[index] - min) / range) * height;
        return (
          <motion.circle
            key={index}
            cx={x}
            cy={y}
            r="2"
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
          />
        );
      })}
    </svg>
  );
};