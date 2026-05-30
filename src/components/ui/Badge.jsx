export function Badge({ variant = 'neutral', children, className = '' }) {
  const styles = {
    success: "bg-gray-100 text-gray-800 ring-gray-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-100",
    danger: "bg-red-50 text-red-700 ring-red-100",
    neutral: "bg-gray-100 text-gray-700 ring-gray-200",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${styles[variant] || styles.neutral} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
