import { animate, useMotionValue, useTransform, motion } from 'motion/react';
import { useEffect } from 'react';

export function AnimatedNumber({ value = 0, prefix = '', suffix = '', className = '', formatter }) {
  const numericValue = Number(value) || 0;
  const motionValue = useMotionValue(0);
  const displayValue = useTransform(motionValue, (latest) => {
    const rounded = Math.round(latest);
    const formatted = formatter ? formatter(rounded) : new Intl.NumberFormat('id-ID').format(rounded);
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    const controls = animate(motionValue, numericValue, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });

    return () => controls.stop();
  }, [motionValue, numericValue]);

  return <motion.span className={className}>{displayValue}</motion.span>;
}
