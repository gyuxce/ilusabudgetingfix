import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, footer, maxWidthClass = "max-w-md" }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/40 transition-opacity" 
        onClick={onClose} 
      />
      <div className={`relative w-full ${maxWidthClass} bg-white rounded-lg border border-[#DDA15E]/35 shadow-xl shadow-[#283618]/15 m-4 flex flex-col max-h-[90vh]`}>
        <div className="p-5 border-b border-[#DDA15E]/30 flex justify-between items-center shrink-0">
          <h2 className="text-base font-semibold text-[#283618]">{title}</h2>
          <button 
            onClick={onClose}
            className="text-[#606C38]/70 hover:text-[#283618] transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-[#DDA15E]/30 bg-[#FEFAE0] rounded-b-lg flex gap-3 justify-end shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
