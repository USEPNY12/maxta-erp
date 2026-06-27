import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Glass CPQ Configurator - Interactive pricing calculator for glass fabrication
 * Embeds in Quote/Order line item forms to auto-calculate pricing
 */
export default function GlassConfigurator({ onPriceCalculated, initialValues = {}, customerId = null }) {
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Glass configuration state
  const [config, setConfig] = useState({
    glass_type: initialValues.glass_type || '',
    thickness: initialValues.thickness || '',
    width_inches: initialValues.width_inches || '',
    height_inches: initialValues.height_inches || '',
    quantity: initialValues.quantity || 1,
    edge_type: initialValues.edge_type || 'None',
    has_holes: initialValues.has_holes || false,
    holes_count: initialValues.holes_count || 0,
    hole_type: initialValues.hole_type || 'Standard Round Hole',
    cutouts: initialValues.cutouts || [],
    notches: initialValues.notches || [],
    coating: initialValues.coating || 'None',
    is_tempered: initialValues.is_tempered || false,
    shape: initialValues.shape || 'rectangular'
  });

  // Load CPQ options on mount
  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const res = await api.get('/api/cpq/options');
      setOptions(res.data);
    } catch (err) {
      setError('Failed to load configurator options');
    } finally {
      setLoading(false);
    }
  };

  // Auto-calculate when config changes (debounced)
  useEffect(() => {
    if (!config.glass_type || !config.thickness || !config.width_inches || !config.height_inches) return;
    const timer = setTimeout(() => calculatePrice(), 500);
    return () => clearTimeout(timer);
  }, [config]);

  const calculatePrice = async () => {
    if (!config.glass_type || !config.thickness || !config.width_inches || !config.height_inches) return;
    
    setCalculating(true);
    setError('');
    try {
      const payload = {
        ...config,
        width_inches: parseFloat(config.width_inches),
        height_inches: parseFloat(config.height_inches),
        quantity: parseInt(config.quantity) || 1,
        holes_count: parseInt(config.holes_count) || 0,
        customer_id: customerId
      };
      const res = await api.post('/api/cpq/calculate', payload);
      setResult(res.data);
      if (onPriceCalculated) {
        onPriceCalculated(res.data);
      }
    } catch (err) {
      setError('Calculation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setCalculating(false);
    }
  };

  const updateConfig = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const addCutout = () => {
    setConfig(prev => ({
      ...prev,
      cutouts: [...prev.cutouts, { type: 'Standard Cutout', quantity: 1 }]
    }));
  };

  const removeCutout = (index) => {
    setConfig(prev => ({
      ...prev,
      cutouts: prev.cutouts.filter((_, i) => i !== index)
    }));
  };

  const addNotch = () => {
    setConfig(prev => ({
      ...prev,
      notches: [...prev.notches, { type: 'Standard Hinge Notch', quantity: 1 }]
    }));
  };

  const removeNotch = (index) => {
    setConfig(prev => ({
      ...prev,
      notches: prev.notches.filter((_, i) => i !== index)
    }));
  };

  if (loading) return <div className="cpq-loading">Loading configurator...</div>;

  return (
    <div className="glass-configurator">
      <div className="cpq-header">
        <h3>Glass Configurator (CPQ)</h3>
        {calculating && <span className="cpq-calculating">Calculating...</span>}
      </div>

      {error && <div className="cpq-error">{error}</div>}

      <div className="cpq-grid">
        {/* Row 1: Glass Type & Thickness */}
        <div className="cpq-section">
          <h4>Glass Specification</h4>
          <div className="cpq-row">
            <div className="cpq-field">
              <label>Glass Type *</label>
              <select value={config.glass_type} onChange={e => updateConfig('glass_type', e.target.value)}>
                <option value="">Select Glass Type</option>
                {options?.glass_types?.map(gt => (
                  <option key={gt} value={gt}>{gt}</option>
                ))}
              </select>
            </div>
            <div className="cpq-field">
              <label>Thickness *</label>
              <select value={config.thickness} onChange={e => updateConfig('thickness', e.target.value)}>
                <option value="">Select Thickness</option>
                {options?.thicknesses?.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="cpq-field">
              <label>Shape</label>
              <select value={config.shape} onChange={e => updateConfig('shape', e.target.value)}>
                {options?.shapes?.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Dimensions */}
        <div className="cpq-section">
          <h4>Dimensions</h4>
          <div className="cpq-row">
            <div className="cpq-field">
              <label>Width (inches) *</label>
              <input type="number" step="0.125" min="1" value={config.width_inches}
                onChange={e => updateConfig('width_inches', e.target.value)}
                placeholder="e.g., 48" />
            </div>
            <div className="cpq-field">
              <label>Height (inches) *</label>
              <input type="number" step="0.125" min="1" value={config.height_inches}
                onChange={e => updateConfig('height_inches', e.target.value)}
                placeholder="e.g., 72" />
            </div>
            <div className="cpq-field">
              <label>Quantity</label>
              <input type="number" min="1" value={config.quantity}
                onChange={e => updateConfig('quantity', e.target.value)}
                placeholder="1" />
            </div>
            {result && (
              <div className="cpq-field cpq-computed">
                <label>Sq Ft</label>
                <span className="cpq-value">{result.sqft}</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Fabrication */}
        <div className="cpq-section">
          <h4>Fabrication</h4>
          <div className="cpq-row">
            <div className="cpq-field">
              <label>Edge Work</label>
              <select value={config.edge_type} onChange={e => updateConfig('edge_type', e.target.value)}>
                {options?.edge_types?.map(et => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>
            <div className="cpq-field">
              <label>Coating</label>
              <select value={config.coating} onChange={e => updateConfig('coating', e.target.value)}>
                {options?.coatings?.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="cpq-field cpq-checkbox">
              <label>
                <input type="checkbox" checked={config.is_tempered}
                  onChange={e => updateConfig('is_tempered', e.target.checked)} />
                Tempered
              </label>
            </div>
          </div>

          {/* Holes */}
          <div className="cpq-row">
            <div className="cpq-field cpq-checkbox">
              <label>
                <input type="checkbox" checked={config.has_holes}
                  onChange={e => updateConfig('has_holes', e.target.checked)} />
                Has Holes
              </label>
            </div>
            {config.has_holes && (
              <>
                <div className="cpq-field">
                  <label>Hole Count</label>
                  <input type="number" min="1" value={config.holes_count}
                    onChange={e => updateConfig('holes_count', e.target.value)} />
                </div>
                <div className="cpq-field">
                  <label>Hole Type</label>
                  <select value={config.hole_type} onChange={e => updateConfig('hole_type', e.target.value)}>
                    {options?.hole_types?.map(ht => (
                      <option key={ht} value={ht}>{ht}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Cutouts */}
          <div className="cpq-subsection">
            <div className="cpq-subsection-header">
              <span>Cutouts</span>
              <button type="button" className="cpq-add-btn" onClick={addCutout}>+ Add Cutout</button>
            </div>
            {config.cutouts.map((cutout, i) => (
              <div key={i} className="cpq-row cpq-inline-item">
                <select value={cutout.type} onChange={e => {
                  const updated = [...config.cutouts];
                  updated[i].type = e.target.value;
                  updateConfig('cutouts', updated);
                }}>
                  <option value="Standard Cutout">Standard Cutout</option>
                  <option value="Radius Corner Cutout">Radius Corner Cutout</option>
                </select>
                <input type="number" min="1" value={cutout.quantity} onChange={e => {
                  const updated = [...config.cutouts];
                  updated[i].quantity = parseInt(e.target.value) || 1;
                  updateConfig('cutouts', updated);
                }} style={{ width: '60px' }} />
                <button type="button" className="cpq-remove-btn" onClick={() => removeCutout(i)}>×</button>
              </div>
            ))}
          </div>

          {/* Notches */}
          <div className="cpq-subsection">
            <div className="cpq-subsection-header">
              <span>Notches</span>
              <button type="button" className="cpq-add-btn" onClick={addNotch}>+ Add Notch</button>
            </div>
            {config.notches.map((notch, i) => (
              <div key={i} className="cpq-row cpq-inline-item">
                <select value={notch.type} onChange={e => {
                  const updated = [...config.notches];
                  updated[i].type = e.target.value;
                  updateConfig('notches', updated);
                }}>
                  <option value="Standard Hinge Notch">Standard Hinge Notch</option>
                  <option value="U-Channel Notch">U-Channel Notch</option>
                </select>
                <input type="number" min="1" value={notch.quantity} onChange={e => {
                  const updated = [...config.notches];
                  updated[i].quantity = parseInt(e.target.value) || 1;
                  updateConfig('notches', updated);
                }} style={{ width: '60px' }} />
                <button type="button" className="cpq-remove-btn" onClick={() => removeNotch(i)}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Result */}
      {result && (
        <div className="cpq-result">
          <div className="cpq-result-header">
            <h4>Price Breakdown</h4>
            {result.min_charge_applied && <span className="cpq-badge cpq-badge-warn">Min Charge Applied</span>}
            {result.quantity_discount_percent > 0 && <span className="cpq-badge cpq-badge-success">Volume Discount: {result.quantity_discount_percent}%</span>}
          </div>

          <div className="cpq-result-grid">
            <div className="cpq-result-item">
              <span className="cpq-result-label">Glass ({result.sqft} sqft × ${result.glass_price_per_sqft}/sqft)</span>
              <span className="cpq-result-value">${result.glass_cost.toFixed(2)}</span>
            </div>

            {result.fabrication_charges.map((fc, i) => (
              <div key={i} className="cpq-result-item cpq-result-fab">
                <span className="cpq-result-label">{fc.name}</span>
                <span className="cpq-result-value">${fc.cost.toFixed(2)}</span>
              </div>
            ))}

            <div className="cpq-result-item cpq-result-subtotal">
              <span className="cpq-result-label">Per Piece</span>
              <span className="cpq-result-value">${result.price_per_piece.toFixed(2)}</span>
            </div>

            <div className="cpq-result-item">
              <span className="cpq-result-label">× {result.quantity} pcs</span>
              <span className="cpq-result-value">${result.subtotal.toFixed(2)}</span>
            </div>

            {result.total_discount > 0 && (
              <div className="cpq-result-item cpq-result-discount">
                <span className="cpq-result-label">Discount</span>
                <span className="cpq-result-value">-${result.total_discount.toFixed(2)}</span>
              </div>
            )}

            <div className="cpq-result-item cpq-result-total">
              <span className="cpq-result-label">Line Total</span>
              <span className="cpq-result-value">${result.line_total.toFixed(2)}</span>
            </div>

            <div className="cpq-result-item cpq-result-margin">
              <span className="cpq-result-label">Margin</span>
              <span className={`cpq-result-value ${result.margin_percent < 20 ? 'cpq-low-margin' : ''}`}>
                {result.margin_percent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
