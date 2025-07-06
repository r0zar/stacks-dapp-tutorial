import React, { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  onIconClick?: () => void;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  icon: Icon,
  iconPosition = 'left',
  onIconClick,
  helperText,
  variant = 'default',
  className = '',
  ...props
}, ref) => {
  const baseInputClasses = 'block w-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    default: 'border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 focus:border-primary-500 focus:ring-primary-500',
    filled: 'border-0 rounded-lg px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 focus:bg-white dark:focus:bg-gray-800 focus:ring-primary-500',
    outlined: 'border-2 border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-transparent text-gray-900 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 focus:border-primary-500 focus:ring-primary-500'
  };

  const errorClasses = error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : '';
  const iconClasses = Icon ? (iconPosition === 'left' ? 'pl-12' : 'pr-12') : '';

  const inputClasses = [
    baseInputClasses,
    variants[variant],
    errorClasses,
    iconClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div
            className={`absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center ${
              onIconClick ? 'cursor-pointer' : 'pointer-events-none'
            }`}
            onClick={onIconClick}
          >
            <Icon className={`h-5 w-5 ${error ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`} />
          </div>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;