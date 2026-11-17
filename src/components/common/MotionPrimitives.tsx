import React, { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  yOffset = 12,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.28, delay, ease: EASE_OUT_EXPO }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  className = '',
  onClick,
}) => {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
      onClick={onClick}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface GlassTiltCard3DProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  hoverLift?: number;
  sheen?: boolean;
}

/**
 * Hardware-accelerated 3D glass card with subtle pointer-driven perspective tilt
 * and specular light sheen using MotionValues (zero React state re-renders per mousemove).
 */
export const GlassTiltCard3D: React.FC<GlassTiltCard3DProps> = ({
  children,
  className = '',
  intensity = 4,
  hoverLift = 3,
  sheen = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 220, damping: 24, mass: 0.45 });
  const smoothY = useSpring(mouseY, { stiffness: 220, damping: 24, mass: 0.45 });

  const rotateX = useTransform(smoothY, [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-intensity, intensity]);
  const glareX = useTransform(smoothX, [-0.5, 0.5], ['15%', '85%']);
  const glareY = useTransform(smoothY, [-0.5, 0.5], ['15%', '85%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xPct);
    mouseY.set(yPct);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div style={{ perspective: 1100 }} className="w-full h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        whileHover={{ y: -hoverLift }}
        transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
        className={`group/tilt relative h-full will-change-transform ${className}`}
      >
        {sheen && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover/tilt:opacity-100 transition-opacity duration-300"
            style={{
              background: useTransform(
                [glareX, glareY],
                ([gx, gy]) =>
                  `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 58%)`
              ),
            }}
          />
        )}
        {children}
      </motion.div>
    </div>
  );
};

export const StaggerContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}> = ({ children, className = '', staggerDelay = 0.05 }) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: {
        transition: {
          staggerChildren: staggerDelay,
        },
      },
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.24, ease: EASE_OUT_EXPO },
      },
    }}
    className={className}
  >
    {children}
  </motion.div>
);
