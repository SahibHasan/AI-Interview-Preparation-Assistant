import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number; // ms
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 800,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(shouldReduceMotion ? value : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = value;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeProgress;
      
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration, shouldReduceMotion]);

  const formatted = decimals > 0 
    ? displayValue.toFixed(decimals) 
    : Math.round(displayValue).toString();

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};
