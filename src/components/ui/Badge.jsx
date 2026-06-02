export function Badge({ variant = 'neutral', children, className = '' }) {
  const styles = {
    success: "bg-[#606C38]/12 text-[#283618] ring-[#606C38]/25",
    warning: "bg-[#DDA15E]/20 text-[#BC6C25] ring-[#DDA15E]/35",
    danger: "bg-red-50 text-red-700 ring-red-100",
    neutral: "bg-[#FEFAE0] text-[#283618] ring-[#DDA15E]/35",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${styles[variant] || styles.neutral} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
