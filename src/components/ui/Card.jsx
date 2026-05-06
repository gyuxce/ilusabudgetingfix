export function Card({ title, description, action, children, className = '' }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {title && (
        <div className="p-5 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}
