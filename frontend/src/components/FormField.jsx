import React from 'react';

/**
 * FormField - Enhanced form field with validation feedback
 * 
 * Props:
 * - label: string
 * - type: 'text' | 'number' | 'email' | 'password' | 'date' | 'textarea' | 'select'
 * - value: any
 * - onChange: (value) => void
 * - error: string (validation error message)
 * - required: boolean
 * - disabled: boolean
 * - placeholder: string
 * - options: Array of { value, label } for select type
 * - helpText: string
 * - min, max, step: for number inputs
 */
function FormField({
  label,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  placeholder,
  options = [],
  helpText,
  min,
  max,
  step,
  rows = 3,
  className = '',
}) {
  const inputId = `field-${label?.replace(/\s+/g, '-').toLowerCase()}`;

  const baseStyle = {
    border: error ? '1px solid var(--danger)' : '1px solid var(--border)',
    boxShadow: error ? '0 0 0 3px rgba(220, 38, 38, 0.1)' : undefined,
  };

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <textarea
          id={inputId}
          className={`erp-form-input ${className}`}
          style={{ ...baseStyle, resize: 'vertical', minHeight: `${rows * 24}px` }}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          rows={rows}
        />
      );
    }

    if (type === 'select') {
      return (
        <select
          id={inputId}
          className={`erp-form-select ${className}`}
          style={baseStyle}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          required={required}
        >
          <option value="">{placeholder || '-- Select --'}</option>
          {options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        id={inputId}
        type={type}
        className={`erp-form-input ${className}`}
        style={baseStyle}
        value={value || ''}
        onChange={e => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
      />
    );
  };

  return (
    <div className="erp-form-group">
      <label htmlFor={inputId} className="erp-form-label">
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: '2px' }}>*</span>}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {renderInput()}
        {error && (
          <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
            {error}
          </span>
        )}
        {helpText && !error && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {helpText}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * LoadingButton - Button with loading state
 */
export function LoadingButton({ children, loading, onClick, className = '', variant = '', disabled, ...props }) {
  const variantClass = variant ? `erp-btn-${variant}` : '';
  return (
    <button
      className={`erp-btn ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ position: 'relative', opacity: loading ? 0.7 : 1 }}
      {...props}
    >
      {loading && (
        <span style={{
          display: 'inline-block',
          width: '12px',
          height: '12px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.6s linear infinite',
          marginRight: '6px',
        }} />
      )}
      {children}
    </button>
  );
}

export default FormField;
