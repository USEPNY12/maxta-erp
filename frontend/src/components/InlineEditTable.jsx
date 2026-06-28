/**
 * MaxTA ERP - Inline Edit Table Component
 * Professional Excel-like inline editing grid
 * Supports: text, number, select, date, checkbox field types
 * Features: Tab navigation, Enter to save, Escape to cancel, batch editing
 * 
 * Props:
 * - columns: Array of { key, label, width?, editable?, type?, options?, render?, align? }
 *   - editable: boolean (default false)
 *   - type: 'text' | 'number' | 'select' | 'date' | 'checkbox' (default 'text')
 *   - options: Array of { value, label } for select type
 * - data: Array of row objects
 * - onSave: (rowId, field, newValue, row) => Promise<void>  - called on cell save
 * - onBatchSave: (changes) => Promise<void> - called on batch save
 * - idField: field name for row ID (default: 'id')
 * - loading: boolean
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaCheck, FaTimes, FaPencilAlt, FaSave, FaUndo } from 'react-icons/fa';

function InlineEditTable({
  columns = [],
  data = [],
  onSave,
  onBatchSave,
  idField = 'id',
  loading = false,
  emptyMessage = 'No records found',
}) {
  const [editingCell, setEditingCell] = useState(null); // { rowId, field }
  const [editValue, setEditValue] = useState('');
  const [pendingChanges, setPendingChanges] = useState({}); // { rowId: { field: newValue } }
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) inputRef.current.select();
    }
  }, [editingCell]);

  // Start editing a cell
  const startEdit = (rowId, field, currentValue) => {
    setEditingCell({ rowId, field });
    setEditValue(currentValue ?? '');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Save a single cell
  const saveCell = useCallback(async () => {
    if (!editingCell) return;

    const { rowId, field } = editingCell;
    const row = data.find(r => r[idField] === rowId);
    const originalValue = row ? row[field] : '';

    // Only save if value changed
    if (String(editValue) !== String(originalValue)) {
      // Track pending change
      setPendingChanges(prev => ({
        ...prev,
        [rowId]: { ...(prev[rowId] || {}), [field]: editValue }
      }));

      // If onSave is provided, save immediately
      if (onSave) {
        try {
          setSaving(true);
          await onSave(rowId, field, editValue, row);
        } catch (err) {
          console.error('Save failed:', err);
          // Revert the pending change
          setPendingChanges(prev => {
            const updated = { ...prev };
            if (updated[rowId]) {
              delete updated[rowId][field];
              if (Object.keys(updated[rowId]).length === 0) delete updated[rowId];
            }
            return updated;
          });
        } finally {
          setSaving(false);
        }
      }
    }

    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, data, idField, onSave]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveCell();
    } else if (e.key === 'Escape') {
      cancelEdit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveCell();
      // Move to next editable cell
      if (editingCell) {
        const editableColumns = columns.filter(c => c.editable);
        const currentColIdx = editableColumns.findIndex(c => c.key === editingCell.field);
        const currentRowIdx = data.findIndex(r => r[idField] === editingCell.rowId);

        let nextColIdx = currentColIdx + (e.shiftKey ? -1 : 1);
        let nextRowIdx = currentRowIdx;

        if (nextColIdx >= editableColumns.length) {
          nextColIdx = 0;
          nextRowIdx++;
        } else if (nextColIdx < 0) {
          nextColIdx = editableColumns.length - 1;
          nextRowIdx--;
        }

        if (nextRowIdx >= 0 && nextRowIdx < data.length) {
          const nextRow = data[nextRowIdx];
          const nextCol = editableColumns[nextColIdx];
          setTimeout(() => startEdit(nextRow[idField], nextCol.key, nextRow[nextCol.key]), 50);
        }
      }
    }
  };

  // Save all pending changes
  const saveBatch = async () => {
    if (!onBatchSave || Object.keys(pendingChanges).length === 0) return;
    try {
      setSaving(true);
      await onBatchSave(pendingChanges);
      setPendingChanges({});
    } catch (err) {
      console.error('Batch save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Discard all pending changes
  const discardChanges = () => {
    setPendingChanges({});
  };

  // Get display value for a cell (pending change overrides original)
  const getCellValue = (row, field) => {
    const rowId = row[idField];
    if (pendingChanges[rowId] && pendingChanges[rowId][field] !== undefined) {
      return pendingChanges[rowId][field];
    }
    return row[field];
  };

  // Check if a cell has pending changes
  const hasPendingChange = (rowId, field) => {
    return pendingChanges[rowId] && pendingChanges[rowId][field] !== undefined;
  };

  // Render cell content (editing or display)
  const renderCell = (row, col) => {
    const rowId = row[idField];
    const isEditing = editingCell?.rowId === rowId && editingCell?.field === col.key;
    const value = getCellValue(row, col.key);
    const isPending = hasPendingChange(rowId, col.key);

    if (isEditing) {
      return renderEditInput(col, value);
    }

    if (!col.editable) {
      return col.render ? col.render(row[col.key], row) : (row[col.key] ?? '-');
    }

    // Editable cell (display mode)
    return (
      <div
        className={`inline-edit-cell ${isPending ? 'pending' : ''}`}
        onDoubleClick={() => startEdit(rowId, col.key, value)}
        title="Double-click to edit"
      >
        <span className="inline-edit-value">
          {col.render ? col.render(value, row) : (value ?? '-')}
        </span>
        <FaPencilAlt className="inline-edit-icon" size={9} />
      </div>
    );
  };

  // Render the appropriate input for editing
  const renderEditInput = (col, value) => {
    const type = col.type || 'text';

    switch (type) {
      case 'select':
        return (
          <select
            ref={inputRef}
            className="inline-edit-input inline-edit-select"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveCell}
            onKeyDown={handleKeyDown}
          >
            <option value="">-- Select --</option>
            {(col.options || []).map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            ref={inputRef}
            type="number"
            className="inline-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveCell}
            onKeyDown={handleKeyDown}
            step="any"
          />
        );

      case 'date':
        return (
          <input
            ref={inputRef}
            type="date"
            className="inline-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveCell}
            onKeyDown={handleKeyDown}
          />
        );

      case 'checkbox':
        return (
          <input
            ref={inputRef}
            type="checkbox"
            className="inline-edit-checkbox"
            checked={!!editValue}
            onChange={(e) => { setEditValue(e.target.checked); setTimeout(saveCell, 0); }}
            onKeyDown={handleKeyDown}
          />
        );

      default: // text
        return (
          <input
            ref={inputRef}
            type="text"
            className="inline-edit-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveCell}
            onKeyDown={handleKeyDown}
          />
        );
    }
  };

  const hasPendingChangesAny = Object.keys(pendingChanges).length > 0;

  if (loading) {
    return (
      <div className="inline-edit-loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="inline-edit-table-wrapper">
      {/* Batch save toolbar */}
      {hasPendingChangesAny && onBatchSave && (
        <div className="inline-edit-batch-bar">
          <span className="inline-edit-batch-count">
            {Object.keys(pendingChanges).length} row(s) modified
          </span>
          <button className="inline-edit-batch-save" onClick={saveBatch} disabled={saving}>
            <FaSave size={11} /> Save All
          </button>
          <button className="inline-edit-batch-discard" onClick={discardChanges}>
            <FaUndo size={11} /> Discard
          </button>
        </div>
      )}

      <div className="table-responsive">
        <table className="erp-grid inline-edit-grid">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ width: col.width, textAlign: col.align || 'left' }}>
                  {col.label}
                  {col.editable && <FaPencilAlt size={8} style={{ marginLeft: '4px', opacity: 0.4 }} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              (data || []).map(row => (
                <tr key={row[idField]} className={hasPendingChange(row[idField], '') ? 'row-modified' : ''}>
                  {columns.map(col => (
                    <td key={col.key} style={{ textAlign: col.align || 'left', padding: '0' }}>
                      {renderCell(row, col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {saving && (
        <div className="inline-edit-saving-indicator">
          <div className="spinner-small"></div> Saving...
        </div>
      )}
    </div>
  );
}

export default InlineEditTable;
