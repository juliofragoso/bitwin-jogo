import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'cta' | 'secondary' | 'outline' | 'danger' | 'purple' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  
  // Base: Pill shaped, shiny, strong font
  const baseStyles = "btn-glossy font-black rounded-full uppercase tracking-wide flex items-center justify-center outline-none select-none";
  
  const variants = {
    // Primary: Yellow/Orange (Matches 'Criar Sala')
    primary: "bg-gradient-to-b from-[#FFEA00] to-[#FF9E00] text-[#4a0072] border-2 border-[#FFE57F]",
    
    // CTA: Pink (Matches 'Entrar')
    cta: "bg-gradient-to-b from-[#ff3399] to-[#cc0052] text-white border-2 border-[#ff80bf]",
    
    // Purple: For Keypad/Neutral
    purple: "bg-gradient-to-b from-[#7b2cbf] to-[#3c096c] text-white border-2 border-[#9d4edd]",
    
    // Secondary: Transparent
    secondary: "bg-transparent border-2 border-white/20 text-white shadow-none",
    
    // Outline: Subtle
    outline: "bg-transparent border-2 border-white/40 text-white hover:bg-white/10 shadow-none",
    
    // Danger: Red
    danger: "bg-gradient-to-b from-[#ef233c] to-[#d90429] text-white border-2 border-[#ff5c75]",

    // Success: Green
    success: "bg-gradient-to-b from-green-400 to-green-700 text-white border-2 border-green-400",
  };

  const sizes = {
    sm: "px-4 py-1 text-sm h-8",
    md: "px-6 py-2 text-lg h-12",
    lg: "px-8 py-3 text-xl md:text-2xl h-14 md:h-16",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="relative z-10 drop-shadow-sm">{children}</span>
    </button>
  );
};