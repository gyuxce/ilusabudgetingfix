export function Card({ title, description, action, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-[#DDA15E]/35 bg-white/85 shadow-sm shadow-[#283618]/5 transition-shadow duration-300 hover:shadow-md hover:shadow-[#283618]/10 ${className}`}>
      {title && (
        <div className="flex items-start justify-between gap-4 border-b border-[#DDA15E]/25 p-5">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#283618]">{title}</h3>
            {description && <p className="text-sm text-[#606C38] mt-0.5">{description}</p>}
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
