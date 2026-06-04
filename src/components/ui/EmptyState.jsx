export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 py-12 text-center bg-white border border-gray-200 rounded-lg">
      {Icon && (
        <div className="w-12 h-12 bg-gray-50 flex items-center justify-center rounded-full mb-4 ring-1 ring-gray-200">
          <Icon size={24} className="text-gray-400" />
        </div>
      )}
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
