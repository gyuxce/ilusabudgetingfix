import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';

export function ActionsMenu({ trigger, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleSelect = (item) => {
    setOpen(false);
    if (item.onClick) item.onClick();
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Aksi"
      >
        {trigger || <MoreVertical size={16} />}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-30 mt-1 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg shadow-gray-950/10 focus:outline-none ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={`divider-${index}`} className="my-1 h-px bg-gray-100" />;
            }
            const Icon = item.icon;
            return (
              <button
                key={item.key || index}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(item);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                title={item.title || item.label}
              >
                {Icon && <Icon size={14} className={item.iconClassName || ''} />}
                <span className={item.labelClassName || ''}>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}