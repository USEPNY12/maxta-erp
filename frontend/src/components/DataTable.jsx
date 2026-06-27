import React, { useState } from 'react';
import { FaList, FaTh, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

/**
 * DataTable - A responsive data table component
 * Provides horizontal scroll on mobile and optional card view
 * 
 * Props:
 * - columns: Array of { key, label, width?, render?, align? }
 * - data: Array of row objects
 * - onRowClick: (row) => void
 * - selectedId: ID of selected row
 * - idField: field name for row ID (default: 'id')
 * - emptyMessage: string to show when no data
 * - loading: boolean
 * - pageSize: number (default: 50)
 * - searchable: boolean (default: true)
 * - searchFields: Array of field names to search
 */
function DataTable({
  columns = [],
  data = [],
  onRowClick,
  selectedId,
  idField = 'id',
  emptyMessage = 'No records found',
  loading = false,
  pageSize = 50,
  searchable = true,
  searchFields,
  actions,
}) {
  const [viewMode, setViewMode] = useState('table');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  // Filter data by search
  const filteredData = search.trim() ? data.filter(row => {
    const fields = searchFields || columns.map(c => c.key);
    return fields.some(f => {
      const val = row[f];
      if (val == null) return false;
      return String(val).toLowerCase().includes(search.toLowerCase());
    });
  }) : data;

  // Sort data
  const sortedData = sortField ? [...filteredData].sort((a, b) => {
    const aVal = a[sortField] ?? '';
    const bVal = b[sortField] ?? '';
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc' 
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  }) : filteredData;

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pagedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key) => {
    if (sortField === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(key);
      setSortDir('asc');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '32px', marginBottom: '8px', borderRadius: '4px' }}></div>
        ))}
      </div>
    );
  }

  return (
    <div className="data-table-wrapper">
      {/* Toolbar */}
      <div className="data-table-toolbar">
        {searchable && (
          <div className="data-table-search">
            <FaSearch size={12} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="data-table-search-input"
            />
          </div>
        )}
        <div className="data-table-toolbar-right">
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
          </span>
          <button
            className={`data-table-view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            <FaList size={12} />
          </button>
          <button
            className={`data-table-view-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => setViewMode('card')}
            title="Card view"
          >
            <FaTh size={12} />
          </button>
          {actions}
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="table-responsive">
          <table className="erp-grid">
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={{ width: col.width, textAlign: col.align || 'left', cursor: 'pointer' }}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortField === col.key && (
                      <span style={{ marginLeft: '4px', fontSize: '10px' }}>
                        {sortDir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pagedData.map(row => (
                  <tr
                    key={row[idField]}
                    className={selectedId === row[idField] ? 'selected' : ''}
                    onClick={() => onRowClick && onRowClick(row)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {columns.map(col => (
                      <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Card View (Mobile-friendly) */}
      {viewMode === 'card' && (
        <div className="data-table-cards">
          {pagedData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">{emptyMessage}</div>
            </div>
          ) : (
            pagedData.map(row => (
              <div
                key={row[idField]}
                className={`data-table-card ${selectedId === row[idField] ? 'selected' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.slice(0, 5).map(col => (
                  <div key={col.key} className="data-table-card-field">
                    <span className="data-table-card-label">{col.label}</span>
                    <span className="data-table-card-value">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-')}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="data-table-pagination">
          <button
            className="data-table-page-btn"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <FaChevronLeft size={10} />
          </button>
          <span className="data-table-page-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="data-table-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <FaChevronRight size={10} />
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
