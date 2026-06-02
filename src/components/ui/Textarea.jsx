import { forwardRef } from 'react';

export const Textarea = forwardRef(({ label, error, className = '', rows = 3, ...rest }, ref) => {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-[#283618] mb-1.5">{label}</label>}
      <textarea
        ref={ref}
        rows={rows}
        className={`w-full rounded-md border border-[#DDA15E]/60 bg-white/90 px-3 py-2 text-sm text-[#283618] shadow-sm transition-colors placeholder:text-[#606C38]/60 focus:border-[#606C38] focus:outline-none focus:ring-1 focus:ring-[#606C38] disabled:bg-[#FEFAE0]/60 disabled:opacity-50 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';
