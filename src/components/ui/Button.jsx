export function Button({ variant = 'primary', size = 'md', children, className = '', ...rest }) {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-1 focus:ring-offset-white active:scale-[0.98]";
  
  const sizeStyles = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
  };
  
  const variantStyles = {
    primary: "bg-gray-950 hover:bg-gray-800 text-white shadow-sm shadow-gray-950/10",
    secondary: "bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 shadow-sm shadow-gray-950/5",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-900/10",
    ghost: "hover:bg-gray-100 text-gray-700",
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
