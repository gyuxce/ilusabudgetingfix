export function DataTable({ columns, rows, onRowClick, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg bg-white p-12 flex items-center justify-center text-center text-sm text-gray-500 shadow-sm">
        {emptyMessage || 'No data available'}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col, i) => (
                <th key={col.key || i} className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr 
                key={row.id || rowIndex} 
                onClick={(e) => {
                  if (onRowClick) onRowClick(row);
                }}
                className={`border-b border-gray-100 last:border-0 text-gray-900 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-4 py-3 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
