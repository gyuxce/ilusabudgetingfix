import { forwardRef } from 'react';

export const Select = forwardRef(({ label, error, options = [], className = '', ...rest }, ref) => {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-[#283618] mb-1.5">{label}</label>}
      <select
        ref={ref}
        className={`w-full rounded-lg border border-[#DDA15E]/60 bg-white/90 px-3 py-2 text-sm text-[#283618] shadow-sm transition-colors focus:border-[#606C38] focus:outline-none focus:ring-2 focus:ring-[#606C38]/20 disabled:bg-[#FEFAE0]/60 disabled:opacity-50 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';
