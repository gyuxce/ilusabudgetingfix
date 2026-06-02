export function Button({ variant = 'primary', size = 'md', children, className = '', ...rest }) {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#606C38] focus:ring-offset-1 focus:ring-offset-[#FEFAE0] active:scale-[0.98]";
  
  const sizeStyles = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
  };
  
  const variantStyles = {
    primary: "bg-[#283618] hover:bg-[#606C38] text-[#FEFAE0] shadow-sm shadow-[#283618]/15",
    secondary: "bg-white/80 border border-[#DDA15E]/50 hover:bg-[#DDA15E]/15 text-[#283618] shadow-sm",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-900/10",
    ghost: "hover:bg-[#DDA15E]/15 text-[#283618]",
  };

  return (
    <button 
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
