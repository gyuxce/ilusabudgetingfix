export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 py-12 text-center bg-white/85 border border-[#DDA15E]/35 rounded-lg">
      {Icon && (
        <div className="w-12 h-12 bg-[#FEFAE0] flex items-center justify-center rounded-full mb-4 ring-1 ring-[#DDA15E]/35">
          <Icon size={24} className="text-[#606C38]" />
        </div>
      )}
      <h3 className="text-sm font-medium text-[#283618]">{title}</h3>
      {description && <p className="text-sm text-[#606C38] mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
