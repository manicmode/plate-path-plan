import { useEffect, useRef } from 'react';

interface UseWaveformOptions {
  analyser?: AnalyserNode | null;
  isActive?: boolean;
  color?: string;
}

export const useWaveform = (canvasRef: React.RefObject<HTMLCanvasElement>, options: UseWaveformOptions = {}) => {
  const { analyser, isActive = false, color = '#10b981' } = options;
  const animationFrameRef = useRef<number>();
  const lastValuesRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawWaveform = () => {
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      
      if (analyser && isActive) {
        // Real audio data
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);
        
        // Downsample to ~40 bars for visual appeal
        const barCount = 40;
        const barWidth = width / barCount;
        const samplesPerBar = Math.floor(bufferLength / barCount);
        
        ctx.fillStyle = color;
        
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < samplesPerBar; j++) {
            sum += dataArray[i * samplesPerBar + j];
          }
          const average = sum / samplesPerBar;
          const barHeight = (average / 255) * height * 0.8;
          
          ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
        }
      } else {
        // Idle animation with floating bars
        const barCount = 40;
        const barWidth = width / barCount;
        const time = Date.now() * 0.003;
        
        ctx.fillStyle = `${color}40`; // Semi-transparent
        
        for (let i = 0; i < barCount; i++) {
          const wave = Math.sin(time + i * 0.3) * 0.3 + 0.1;
          const barHeight = wave * height * 0.4;
          
          ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
        }
      }
      
      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(drawWaveform);
      }
    };

    // Initial draw and animation loop
    drawWaveform();
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isActive, color]);

  // Resize canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
};