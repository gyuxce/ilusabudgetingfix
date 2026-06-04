export function DataTable({ columns, rows, onRowClick, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500 shadow-sm shadow-gray-950/5">
        {emptyMessage || 'No data available'}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {rows.map((row, rowIndex) => {
          const actionColumn = columns.find((col) => col.key === 'actions');
          const displayColumns = columns.filter((col) => col.key !== 'actions');

          return (
            <div
              key={row.id || rowIndex}
              onClick={() => {
                if (onRowClick) onRowClick(row);
              }}
              className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-950/5 transition-all ${onRowClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
            >
              <div className="space-y-3">
                {displayColumns.map((col, colIndex) => (
                  <div key={col.key || colIndex} className="flex items-start justify-between gap-4">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">{col.label}</span>
                    <div className="min-w-0 max-w-[65%] text-right text-sm text-gray-900">
                      {col.render ? col.render(row) : row[col.key]}
                    </div>
                  </div>
                ))}
              </div>
              {actionColumn && (
                <div className="mt-4 flex justify-end border-t border-gray-100 pt-3" onClick={(e) => e.stopPropagation()}>
                  {actionColumn.render ? actionColumn.render(row) : row[actionColumn.key]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-950/5 md:block">
        <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {columns.map((col, i) => (
                <th key={col.key || i} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
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
                className={`border-b border-gray-100 text-gray-900 transition-colors last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
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
    </>
  );
}
