import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  // Styles for "Gamified" 3D look with bottom border
  const baseStyles = "font-bold rounded-2xl transition-all duration-100 transform active:translate-y-1 active:border-b-0 uppercase tracking-wide";
  
  const variants = {
    primary: "bg-bitwin-primary text-bitwin-bg border-b-4 border-yellow-600 hover:brightness-110",
    secondary: "bg-bitwin-secondary text-white border-b-4 border-pink-800 hover:brightness-110",
    outline: "bg-transparent border-2 border-white/30 text-white hover:bg-white/10",
    danger: "bg-red-500 text-white border-b-4 border-red-800 hover:bg-red-400",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm border-b-2",
    md: "px-6 py-3 text-lg",
    lg: "px-10 py-4 text-2xl",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};