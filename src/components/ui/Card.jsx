export function Card({ title, description, action, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-950/5 transition-shadow duration-300 hover:shadow-md hover:shadow-gray-950/10 ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-gray-950">{title}</h3>
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
