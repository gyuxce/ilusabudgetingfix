import { forwardRef } from 'react';

export const Select = forwardRef(({ label, error, options = [], className = '', ...rest }, ref) => {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <select
        ref={ref}
        className={`w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 disabled:opacity-50 disabled:bg-gray-50 bg-white ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
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
