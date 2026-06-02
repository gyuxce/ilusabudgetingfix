export function DataTable({ columns, rows, onRowClick, emptyMessage }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[#DDA15E]/35 bg-white/85 p-12 text-center text-sm text-[#606C38] shadow-sm shadow-[#283618]/5">
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
              className={`rounded-xl border border-[#DDA15E]/35 bg-white/85 p-4 shadow-sm shadow-[#283618]/5 transition-all ${onRowClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
            >
              <div className="space-y-3">
                {displayColumns.map((col, colIndex) => (
                  <div key={col.key || colIndex} className="flex items-start justify-between gap-4">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#606C38]/70">{col.label}</span>
                    <div className="min-w-0 max-w-[65%] text-right text-sm text-[#283618]">
                      {col.render ? col.render(row) : row[col.key]}
                    </div>
                  </div>
                ))}
              </div>
              {actionColumn && (
                <div className="mt-4 flex justify-end border-t border-[#DDA15E]/25 pt-3" onClick={(e) => e.stopPropagation()}>
                  {actionColumn.render ? actionColumn.render(row) : row[actionColumn.key]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-[#DDA15E]/35 bg-white/85 shadow-sm shadow-[#283618]/5 md:block">
        <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="border-b border-[#DDA15E]/35 bg-[#FEFAE0]">
            <tr>
              {columns.map((col, i) => (
                <th key={col.key || i} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#606C38]">
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
                className={`border-b border-[#DDA15E]/20 text-[#283618] transition-colors last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-[#DDA15E]/10' : ''}`}
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
