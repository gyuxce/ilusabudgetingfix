import { forwardRef } from 'react';

export const Textarea = forwardRef(({ label, error, className = '', rows = 3, ...rest }, ref) => {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <textarea
        ref={ref}
        rows={rows}
        className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:opacity-50 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
        {...rest}
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
});
Textarea.displayName = 'Textarea';
