export function Button({ variant = 'primary', size = 'md', children, className = '', ...rest }) {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizeStyles = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3.5 py-2 text-sm",
  };
  
  const variantStyles = {
    primary: "bg-emerald-600 hover:bg-emerald-700 text-white",
    secondary: "bg-white border border-gray-300 hover:bg-gray-50 text-gray-700",
    danger: "bg-red-600 hover:bg-red-700 text-white",
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
