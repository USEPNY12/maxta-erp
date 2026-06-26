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
    item_number: '', description: '', item_type: '', additional_info: '',
    qty_on_hand: 0, standard_cost: 0, weighted_avg_cost: 0, last_cost: 0,
    receipt_location_id: '', shipping_location_id: '', item_group: '', item_master_group: '',
    bin: '', cycle_code: '', is_purchased: true, is_manufactured: false, is_sold: true, is_material: true,
    revision: '', drawing_number: '', unit_weight: 0, is_taxable: false, is_backorderable: true,
    exempt_from_commission: false, has_warranty: false, is_hazardous: false,
    lot_control: false, serial_control: false, min_order_qty: 0, minimum_qty: 1,
    lead_time_days: 0, production_days: 0, production_qty: 0, include_in_forecast: false,
    batch_size: 1, notes: '', internal_notes: '',
    glass_type: '', glass_thickness: '', edge_type: '', tempering_status: '', pricing_method: 'per_unit',
  });
  const [loading, setLoading] = useState(false);
  // Tab data states
  const [stockByLoc, setStockByLoc] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [bomData, setBomData] = useState({ bom: null, lines: [] });
  const [routingData, setRoutingData] = useState({ routing: null, operations: [] });
  const [vendors, setVendors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);
  const [dimensions, setDimensions] = useState([]);
  const [documents, setDocuments] = useState([]);
  // Lookup data
  const [lookupVendors, setLookupVendors] = useState([]);
  const [lookupCustomers, setLookupCustomers] = useState([]);
  const [lookupGLAccounts, setLookupGLAccounts] = useState([]);
  const [lookupWorkCenters, setLookupWorkCenters] = useState([]);
  const [lookupItems, setLookupItems] = useState([]);
  const [lookupLocations, setLookupLocations] = useState([]);
  // Modal states
  const [showModal, setShowModal] = useState(null);
  const [modalData, setModalData] = useState({});
  // Inquiry modal
  const [inquiryModal, setInquiryModal] = useState(null);
  const [inquiryData, setInquiryData] = useState([]);
  const [inquiryLoading, setInquiryLoading] = useState(false);

  useEffect(() => {
    fetchLookups();
    if (!isNew) fetchItem();
  }, [id]);

  const fetchLookups = async () => {
    try {
      const [v, c, g, w, i, l] = await Promise.all([
        api.get('/api/inventory/lookup/vendors'),
        api.get('/api/inventory/lookup/customers'),
        api.get('/api/inventory/lookup/gl-accounts'),
        api.get('/api/inventory/lookup/work-centers'),
        api.get('/api/inventory/lookup/items'),
        api.get('/api/inventory/lookup/locations'),
      ]);
      setLookupVendors(v.data || []);
      setLookupCustomers(c.data || []);
      setLookupGLAccounts(g.data || []);
      setLookupWorkCenters(w.data || []);
      setLookupItems(i.data || []);
      setLookupLocations(l.data || []);
    } catch (err) { console.error('Lookup fetch error', err); }
  };

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/inventory/items/${id}`);
      setItem(res.data);
    } catch (err) { toast.error('Failed to load item'); }
    setLoading(false);
  };

  const fetchTabData = async (tab) => {
    if (isNew) return;
    try {
      switch (tab) {
        case 'Stock Status':
          const sl = await api.get(`/api/inventory/items/${id}/stock-by-location`);
          setStockByLoc(sl.data || []);
          break;
        case 'Pricing/Discounts':
          const pr = await api.get(`/api/inventory/items/${id}/pricing`);
          setPricing(pr.data || []);
          break;
        case 'Bill Of Materials':
          const bm = await api.get(`/api/inventory/items/${id}/bom`);
          setBomData(bm.data || { bom: null, lines: [] });
          break;
        case 'Routing':
          const rt = await api.get(`/api/inventory/items/${id}/routing`);
          setRoutingData(rt.data || { routing: null, operations: [] });
          break;
        case 'Vendor':
          const vn = await api.get(`/api/inventory/items/${id}/vendors`);
          setVendors(vn.data || []);
          break;
        case 'Customer':
          const cu = await api.get(`/api/inventory/items/${id}/customers`);
          setCustomers(cu.data || []);
          break;
        case 'GL Accounts':
          const gl = await api.get(`/api/inventory/items/${id}/gl-accounts`);
          setGlAccounts(gl.data || []);
          break;
        case 'Dimensions':
          const dm = await api.get(`/api/inventory/items/${id}/dimensions`);
          setDimensions(dm.data || []);
          break;
        case 'Documents':
          const dc = await api.get(`/api/inventory/items/${id}/documents`);
          setDocuments(dc.data || []);
          break;
      }
    } catch (err) { console.error('Tab data fetch error', err); }
  };

  useEffect(() => { fetchTabData(activeTab); }, [activeTab, id]);

  const handleSave = async () => {
    try {
      const payload = { ...item };
      delete payload.pricing; delete payload.vendors; delete payload.bom;
      delete payload.lots; delete payload.serials; delete payload.item_type_name;
      if (isNew) {
        const res = await api.post('/api/inventory/items', payload);
        toast.success('Item created');
        navigate(`/inventory/items/${res.data.id}`);
      } else {
        await api.put(`/api/inventory/items/${id}`, payload);
        toast.success('Item saved');
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
  };

  const updateField = (field, value) => setItem(prev => ({ ...prev, [field]: value }));

  const openModal = (type, data = {}) => { setShowModal(type); setModalData(data); };
  const closeModal = () => { setShowModal(null); setModalData({}); };

  const handleModalSave = async () => {
    try {
      switch (showModal) {
        case 'vendor':
          await api.post(`/api/inventory/items/${id}/vendors`, modalData);
          toast.success('Vendor added');
          fetchTabData('Vendor');
          break;
        case 'customer':
          await api.post(`/api/inventory/items/${id}/customers`, modalData);
          toast.success('Customer added');
          fetchTabData('Customer');
          break;
        case 'pricing':
          await api.post(`/api/inventory/items/${id}/pricing`, modalData);
          toast.success('Price added');
          fetchTabData('Pricing/Discounts');
          break;
        case 'gl_account':
          await api.post(`/api/inventory/items/${id}/gl-accounts`, modalData);
          toast.success('GL Account saved');
          fetchTabData('GL Accounts');
          break;
        case 'dimension':
          await api.post(`/api/inventory/items/${id}/dimensions`, modalData);
          toast.success('Dimension added');
          fetchTabData('Dimensions');
          break;
        case 'document':
          await api.post(`/api/inventory/items/${id}/documents`, modalData);
          toast.success('Document added');
          fetchTabData('Documents');
          break;
        case 'bom_line':
          const bomLines = [...(bomData.lines || []), { ...modalData, sequence: (bomData.lines?.length || 0) + 1 }];
          await api.post(`/api/inventory/items/${id}/bom`, { revision: 'A', description: 'BOM', batch_size: item.batch_size || 1, lines: bomLines.map((l, i) => ({ ...l, sequence: i + 1 })) });
          toast.success('BOM updated');
          fetchTabData('Bill Of Materials');
          break;
        case 'routing_op':
          const ops = [...(routingData.operations || []), { ...modalData, sequence: (routingData.operations?.length || 0) + 1 }];
          await api.post(`/api/inventory/items/${id}/routing`, { revision: 'A', description: 'Routing', operations: ops.map((o, i) => ({ ...o, sequence: i + 1 })) });
          toast.success('Routing updated');
          fetchTabData('Routing');
          break;
      }
      closeModal();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
  };

  const handleDelete = async (type, deleteId) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.delete(`/api/inventory/items/${id}/${type}/${deleteId}`);
      toast.success('Deleted');
      fetchTabData(activeTab);
    } catch (err) { toast.error('Failed to delete'); }
  };

  const handleInquiry = async (key, label) => {
    if (isNew) { toast.info('Save the item first'); return; }
    setInquiryModal(label);
    setInquiryLoading(true);
    try {
      const res = await api.get(`/api/inventory/items/${id}/inquiry/${key}`);
      const data = key === 'mrp-by-location' ? (res.data.stock || []) : (Array.isArray(res.data) ? res.data : []);
      setInquiryData(data);
    } catch (err) { setInquiryData([]); toast.error('Failed to load inquiry data'); }
    setInquiryLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full">Loading...</div>;

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Title Bar */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-1 flex justify-between items-center">
        <span className="font-bold text-sm">{isNew ? 'New Item' : `${item.item_number} - ${item.description}`}</span>
        <div className="flex gap-2">
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={item.is_suspended || false} onChange={e => updateField('is_suspended', e.target.checked)} /> Suspended
          </label>
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={item.read_only || false} onChange={e => updateField('read_only', e.target.checked)} /> Read Only
          </label>
        </div>
      </div>

      {/* Header Fields */}
      <div className="bg-gray-200 border-b border-gray-400 p-2 grid grid-cols-4 gap-2 items-center">
        <div className="flex items-center gap-1">
          <label className="text-xs font-bold w-16">Item No.:</label>
          <input className="erp-form-input flex-1" value={item.item_number || ''} onChange={e => updateField('item_number', e.target.value)} disabled={!isNew} />
        </div>
        <div className="flex items-center gap-1 col-span-2">
          <label className="text-xs font-bold w-16">Description:</label>
          <input className="erp-form-input flex-1" value={item.description || ''} onChange={e => updateField('description', e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs font-bold w-16">Item Type:</label>
          <select className="erp-form-select flex-1" value={item.item_type || ''} onChange={e => updateField('item_type', e.target.value)}>
            <option value="">Select...</option>
            <option value="Raw Glass">Raw Glass</option>
            <option value="Tempered Glass">Tempered Glass</option>
            <option value="Laminated Glass">Laminated Glass</option>
            <option value="IGU">IGU</option>
            <option value="Hardware">Hardware</option>
            <option value="Finished Good">Finished Good</option>
            <option value="Consumable">Consumable</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="erp-tabs overflow-x-auto whitespace-nowrap">
        {TABS.map(tab => (
          <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-3">
        {/* ===== GENERAL TAB ===== */}
        {activeTab === 'General' && (
          <div className="grid grid-cols-3 gap-4">
            <fieldset className="border border-gray-400 p-3">
              <legend className="text-xs font-bold px-1">Inv. Costing and Control</legend>
              <div className="space-y-1">
                <div className="erp-form-group"><label className="erp-form-label">Qty On Hand:</label><input className="erp-form-input" value={item.qty_on_hand || 0} disabled /></div>
                <div className="erp-form-group"><label className="erp-form-label">Standard Cost:</label><input className="erp-form-input" value={item.standard_cost || ''} onChange={e => updateField('standard_cost', e.target.value)} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Wgt Avg Cost:</label><input className="erp-form-input" value={item.weighted_avg_cost || 0} disabled /></div>
                <div className="erp-form-group"><label className="erp-form-label">Last Cost:</label><input className="erp-form-input" value={item.last_cost || 0} disabled /></div>
                <div className="erp-form-group"><label className="erp-form-label">Receipt Loc:</label>
                  <select className="erp-form-select" value={item.receipt_location_id || ''} onChange={e => updateField('receipt_location_id', e.target.value)}>
                    <option value="">Select...</option>
                    {lookupLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="erp-form-group"><label className="erp-form-label">Ship/Usage Loc:</label>
                  <select className="erp-form-select" value={item.shipping_location_id || ''} onChange={e => updateField('shipping_location_id', e.target.value)}>
                    <option value="">Select...</option>
                    {lookupLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="erp-form-group"><label className="erp-form-label">Bin:</label><input className="erp-form-input" value={item.bin || ''} onChange={e => updateField('bin', e.target.value)} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Pricing Method:</label>
                  <select className="erp-form-select" value={item.pricing_method || 'per_unit'} onChange={e => updateField('pricing_method', e.target.value)}>
                    <option value="per_unit">Per Unit</option>
                    <option value="per_sqft">Per Sq Ft</option>
                    <option value="per_linear_ft">Per Linear Ft</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-2 text-xs flex-wrap">
                  <label><input type="checkbox" checked={!!item.is_purchased} onChange={e => updateField('is_purchased', e.target.checked)} /> Purchased</label>
                  <label><input type="checkbox" checked={!!item.is_manufactured} onChange={e => updateField('is_manufactured', e.target.checked)} /> Manufactured</label>
                  <label><input type="checkbox" checked={!!item.is_sold} onChange={e => updateField('is_sold', e.target.checked)} /> Sold</label>
                  <label><input type="checkbox" checked={!!item.is_material} onChange={e => updateField('is_material', e.target.checked)} /> Material</label>
                </div>
              </div>
            </fieldset>

            <fieldset className="border border-gray-400 p-3">
              <legend className="text-xs font-bold px-1">Other Settings</legend>
              <div className="space-y-1">
                <div className="erp-form-group"><label className="erp-form-label">Revision:</label><input className="erp-form-input" value={item.revision || ''} onChange={e => updateField('revision', e.target.value)} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Drawing No.:</label><input className="erp-form-input" value={item.drawing_number || ''} onChange={e => updateField('drawing_number', e.target.value)} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Unit Weight:</label><input className="erp-form-input" value={item.unit_weight || ''} onChange={e => updateField('unit_weight', e.target.value)} /></div>
                <div className="space-y-1 mt-2 text-xs">
                  <label className="block"><input type="checkbox" checked={!!item.is_taxable} onChange={e => updateField('is_taxable', e.target.checked)} /> Taxable</label>
                  <label className="block"><input type="checkbox" checked={!!item.is_backorderable} onChange={e => updateField('is_backorderable', e.target.checked)} /> Backorderable</label>
                  <label className="block"><input type="checkbox" checked={!!item.exempt_from_commission} onChange={e => updateField('exempt_from_commission', e.target.checked)} /> Exempt from Commission</label>
                  <label className="block"><input type="checkbox" checked={!!item.has_warranty} onChange={e => updateField('has_warranty', e.target.checked)} /> Warranty</label>
                  <label className="block"><input type="checkbox" checked={!!item.is_hazardous} onChange={e => updateField('is_hazardous', e.target.checked)} /> Hazardous Material</label>
                </div>
              </div>
            </fieldset>

            <div className="space-y-3">
              <fieldset className="border border-gray-400 p-3">
                <legend className="text-xs font-bold px-1">Lot and Serial</legend>
                <div className="space-y-1 text-xs">
                  <label className="block"><input type="checkbox" checked={!!item.lot_control} onChange={e => updateField('lot_control', e.target.checked)} /> Lot Control</label>
                  <label className="block"><input type="checkbox" checked={!!item.serial_control} onChange={e => updateField('serial_control', e.target.checked)} /> Serial Control</label>
                </div>
              </fieldset>
              <fieldset className="border border-gray-400 p-3">
                <legend className="text-xs font-bold px-1">MRP</legend>
                <div className="space-y-1">
                  <div className="erp-form-group"><label className="erp-form-label">Min Ord Qty:</label><input className="erp-form-input" value={item.min_order_qty || ''} onChange={e => updateField('min_order_qty', e.target.value)} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Minimum Qty:</label><input className="erp-form-input" value={item.minimum_qty || ''} onChange={e => updateField('minimum_qty', e.target.value)} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Lead Time (days):</label><input className="erp-form-input" value={item.lead_time_days || ''} onChange={e => updateField('lead_time_days', e.target.value)} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Prod. Days:</label><input className="erp-form-input" value={item.production_days || ''} onChange={e => updateField('production_days', e.target.value)} /></div>
                  <label className="text-xs"><input type="checkbox" checked={!!item.include_in_forecast} onChange={e => updateField('include_in_forecast', e.target.checked)} /> Include in Forecast</label>
                </div>
              </fieldset>
              <fieldset className="border border-gray-400 p-3">
                <legend className="text-xs font-bold px-1">Glass Properties</legend>
                <div className="space-y-1">
                  <div className="erp-form-group"><label className="erp-form-label">Glass Type:</label>
                    <select className="erp-form-select" value={item.glass_type || ''} onChange={e => updateField('glass_type', e.target.value)}>
                      <option value="">N/A</option><option value="clear">Clear</option><option value="low_e">Low-E</option><option value="tinted">Tinted</option><option value="frosted">Frosted</option><option value="mirror">Mirror</option><option value="laminated">Laminated</option>
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Thickness:</label>
                    <select className="erp-form-select" value={item.glass_thickness || ''} onChange={e => updateField('glass_thickness', e.target.value)}>
                      <option value="">Select...</option><option value="3mm">3mm</option><option value="4mm">4mm</option><option value="5mm">5mm</option><option value="6mm">6mm</option><option value="8mm">8mm</option><option value="10mm">10mm</option><option value="12mm">12mm</option><option value="3/8">3/8"</option><option value="1/2">1/2"</option><option value="5/8">5/8"</option><option value="3/4">3/4"</option>
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Edge Type:</label>
                    <select className="erp-form-select" value={item.edge_type || ''} onChange={e => updateField('edge_type', e.target.value)}>
                      <option value="">Select...</option><option value="flat_polish">Flat Polish</option><option value="pencil_polish">Pencil Polish</option><option value="beveled">Beveled</option><option value="seamed">Seamed</option><option value="raw">Raw</option>
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Tempering:</label>
                    <select className="erp-form-select" value={item.tempering_status || ''} onChange={e => updateField('tempering_status', e.target.value)}>
                      <option value="">Select...</option><option value="annealed">Annealed</option><option value="tempered">Tempered</option><option value="heat_strengthened">Heat Strengthened</option><option value="laminated">Laminated</option>
                    </select>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>
        )}

        {/* ===== STOCK STATUS TAB ===== */}
        {activeTab === 'Stock Status' && (
          <div>
            <div className="mb-2 text-xs text-gray-600">Stock levels by location (from inventory transactions)</div>
            <table className="erp-grid">
              <thead><tr><th>Location</th><th>On Hand</th><th>Allocated</th><th>Available</th><th>On Order</th></tr></thead>
              <tbody>
                {stockByLoc.length === 0 ? (
                  <tr><td colSpan="5" className="text-center p-4 text-gray-500">No stock in any location{isNew ? ' (save item first)' : ''}</td></tr>
                ) : stockByLoc.map((s, i) => (
                  <tr key={i}>
                    <td>{s.location_name}</td>
                    <td className="text-right">{parseFloat(s.on_hand).toFixed(2)}</td>
                    <td className="text-right">{parseFloat(s.allocated || 0).toFixed(2)}</td>
                    <td className="text-right">{(parseFloat(s.on_hand) - parseFloat(s.allocated || 0)).toFixed(2)}</td>
                    <td className="text-right">{parseFloat(s.on_order || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {stockByLoc.length > 0 && (
                  <tr className="font-bold bg-gray-100">
                    <td>TOTAL</td>
                    <td className="text-right">{stockByLoc.reduce((s, r) => s + parseFloat(r.on_hand), 0).toFixed(2)}</td>
                    <td className="text-right">0.00</td>
                    <td className="text-right">{stockByLoc.reduce((s, r) => s + parseFloat(r.on_hand), 0).toFixed(2)}</td>
                    <td className="text-right">0.00</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== PRICING/DISCOUNTS TAB ===== */}
        {activeTab === 'Pricing/Discounts' && (
          <div>
            <div className="erp-toolbar mb-2">
              <button className="erp-toolbar-btn" onClick={() => openModal('pricing')} disabled={isNew}><span className="text-green-600">+</span> Add Price</button>
            </div>
            <table className="erp-grid">
              <thead><tr><th>Price List</th><th>Tier Type</th><th>Unit Price</th><th>Per SqFt</th><th>Min Qty</th><th>Max Qty</th><th>Min Charge</th><th>Actions</th></tr></thead>
              <tbody>
                {pricing.length === 0 ? (
                  <tr><td colSpan="8" className="text-center p-4 text-gray-500">No pricing rules. Click "Add Price" to configure.</td></tr>
                ) : pricing.map(p => (
                  <tr key={p.id}>
                    <td>{p.price_list}</td>
                    <td>{p.tier_type}</td>
                    <td className="text-right">${parseFloat(p.unit_price).toFixed(2)}</td>
                    <td className="text-right">{p.price_per_sqft ? '$' + parseFloat(p.price_per_sqft).toFixed(2) : '-'}</td>
                    <td className="text-right">{p.min_qty}</td>
                    <td className="text-right">{p.max_qty}</td>
                    <td className="text-right">{p.minimum_charge ? '$' + parseFloat(p.minimum_charge).toFixed(2) : '-'}</td>
                    <td><button className="text-red-600 text-xs" onClick={() => handleDelete('pricing', p.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== COMMISSION TAB ===== */}
        {activeTab === 'Commission' && (
          <div>
            <fieldset className="border border-gray-400 p-3 max-w-md">
              <legend className="text-xs font-bold px-1">Commission Settings</legend>
              <div className="space-y-2">
                <div className="erp-form-group"><label className="erp-form-label">Commission %:</label><input className="erp-form-input" placeholder="0.00" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Commission Type:</label>
                  <select className="erp-form-select"><option value="standard">Standard</option><option value="flat">Flat Rate</option><option value="tiered">Tiered</option></select>
                </div>
                <label className="text-xs block"><input type="checkbox" checked={!!item.exempt_from_commission} onChange={e => updateField('exempt_from_commission', e.target.checked)} /> Exempt from Commission</label>
              </div>
            </fieldset>
          </div>
        )}

        {/* ===== BILL OF MATERIALS TAB ===== */}
        {activeTab === 'Bill Of Materials' && (
          <div>
            <div className="erp-toolbar mb-2">
              <button className="erp-toolbar-btn" onClick={() => openModal('bom_line')} disabled={isNew}><span className="text-green-600">+</span> Add Component</button>
              {bomData.bom && <span className="text-xs ml-4">Revision: {bomData.bom.revision} | Batch Size: {bomData.bom.batch_size}</span>}
            </div>
            <table className="erp-grid">
              <thead><tr><th>Seq</th><th>Item No.</th><th>Description</th><th>Qty Per</th><th>Waste %</th><th>UOM</th><th>Operation</th></tr></thead>
              <tbody>
                {(!bomData.lines || bomData.lines.length === 0) ? (
                  <tr><td colSpan="7" className="text-center p-4 text-gray-500">No BOM lines. Click "Add Component" to build the bill of materials.</td></tr>
                ) : bomData.lines.map((line, i) => (
                  <tr key={i}>
                    <td>{line.sequence}</td>
                    <td className="text-blue-700">{line.component_item_no || line.item_number}</td>
                    <td>{line.description}</td>
                    <td className="text-right">{line.quantity_per}</td>
                    <td className="text-right">{line.waste_percent}%</td>
                    <td>{line.uom || 'Each'}</td>
                    <td>{line.operation_sequence || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== ROUTING TAB ===== */}
        {activeTab === 'Routing' && (
          <div>
            <div className="erp-toolbar mb-2">
              <button className="erp-toolbar-btn" onClick={() => openModal('routing_op')} disabled={isNew}><span className="text-green-600">+</span> Add Operation</button>
              {routingData.routing && <span className="text-xs ml-4">Revision: {routingData.routing.revision}</span>}
            </div>
            <table className="erp-grid">
              <thead><tr><th>Seq</th><th>Work Center</th><th>Description</th><th>Setup (hrs)</th><th>Run (hrs)</th><th>Subcontract</th></tr></thead>
              <tbody>
                {(!routingData.operations || routingData.operations.length === 0) ? (
                  <tr><td colSpan="6" className="text-center p-4 text-gray-500">No routing operations. Click "Add Operation" to define the production routing.</td></tr>
                ) : routingData.operations.map((op, i) => (
                  <tr key={i}>
                    <td>{op.sequence}</td>
                    <td className="text-blue-700">{op.work_center_name}</td>
                    <td>{op.operation_description}</td>
                    <td className="text-right">{parseFloat(op.setup_time_hours).toFixed(2)}</td>
                    <td className="text-right">{parseFloat(op.run_time_hours).toFixed(2)}</td>
                    <td className="text-center">{op.is_subcontract ? 'Yes' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== CO-PRODUCTS TAB ===== */}
        {activeTab === 'Co-Products' && (
          <div>
            <div className="erp-toolbar mb-2">
              <button className="erp-toolbar-btn" disabled><span className="text-green-600">+</span> Add Co-Product</button>
            </div>
            <table className="erp-grid">
              <thead><tr><th>Item No.</th><th>Description</th><th>Yield %</th><th>Cost Allocation %</th></tr></thead>
              <tbody><tr><td colSpan="4" className="text-center p-4 text-gray-500">No co-products defined. Co-products are by-products generated during manufacturing (e.g., glass offcuts).</td></tr></tbody>
            </table>
          </div>
        )}

        {/* ===== GL ACCOUNTS TAB ===== */}
        {activeTab === 'GL Accounts' && (
          <div>
            <div className="text-xs text-gray-600 mb-3">Assign GL accounts for automatic posting when this item is involved in transactions.</div>
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              {['inventory', 'cogs', 'revenue', 'purchase_variance', 'production_variance'].map(acctType => {
                const existing = glAccounts.find(g => g.account_type === acctType);
                return (
                  <div key={acctType} className="erp-form-group">
                    <label className="erp-form-label capitalize">{acctType.replace(/_/g, ' ')}:</label>
                    <select className="erp-form-select" value={existing?.gl_account_id || ''} disabled={isNew}
                      onChange={e => { if (e.target.value) { api.post(`/api/inventory/items/${id}/gl-accounts`, { account_type: acctType, gl_account_id: e.target.value }).then(() => { toast.success('Saved'); fetchTabData('GL Accounts'); }); } }}>
                      <option value="">Select Account...</option>
                      {lookupGLAccounts.map(g => <option key={g.id} value={g.id}>{g.account_number} - {g.account_name}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== VENDOR TAB ===== */}
        {activeTab === 'Vendor' && (
          <div>
            <div className="erp-toolbar mb-2">
              <button className="erp-toolbar-btn" onClick={() => openModal('vendor')} disabled={isNew}><span className="text-green-600">+</span> Add Vendor</button>
            </div>
            <table className="erp-grid">
              <thead><tr><th>Vendor</th><th>Vendor Item #</th><th>Description</th><th>Unit Cost</th><th>Lead Time</th><th>Min Qty</th><th>Preferred</th><th>Actions</th></tr></thead>
              <tbody>
                {vendors.length === 0 ? (
                  <tr><td colSpan="8" className="text-center p-4 text-gray-500">No vendors assigned. Click "Add Vendor" to link suppliers.</td></tr>
                ) : vendors.map(v => (
                  <tr key={v.id}>
                    <td className="text-blue-700">{v.vendor_name}</td>
                    <td>{v.vendor_item_number}</td>
                    <td>{v.vendor_description}</td>
                    <td className="text-right">${parseFloat(v.unit_cost || 0).toFixed(2)}</td>
                    <td className="text-right">{v.lead_time_days} days</td>
                    <td className="text-right">{v.min_order_qty}</td>
                    <td className="text-center">{v.is_preferred ? '★' : ''}</td>
                    <td><button className="text-red-600 text-xs" onClick={() => handleDelete('vendors', v.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== CUSTOMER TAB ===== */}
        {activeTab === 'Customer' && (
          <div>
            <div className="erp-toolbar mb-2">
              <button className="erp-toolbar-btn" onClick={() => openModal('customer')} disabled={isNew}><span className="text-green-600">+</span> Add Customer</button>
            </div>
            <table className="erp-grid">
              <thead><tr><th>Customer</th><th>Customer Item #</th><th>Description</th><th>Unit Price</th><th>Min Qty</th><th>Preferred</th><th>Actions</th></tr></thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr><td colSpan="7" className="text-center p-4 text-gray-500">No customers assigned. Click "Add Customer" to link buyers.</td></tr>
                ) : customers.map(c => (
                  <tr key={c.id}>
                    <td className="text-blue-700">{c.customer_name}</td>
                    <td>{c.customer_item_number}</td>
                    <td>{c.customer_description}</td>
                    <td className="text-right">${parseFloat(c.unit_price || 0).toFixed(2)}</td>
                    <td className="text-right">{c.min_order_qty}</td>
                    <td className="text-center">{c.is_preferred ? '★' : ''}</td>
                    <td><button className="text-red-600 text-xs" onClick={() => handleDelete('customers', c.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== DIMENSIONS TAB ===== */}
        {activeTab === 'Dimensions' && (
          <div>
            <div className="erp-toolbar mb-2">
              <button className="erp-toolbar-btn" onClick={() => openModal('dimension')} disabled={isNew}><span className="text-green-600">+</span> Add Dimension</button>
            </div>
            <table className="erp-grid">
              <thead><tr><th>Dimension Type</th><th>Value</th><th>UOM</th><th>Actions</th></tr></thead>
              <tbody>
                {dimensions.length === 0 ? (
                  <tr><td colSpan="4" className="text-center p-4 text-gray-500">No dimensions defined. Add width, height, length, area, etc.</td></tr>
                ) : dimensions.map(d => (
                  <tr key={d.id}>
                    <td>{d.dimension_type}</td>
                    <td className="text-right">{d.dimension_value}</td>
                    <td>{d.uom}</td>
                    <td><button className="text-red-600 text-xs" onClick={() => handleDelete('dimensions', d.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== DOCUMENTS TAB ===== */}
        {activeTab === 'Documents' && (
          <div>
            <div className="erp-toolbar mb-2">
              <button className="erp-toolbar-btn" onClick={() => openModal('document')} disabled={isNew}><span className="text-green-600">+</span> Add Document</button>
            </div>
            <table className="erp-grid">
              <thead><tr><th>Type</th><th>File Name</th><th>Description</th><th>Uploaded</th><th>Actions</th></tr></thead>
              <tbody>
                {documents.length === 0 ? (
                  <tr><td colSpan="5" className="text-center p-4 text-gray-500">No documents attached. Add drawings, spec sheets, MSDS, certificates, etc.</td></tr>
                ) : documents.map(d => (
                  <tr key={d.id}>
                    <td className="capitalize">{d.document_type?.replace(/_/g, ' ')}</td>
                    <td className="text-blue-700">{d.file_name}</td>
                    <td>{d.description}</td>
                    <td>{d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : ''}</td>
                    <td><button className="text-red-600 text-xs" onClick={() => handleDelete('documents', d.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== MANUFACTURER TAB ===== */}
        {activeTab === 'Manufacturer' && (
          <div>
            <fieldset className="border border-gray-400 p-3 max-w-lg">
              <legend className="text-xs font-bold px-1">Manufacturer Information</legend>
              <div className="space-y-2">
                <div className="erp-form-group"><label className="erp-form-label">Manufacturer:</label><input className="erp-form-input" placeholder="Enter manufacturer name" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Mfg Part No.:</label><input className="erp-form-input" placeholder="Manufacturer part number" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Country of Origin:</label><input className="erp-form-input" placeholder="e.g., USA, China" /></div>
                <div className="erp-form-group"><label className="erp-form-label">HS Code:</label><input className="erp-form-input" placeholder="Harmonized System code" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Certification:</label><input className="erp-form-input" placeholder="e.g., ANSI Z97.1, CPSC 16 CFR 1201" /></div>
              </div>
            </fieldset>
          </div>
        )}

        {/* ===== DETAILED DESC TAB ===== */}
        {activeTab === 'Detailed Desc' && (
          <div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Extended Description:</label>
                <textarea className="erp-form-input w-full h-24 resize-none" value={item.additional_info || ''} onChange={e => updateField('additional_info', e.target.value)} placeholder="Enter detailed product description, specifications, and features..." />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Technical Specifications:</label>
                <textarea className="erp-form-input w-full h-24 resize-none" placeholder="Enter technical specifications..." />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Application Notes:</label>
                <textarea className="erp-form-input w-full h-24 resize-none" placeholder="Enter application notes, usage instructions, or installation guidelines..." />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes Section (always visible at bottom for General tab) */}
      {activeTab === 'General' && (
        <div className="border-t border-gray-400 p-2 bg-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold">Notes:</label><textarea className="erp-form-input w-full h-14 resize-none" value={item.notes || ''} onChange={e => updateField('notes', e.target.value)} /></div>
            <div><label className="text-xs font-bold">Internal Notes:</label><textarea className="erp-form-input w-full h-14 resize-none" value={item.internal_notes || ''} onChange={e => updateField('internal_notes', e.target.value)} /></div>
          </div>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="bg-gray-200 border-t border-gray-400 p-2 flex justify-between items-center">
        <div className="flex gap-1 flex-wrap">
          {[{label:'Where Used',key:'where-used'},{label:'SO Quotes',key:'so-quotes'},{label:'Sales Orders',key:'sales-orders'},{label:'AR Invoices',key:'ar-invoices'},{label:'PO Quotes',key:'po-quotes'},{label:'Purchase Ord',key:'purchase-orders'},{label:'PO Receipts',key:'po-receipts'},{label:'WO Receipts',key:'wo-receipts'},{label:'WO Issues',key:'wo-issues'},{label:'MRP by Location',key:'mrp-by-location'}].map(btn => (
            <button key={btn.key} className="erp-btn text-xs" onClick={() => handleInquiry(btn.key, btn.label)}>{btn.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="erp-btn erp-btn-primary" onClick={handleSave}>OK</button>
          <button className="erp-btn" onClick={() => navigate('/inventory/items')}>Cancel</button>
        </div>
      </div>

      {/* ===== MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 w-96 max-h-[80vh] overflow-auto">
            <h3 className="font-bold text-sm mb-3 border-b pb-2">
              {showModal === 'vendor' && 'Add Vendor'}
              {showModal === 'customer' && 'Add Customer'}
              {showModal === 'pricing' && 'Add Price Rule'}
              {showModal === 'dimension' && 'Add Dimension'}
              {showModal === 'document' && 'Add Document'}
              {showModal === 'bom_line' && 'Add BOM Component'}
              {showModal === 'routing_op' && 'Add Routing Operation'}
            </h3>
            <div className="space-y-2">
              {showModal === 'vendor' && (<>
                <div className="erp-form-group"><label className="erp-form-label">Vendor:</label>
                  <select className="erp-form-select" value={modalData.vendor_id || ''} onChange={e => setModalData(p => ({ ...p, vendor_id: e.target.value }))}>
                    <option value="">Select...</option>{lookupVendors.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Vendor Item #:</label><input className="erp-form-input" value={modalData.vendor_item_number || ''} onChange={e => setModalData(p => ({ ...p, vendor_item_number: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Description:</label><input className="erp-form-input" value={modalData.vendor_description || ''} onChange={e => setModalData(p => ({ ...p, vendor_description: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Unit Cost:</label><input className="erp-form-input" type="number" value={modalData.unit_cost || ''} onChange={e => setModalData(p => ({ ...p, unit_cost: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Lead Time (days):</label><input className="erp-form-input" type="number" value={modalData.lead_time_days || ''} onChange={e => setModalData(p => ({ ...p, lead_time_days: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Min Order Qty:</label><input className="erp-form-input" type="number" value={modalData.min_order_qty || ''} onChange={e => setModalData(p => ({ ...p, min_order_qty: e.target.value }))} /></div>
                <label className="text-xs"><input type="checkbox" checked={!!modalData.is_preferred} onChange={e => setModalData(p => ({ ...p, is_preferred: e.target.checked }))} /> Preferred Vendor</label>
              </>)}
              {showModal === 'customer' && (<>
                <div className="erp-form-group"><label className="erp-form-label">Customer:</label>
                  <select className="erp-form-select" value={modalData.customer_id || ''} onChange={e => setModalData(p => ({ ...p, customer_id: e.target.value }))}>
                    <option value="">Select...</option>{lookupCustomers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Customer Item #:</label><input className="erp-form-input" value={modalData.customer_item_number || ''} onChange={e => setModalData(p => ({ ...p, customer_item_number: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Description:</label><input className="erp-form-input" value={modalData.customer_description || ''} onChange={e => setModalData(p => ({ ...p, customer_description: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Unit Price:</label><input className="erp-form-input" type="number" value={modalData.unit_price || ''} onChange={e => setModalData(p => ({ ...p, unit_price: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Min Order Qty:</label><input className="erp-form-input" type="number" value={modalData.min_order_qty || ''} onChange={e => setModalData(p => ({ ...p, min_order_qty: e.target.value }))} /></div>
                <label className="text-xs"><input type="checkbox" checked={!!modalData.is_preferred} onChange={e => setModalData(p => ({ ...p, is_preferred: e.target.checked }))} /> Preferred Customer</label>
              </>)}
              {showModal === 'pricing' && (<>
                <div className="erp-form-group"><label className="erp-form-label">Price List:</label><input className="erp-form-input" value={modalData.price_list || 'Standard'} onChange={e => setModalData(p => ({ ...p, price_list: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Tier Type:</label>
                  <select className="erp-form-select" value={modalData.tier_type || 'standard'} onChange={e => setModalData(p => ({ ...p, tier_type: e.target.value }))}>
                    <option value="standard">Standard</option><option value="stock_sheet">Stock Sheet</option><option value="half_sheet">Half Sheet</option><option value="custom_cut">Custom Cut</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Unit Price:</label><input className="erp-form-input" type="number" value={modalData.unit_price || ''} onChange={e => setModalData(p => ({ ...p, unit_price: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Price/SqFt:</label><input className="erp-form-input" type="number" value={modalData.price_per_sqft || ''} onChange={e => setModalData(p => ({ ...p, price_per_sqft: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Min Qty:</label><input className="erp-form-input" type="number" value={modalData.min_qty || 0} onChange={e => setModalData(p => ({ ...p, min_qty: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Max Qty:</label><input className="erp-form-input" type="number" value={modalData.max_qty || 999999} onChange={e => setModalData(p => ({ ...p, max_qty: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Min Charge:</label><input className="erp-form-input" type="number" value={modalData.minimum_charge || ''} onChange={e => setModalData(p => ({ ...p, minimum_charge: e.target.value }))} /></div>
              </>)}
              {showModal === 'dimension' && (<>
                <div className="erp-form-group"><label className="erp-form-label">Type:</label>
                  <select className="erp-form-select" value={modalData.dimension_type || ''} onChange={e => setModalData(p => ({ ...p, dimension_type: e.target.value }))}>
                    <option value="">Select...</option><option value="Width">Width</option><option value="Height">Height</option><option value="Length">Length</option><option value="Depth">Depth</option><option value="Diameter">Diameter</option><option value="Area">Area</option><option value="Weight">Weight</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Value:</label><input className="erp-form-input" value={modalData.dimension_value || ''} onChange={e => setModalData(p => ({ ...p, dimension_value: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">UOM:</label>
                  <select className="erp-form-select" value={modalData.uom || ''} onChange={e => setModalData(p => ({ ...p, uom: e.target.value }))}>
                    <option value="">Select...</option><option value="in">Inches</option><option value="mm">Millimeters</option><option value="ft">Feet</option><option value="sqft">Sq Ft</option><option value="lbs">Pounds</option><option value="kg">Kilograms</option>
                  </select></div>
              </>)}
              {showModal === 'document' && (<>
                <div className="erp-form-group"><label className="erp-form-label">Type:</label>
                  <select className="erp-form-select" value={modalData.document_type || ''} onChange={e => setModalData(p => ({ ...p, document_type: e.target.value }))}>
                    <option value="">Select...</option><option value="drawing">Drawing</option><option value="spec_sheet">Spec Sheet</option><option value="msds">MSDS</option><option value="certificate">Certificate</option><option value="photo">Photo</option><option value="other">Other</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">File Name:</label><input className="erp-form-input" value={modalData.file_name || ''} onChange={e => setModalData(p => ({ ...p, file_name: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">File Path/URL:</label><input className="erp-form-input" value={modalData.file_path || ''} onChange={e => setModalData(p => ({ ...p, file_path: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Description:</label><input className="erp-form-input" value={modalData.description || ''} onChange={e => setModalData(p => ({ ...p, description: e.target.value }))} /></div>
              </>)}
              {showModal === 'bom_line' && (<>
                <div className="erp-form-group"><label className="erp-form-label">Component:</label>
                  <select className="erp-form-select" value={modalData.component_item_id || ''} onChange={e => setModalData(p => ({ ...p, component_item_id: e.target.value }))}>
                    <option value="">Select Item...</option>{lookupItems.filter(i => i.id !== parseInt(id)).map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Qty Per:</label><input className="erp-form-input" type="number" value={modalData.quantity_per || ''} onChange={e => setModalData(p => ({ ...p, quantity_per: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Waste %:</label><input className="erp-form-input" type="number" value={modalData.waste_percent || 0} onChange={e => setModalData(p => ({ ...p, waste_percent: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">UOM:</label>
                  <select className="erp-form-select" value={modalData.uom || 'Each'} onChange={e => setModalData(p => ({ ...p, uom: e.target.value }))}>
                    <option value="Each">Each</option><option value="SqFt">Sq Ft</option><option value="Linear Ft">Linear Ft</option><option value="Sheet">Sheet</option><option value="Lbs">Lbs</option>
                  </select></div>
              </>)}
              {showModal === 'routing_op' && (<>
                <div className="erp-form-group"><label className="erp-form-label">Work Center:</label>
                  <select className="erp-form-select" value={modalData.work_center_id || ''} onChange={e => setModalData(p => ({ ...p, work_center_id: e.target.value }))}>
                    <option value="">Select...</option>{lookupWorkCenters.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Description:</label><input className="erp-form-input" value={modalData.operation_description || ''} onChange={e => setModalData(p => ({ ...p, operation_description: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Setup Time (hrs):</label><input className="erp-form-input" type="number" step="0.25" value={modalData.setup_time_hours || ''} onChange={e => setModalData(p => ({ ...p, setup_time_hours: e.target.value }))} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Run Time (hrs):</label><input className="erp-form-input" type="number" step="0.25" value={modalData.run_time_hours || ''} onChange={e => setModalData(p => ({ ...p, run_time_hours: e.target.value }))} /></div>
              </>)}
            </div>
            <div className="flex justify-end gap-2 mt-4 border-t pt-2">
              <button className="erp-btn" onClick={closeModal}>Cancel</button>
              <button className="erp-btn erp-btn-primary" onClick={handleModalSave}>Save</button>
            </div>
          </div>
        </div>
      )}
      {/* ===== INQUIRY MODAL ===== */}
      {inquiryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
            <div className="bg-blue-800 text-white px-4 py-2 rounded-t-lg flex justify-between items-center">
              <span className="font-bold text-sm">{inquiryModal} - {item.item_number}</span>
              <button className="text-white hover:text-yellow-300" onClick={() => setInquiryModal(null)}>✕</button>
            </div>
            <div className="p-3 overflow-auto flex-1">
              {inquiryLoading ? <div className="text-center py-8">Loading...</div> : (
                inquiryData.length === 0 ? <div className="text-center py-8 text-gray-500">No records found</div> : (
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="bg-gray-200">{Object.keys(inquiryData[0]).map(k => <th key={k} className="border px-2 py-1 text-left">{k.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</th>)}</tr></thead>
                    <tbody>{inquiryData.map((row, i) => <tr key={i} className={i%2?'bg-gray-50':''}>{Object.values(row).map((v,j) => <td key={j} className="border px-2 py-1">{v != null ? String(v) : '-'}</td>)}</tr>)}</tbody>
                  </table>
                )
              )}
            </div>
            <div className="border-t p-2 flex justify-end"><button className="erp-btn" onClick={() => setInquiryModal(null)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ItemDetail;
