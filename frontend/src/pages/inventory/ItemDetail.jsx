import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';

const TABS = ['General', 'Stock Status', 'Pricing/Discounts', 'Commission', 'Bill Of Materials', 'Routing', 'Co-Products', 'GL Accounts', 'Vendor', 'Customer', 'Dimensions', 'Documents', 'Manufacturer', 'Detailed Desc'];

function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [activeTab, setActiveTab] = useState('General');
  const [item, setItem] = useState({
    item_no: '', description: '', item_type: '', additional_info: '',
    qty_on_hand: 0, standard_cost: 0, avg_cost: 0, last_cost: 0,
    receipt_location: '', usage_location: '', item_group: '', item_master_group: '',
    bin: '', cycle_code: '', is_purchased: true, is_manufactured: false, is_sold: true, is_material: true,
    revision: '', drawing_no: '', unit_weight: 0, taxable: false, backorderable: true,
    exempt_commission: false, warranty: false, hazardous: false, linked_file: '',
    lot_control: false, serial_control: false, min_order_qty: 0, minimum_qty: 1,
    lead_time: 0, production_days: 0, production_qty: 0, include_forecast: false,
    qty_per_batch: 1, notes: '', internal_notes: '',
    // Glass specific
    glass_type: '', thickness: '', edge_type: '', tempering: '',
  });
  const [bomLines, setBomLines] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isNew) fetchItem();
  }, [id]);

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/inventory/items/${id}`);
      setItem(res.data);
      // Fetch BOM
      const bomRes = await api.get(`/api/manufacturing/bom/${id}`);
      setBomLines(bomRes.data || []);
    } catch (err) {
      toast.error('Failed to load item');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (isNew) {
        const res = await api.post('/api/inventory/items', item);
        toast.success('Item created');
        navigate(`/inventory/items/${res.data.id}`);
      } else {
        await api.put(`/api/inventory/items/${id}`, item);
        toast.success('Item saved');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    }
  };

  const updateField = (field, value) => setItem(prev => ({ ...prev, [field]: value }));

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Title Bar */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-1 flex justify-between items-center">
        <span className="font-bold text-sm">{isNew ? 'New Item' : item.description || item.item_no}</span>
        <div className="flex gap-2">
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={item.suspended || false} onChange={e => updateField('suspended', e.target.checked)} />
            Suspended
          </label>
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={item.read_only || false} onChange={e => updateField('read_only', e.target.checked)} />
            Read Only
          </label>
        </div>
      </div>

      {/* Header Fields */}
      <div className="bg-gray-200 border-b border-gray-400 p-2 grid grid-cols-4 gap-2 items-center">
        <div className="flex items-center gap-1">
          <label className="text-xs font-bold w-16">Item no.:</label>
          <input className="erp-form-input flex-1" value={item.item_no} onChange={e => updateField('item_no', e.target.value)} disabled={!isNew} />
        </div>
        <div className="flex items-center gap-1 col-span-2">
          <label className="text-xs font-bold w-16">Description:</label>
          <input className="erp-form-input flex-1" value={item.description} onChange={e => updateField('description', e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs font-bold w-16">Item Type:</label>
          <select className="erp-form-select flex-1" value={item.item_type} onChange={e => updateField('item_type', e.target.value)}>
            <option value="">Select...</option>
            <option value="Raw Glass">Raw Glass</option>
            <option value="Tempered Glass">Tempered Glass</option>
            <option value="Laminated Glass">Laminated Glass</option>
            <option value="Hardware">Hardware</option>
            <option value="Finished Good">Finished Good</option>
            <option value="Consumable">Consumable</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="erp-tabs overflow-x-auto">
        {TABS.map(tab => (
          <div key={tab} className={`erp-tab whitespace-nowrap ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'General' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Inv. Costing and Control */}
            <fieldset className="border border-gray-400 p-3">
              <legend className="text-xs font-bold px-1">Inv. Costing and Control</legend>
              <div className="space-y-2">
                <div className="erp-form-group"><label className="erp-form-label">Qty On Hand:</label><input className="erp-form-input" value={item.qty_on_hand} disabled /></div>
                <div className="erp-form-group"><label className="erp-form-label">Standard Cost:</label><input className="erp-form-input" value={item.standard_cost} onChange={e => updateField('standard_cost', e.target.value)} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Wgt Avg Cost:</label><input className="erp-form-input" value={item.avg_cost} disabled /></div>
                <div className="erp-form-group"><label className="erp-form-label">Last Cost:</label><input className="erp-form-input" value={item.last_cost} disabled /></div>
                <div className="erp-form-group"><label className="erp-form-label">Receipt Loc:</label>
                  <select className="erp-form-select" value={item.receipt_location} onChange={e => updateField('receipt_location', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="MAIN">MAIN</option>
                    <option value="WAREHOUSE">WAREHOUSE</option>
                    <option value="SHOP">SHOP</option>
                  </select>
                </div>
                <div className="erp-form-group"><label className="erp-form-label">Usage/Ship Loc:</label>
                  <select className="erp-form-select" value={item.usage_location} onChange={e => updateField('usage_location', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="MAIN">MAIN</option>
                    <option value="WAREHOUSE">WAREHOUSE</option>
                    <option value="SHOP">SHOP</option>
                  </select>
                </div>
                <div className="erp-form-group"><label className="erp-form-label">Item Group:</label><select className="erp-form-select" value={item.item_group} onChange={e => updateField('item_group', e.target.value)}><option value="">Select...</option></select></div>
                <div className="erp-form-group"><label className="erp-form-label">Bin:</label><input className="erp-form-input" value={item.bin || ''} onChange={e => updateField('bin', e.target.value)} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Cycle Code:</label><input className="erp-form-input" value={item.cycle_code || ''} onChange={e => updateField('cycle_code', e.target.value)} /></div>
                <div className="flex gap-4 mt-2 text-xs">
                  <label><input type="checkbox" checked={item.is_purchased} onChange={e => updateField('is_purchased', e.target.checked)} /> Purchased</label>
                  <label><input type="checkbox" checked={item.is_manufactured} onChange={e => updateField('is_manufactured', e.target.checked)} /> Manufactured</label>
                  <label><input type="checkbox" checked={item.is_sold} onChange={e => updateField('is_sold', e.target.checked)} /> Sold</label>
                  <label><input type="checkbox" checked={item.is_material} onChange={e => updateField('is_material', e.target.checked)} /> Material</label>
                </div>
              </div>
            </fieldset>

            {/* Other Settings */}
            <fieldset className="border border-gray-400 p-3">
              <legend className="text-xs font-bold px-1">Other Settings</legend>
              <div className="space-y-2">
                <div className="erp-form-group"><label className="erp-form-label">Revision:</label><input className="erp-form-input" value={item.revision || ''} onChange={e => updateField('revision', e.target.value)} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Drawing No.:</label><input className="erp-form-input" value={item.drawing_no || ''} onChange={e => updateField('drawing_no', e.target.value)} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Unit Weight:</label><input className="erp-form-input" value={item.unit_weight || ''} onChange={e => updateField('unit_weight', e.target.value)} /></div>
                <div className="space-y-1 mt-3 text-xs">
                  <label className="block"><input type="checkbox" checked={item.taxable} onChange={e => updateField('taxable', e.target.checked)} /> Taxable</label>
                  <label className="block"><input type="checkbox" checked={item.backorderable} onChange={e => updateField('backorderable', e.target.checked)} /> Backorderable</label>
                  <label className="block"><input type="checkbox" checked={item.exempt_commission} onChange={e => updateField('exempt_commission', e.target.checked)} /> Exempt from Commission</label>
                  <label className="block"><input type="checkbox" checked={item.warranty} onChange={e => updateField('warranty', e.target.checked)} /> Warranty</label>
                  <label className="block"><input type="checkbox" checked={item.hazardous} onChange={e => updateField('hazardous', e.target.checked)} /> Hazardous Material</label>
                </div>
                <div className="erp-form-group mt-3"><label className="erp-form-label">Linked File:</label><input className="erp-form-input" value={item.linked_file || ''} onChange={e => updateField('linked_file', e.target.value)} /></div>
              </div>
            </fieldset>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Lot and Serial */}
              <fieldset className="border border-gray-400 p-3">
                <legend className="text-xs font-bold px-1">Lot and Serial</legend>
                <div className="space-y-1 text-xs">
                  <label className="block"><input type="checkbox" checked={item.lot_control} onChange={e => updateField('lot_control', e.target.checked)} /> Lot Control</label>
                  <label className="block"><input type="checkbox" checked={item.serial_control} onChange={e => updateField('serial_control', e.target.checked)} /> Serial Control</label>
                </div>
              </fieldset>

              {/* MRP */}
              <fieldset className="border border-gray-400 p-3">
                <legend className="text-xs font-bold px-1">MRP</legend>
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Min Ord Qty:</label><input className="erp-form-input" value={item.min_order_qty || ''} onChange={e => updateField('min_order_qty', e.target.value)} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Minimum Qty:</label><input className="erp-form-input" value={item.minimum_qty || ''} onChange={e => updateField('minimum_qty', e.target.value)} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Lead Time:</label><input className="erp-form-input" value={item.lead_time || ''} onChange={e => updateField('lead_time', e.target.value)} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Production Days:</label><input className="erp-form-input" value={item.production_days || ''} onChange={e => updateField('production_days', e.target.value)} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Production Qty:</label><input className="erp-form-input" value={item.production_qty || ''} onChange={e => updateField('production_qty', e.target.value)} /></div>
                  <label className="text-xs"><input type="checkbox" checked={item.include_forecast} onChange={e => updateField('include_forecast', e.target.checked)} /> Include in Forecast</label>
                </div>
              </fieldset>

              {/* Batch Size */}
              <fieldset className="border border-gray-400 p-3">
                <legend className="text-xs font-bold px-1">Batch Size</legend>
                <div className="erp-form-group"><label className="erp-form-label">Qty per Batch:</label><input className="erp-form-input" value={item.qty_per_batch || 1} onChange={e => updateField('qty_per_batch', e.target.value)} /></div>
              </fieldset>

              {/* Glass Specific */}
              <fieldset className="border border-gray-400 p-3">
                <legend className="text-xs font-bold px-1">Glass Properties</legend>
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Glass Type:</label>
                    <select className="erp-form-select" value={item.glass_type || ''} onChange={e => updateField('glass_type', e.target.value)}>
                      <option value="">N/A</option>
                      <option value="Clear">Clear</option>
                      <option value="Low-Iron">Low-Iron</option>
                      <option value="Tinted">Tinted</option>
                      <option value="Frosted">Frosted</option>
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Thickness:</label>
                    <select className="erp-form-select" value={item.thickness || ''} onChange={e => updateField('thickness', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="3/8">3/8"</option>
                      <option value="1/2">1/2"</option>
                      <option value="5/8">5/8"</option>
                      <option value="3/4">3/4"</option>
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Edge Type:</label>
                    <select className="erp-form-select" value={item.edge_type || ''} onChange={e => updateField('edge_type', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="Flat Polish">Flat Polish</option>
                      <option value="Pencil Polish">Pencil Polish</option>
                      <option value="Beveled">Beveled</option>
                      <option value="Seamed">Seamed</option>
                    </select>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>
        )}

        {activeTab === 'Bill Of Materials' && (
          <div>
            <div className="erp-toolbar mb-2">
              <button className="erp-toolbar-btn"><span className="text-green-600">+</span> Add Item</button>
              <button className="erp-toolbar-btn">Swap Item</button>
              <div className="erp-toolbar-separator" />
              <span className="text-xs">Item No:</span>
              <input className="erp-form-input w-32 ml-1" />
            </div>
            <table className="erp-grid">
              <thead>
                <tr>
                  <th>Seq</th>
                  <th>Item No.</th>
                  <th>Description</th>
                  <th>Qty Per</th>
                  <th>Waste %</th>
                  <th>Total Qty</th>
                  <th>UOM</th>
                  <th>Operation</th>
                </tr>
              </thead>
              <tbody>
                {bomLines.length === 0 ? (
                  <tr><td colSpan="8" className="text-center p-4 text-gray-500">No BOM lines. Click "Add Item" to add components.</td></tr>
                ) : bomLines.map((line, i) => (
                  <tr key={i}>
                    <td>{line.sequence || i + 1}</td>
                    <td className="text-blue-700">{line.component_item_no}</td>
                    <td>{line.description}</td>
                    <td className="text-right">{line.qty_per}</td>
                    <td className="text-right">{line.waste_percent}%</td>
                    <td className="text-right">{line.total_qty}</td>
                    <td>{line.uom}</td>
                    <td>{line.operation || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Stock Status' && (
          <div>
            <table className="erp-grid">
              <thead>
                <tr><th>Location</th><th>On Hand</th><th>Allocated</th><th>Available</th><th>On Order</th></tr>
              </thead>
              <tbody>
                <tr><td>MAIN</td><td className="text-right">{item.qty_on_hand || 0}</td><td className="text-right">0</td><td className="text-right">{item.qty_on_hand || 0}</td><td className="text-right">0</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'Pricing/Discounts' && (
          <div>
            <fieldset className="border border-gray-400 p-3 mb-4">
              <legend className="text-xs font-bold px-1">Glass Dimensional Pricing (per sqft)</legend>
              <div className="grid grid-cols-3 gap-4">
                <div className="erp-form-group"><label className="erp-form-label">Full Sheet:</label><input className="erp-form-input" placeholder="$0.00/sqft" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Half Sheet:</label><input className="erp-form-input" placeholder="$0.00/sqft" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Custom Cut:</label><input className="erp-form-input" placeholder="$0.00/sqft" /></div>
              </div>
            </fieldset>
            <table className="erp-grid">
              <thead>
                <tr><th>Price List</th><th>Price</th><th>UOM</th><th>Min Qty</th><th>Max Qty</th></tr>
              </thead>
              <tbody>
                <tr><td colSpan="5" className="text-center p-4 text-gray-500">No pricing rules configured</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {!['General', 'Bill Of Materials', 'Stock Status', 'Pricing/Discounts'].includes(activeTab) && (
          <div className="text-center text-gray-500 p-8">
            <p className="text-sm">{activeTab} tab content</p>
            <p className="text-xs mt-2">Configure {activeTab.toLowerCase()} settings for this item</p>
          </div>
        )}
      </div>

      {/* Notes Section */}
      {activeTab === 'General' && (
        <div className="border-t border-gray-400 p-2 bg-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold">Notes:</label>
              <textarea className="erp-form-input w-full h-16 resize-none" value={item.notes || ''} onChange={e => updateField('notes', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold">Internal Notes:</label>
              <textarea className="erp-form-input w-full h-16 resize-none" value={item.internal_notes || ''} onChange={e => updateField('internal_notes', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="bg-gray-200 border-t border-gray-400 p-2 flex justify-between items-center">
        <div className="flex gap-1">
          {['Where Used', 'SO Quotes', 'Sales Orders', 'AR Invoices', 'PO Quotes', 'Purchase Ord', 'PO Receipts', 'WO Receipts', 'WO Issues', 'MRP by Location'].map(btn => (
            <button key={btn} className="erp-btn text-xs">{btn}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="erp-btn erp-btn-primary" onClick={handleSave}>OK</button>
          <button className="erp-btn" onClick={() => navigate('/inventory/items')}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default ItemDetail;
