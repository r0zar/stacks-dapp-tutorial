import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick
}) => {
  const baseClasses = 'rounded-xl transition-all duration-200';

  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm',
    glass: 'glass-card',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-gray-700',
    flat: 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const hoverClasses = hover ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : '';

  const classes = [
    baseClasses,
    variants[variant],
    paddings[padding],
    hoverClasses,
    className
  ].filter(Boolean).join(' ');

  const CardComponent = onClick ? motion.div : 'div';
  const motionProps = onClick ? {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 }
  } : {};

  return (
    <CardComponent
      className={classes}
      onClick={onClick}
      {...motionProps}
    >
      {children}
    </CardComponent>
  );
};

export default Card;