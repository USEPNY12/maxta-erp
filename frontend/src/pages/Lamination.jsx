import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Lamination() {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'rolls', label: 'Roll Inventory' },
    { id: 'bom-builder', label: 'BOM Builder' },
    { id: 'interlayer-optimizer', label: 'Interlayer Cutting' },
    { id: 'cleanroom', label: 'Clean Room' },
    { id: 'autoclave', label: 'Autoclave' },
    { id: 'recipes', label: 'Recipes' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lamination Department</h1>
      </div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-4 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'rolls' && <RollsTab />}
      {tab === 'bom-builder' && <BOMBuilderTab />}
      {tab === 'interlayer-optimizer' && <InterlayerOptimizerTab />}
      {tab === 'cleanroom' && <CleanRoomTab />}
      {tab === 'autoclave' && <AutoclaveTab />}
      {tab === 'recipes' && <RecipesTab />}
    </div>
  );
}

// ==================== DASHBOARD TAB ====================
function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/lamination/dashboard').then(r => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;
  if (!stats) return <div className="text-center py-8 text-red-500">Failed to load dashboard</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Interlayer Rolls" value={stats.rolls?.total_rolls || 0} sub={`${stats.rolls?.in_use || 0} in use, ${stats.rolls?.sealed || 0} sealed`} color="blue" />
        <StatCard title="Assembly WOs Pending" value={stats.pending_assembly_wos || 0} sub={`${stats.pending_component_wos || 0} component WOs active`} color="orange" />
        <StatCard title="Autoclave Batches" value={stats.batches?.total_batches || 0} sub={`${stats.batches?.in_cycle || 0} in cycle, ${stats.batches?.loading || 0} loading`} color="green" />
        <StatCard title="Layups Pending" value={stats.layups?.total || 0} sub={`${stats.layups?.ready_for_autoclave || 0} ready for autoclave`} color="purple" />
      </div>

      {stats.rolls?.expiring_soon > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">⚠️ {stats.rolls.expiring_soon} roll(s) expiring within 30 days</p>
        </div>
      )}

      {stats.active_cleanroom && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">Clean Room Active: Session {stats.active_cleanroom.session_number}</p>
          <p className="text-green-600 text-sm">Temp: {stats.active_cleanroom.temperature_c}°C | Humidity: {stats.active_cleanroom.humidity_percent}%</p>
        </div>
      )}

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Lamination Workflow</h3>
        <div className="flex items-center justify-between text-sm">
          {['Sales Order', 'BOM Explosion', 'Glass Cutting', 'Interlayer Cutting', 'Clean Room Layup', 'Pre-Press', 'Autoclave', 'QC / Ship'].map((step, i) => (
            <div key={i} className="flex items-center">
              <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-center font-medium">{step}</div>
              {i < 7 && <span className="mx-2 text-gray-400">→</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, color }) {
  const colors = { blue: 'bg-blue-50 border-blue-200 text-blue-800', orange: 'bg-orange-50 border-orange-200 text-orange-800', green: 'bg-green-50 border-green-200 text-green-800', purple: 'bg-purple-50 border-purple-200 text-purple-800' };
  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-xs mt-1 opacity-60">{sub}</p>
    </div>
  );
}

// ==================== ROLLS INVENTORY TAB ====================
function RollsTab() {
  const [rolls, setRolls] = useState([]);
  const [filter, setFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ roll_number: '', material_type: 'PVB', thickness_mm: '', width_mm: '', original_length_m: '', lot_number: '', manufacturer: '', color: 'Clear', received_date: '', expiry_date: '', cost_per_sqm: '' });

  useEffect(() => { loadRolls(); }, [filter]);
  const loadRolls = () => api.get('/api/lamination/rolls', { params: filter ? { material_type: filter } : {} }).then(r => setRolls(Array.isArray(r.data) ? r.data : [])).catch(() => {});

  const addRoll = async () => {
    try {
      await api.post('/api/lamination/rolls', form);
      setShowAdd(false);
      setForm({ roll_number: '', material_type: 'PVB', thickness_mm: '', width_mm: '', original_length_m: '', lot_number: '', manufacturer: '', color: 'Clear', received_date: '', expiry_date: '', cost_per_sqm: '' });
      loadRolls();
    } catch (e) { alert(e.response?.data?.error || 'Error adding roll'); }
  };

  const statusColors = { sealed: 'bg-blue-100 text-blue-800', in_use: 'bg-green-100 text-green-800', exhausted: 'bg-gray-100 text-gray-800', expired: 'bg-red-100 text-red-800', quarantine: 'bg-yellow-100 text-yellow-800' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'PVB', 'SGP', 'EVA', 'TPU', 'Acoustic_PVB'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              {f || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">+ Add Roll</button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thickness</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Width</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manufacturer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage %</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(rolls || []).map(roll => (
              <tr key={roll.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{roll.roll_number}</td>
                <td className="px-4 py-3 text-sm">{roll.material_type}</td>
                <td className="px-4 py-3 text-sm">{roll.thickness_mm}mm</td>
                <td className="px-4 py-3 text-sm">{roll.width_mm}mm</td>
                <td className="px-4 py-3 text-sm font-medium">{roll.current_length_m}m / {roll.original_length_m}m</td>
                <td className="px-4 py-3 text-sm text-gray-500">{roll.lot_number}</td>
                <td className="px-4 py-3 text-sm">{roll.manufacturer}</td>
                <td className="px-4 py-3 text-sm">{roll.expiry_date ? new Date(roll.expiry_date).toLocaleDateString() : '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[roll.status] || ''}`}>{roll.status}</span></td>
                <td className="px-4 py-3 text-sm">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${((roll.original_length_m - roll.current_length_m) / roll.original_length_m * 100).toFixed(0)}%` }}></div>
                  </div>
                  <span className="text-xs text-gray-500">{((roll.original_length_m - roll.current_length_m) / roll.original_length_m * 100).toFixed(0)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rolls.length === 0 && <p className="text-center py-8 text-gray-500">No rolls found</p>}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Interlayer Roll</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-gray-600">Roll Number *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.roll_number} onChange={e => setForm({...form, roll_number: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Material Type *</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.material_type} onChange={e => setForm({...form, material_type: e.target.value})}>
                  {['PVB','SGP','EVA','TPU','Acoustic_PVB','Colored_PVB','SentryGlas'].map(m => <option key={m} value={m}>{m}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-600">Thickness (mm) *</label><input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm" value={form.thickness_mm} onChange={e => setForm({...form, thickness_mm: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Width (mm) *</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.width_mm} onChange={e => setForm({...form, width_mm: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Length (m) *</label><input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm" value={form.original_length_m} onChange={e => setForm({...form, original_length_m: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Lot Number *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.lot_number} onChange={e => setForm({...form, lot_number: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Manufacturer</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Color</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.color} onChange={e => setForm({...form, color: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Received Date *</label><input type="date" className="w-full border rounded px-3 py-2 text-sm" value={form.received_date} onChange={e => setForm({...form, received_date: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Expiry Date</label><input type="date" className="w-full border rounded px-3 py-2 text-sm" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Cost/sqm</label><input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm" value={form.cost_per_sqm} onChange={e => setForm({...form, cost_per_sqm: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={addRoll} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Add Roll</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== BOM BUILDER TAB ====================
function BOMBuilderTab() {
  const [woId, setWoId] = useState('');
  const [bomData, setBomData] = useState(null);
  const [items, setItems] = useState([]);
  const [showAddLine, setShowAddLine] = useState(false);
  const [lineForm, setLineForm] = useState({ component_item_id: '', quantity_per: 1, width_mm: '', height_mm: '', thickness_mm: '', component_type: 'glass_lite', consumed_at_operation: '', overhang_mm: 0, uom: 'EA', notes: '' });

  useEffect(() => { api.get('/api/inventory/items').then(r => setItems(r.data.items || r.data || [])).catch(() => {}); }, []);

  const loadBOM = () => {
    if (!woId) return;
    api.get(`/api/lamination/bom/${woId}`).then(r => setBomData(r.data)).catch(e => alert(e.response?.data?.error || 'Error loading BOM'));
  };

  const addLine = async () => {
    try {
      await api.post(`/api/lamination/bom/${woId}/lines`, lineForm);
      setShowAddLine(false);
      setLineForm({ component_item_id: '', quantity_per: 1, width_mm: '', height_mm: '', thickness_mm: '', component_type: 'glass_lite', consumed_at_operation: '', overhang_mm: 0, uom: 'EA', notes: '' });
      loadBOM();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  const deleteLine = async (lineId) => {
    if (!confirm('Delete this BOM line?')) return;
    await api.delete(`/api/lamination/bom/lines/${lineId}`);
    loadBOM();
  };

  const explodeBOM = async () => {
    if (!confirm('This will create child Work Orders for each BOM component. Continue?')) return;
    try {
      const res = await api.post(`/api/lamination/bom/${woId}/explode`);
      alert(res.data.message);
      loadBOM();
    } catch (e) { alert(e.response?.data?.error || 'Error exploding BOM'); }
  };

  const typeColors = { glass_lite: 'bg-blue-100 text-blue-800', interlayer: 'bg-green-100 text-green-800', hardware: 'bg-gray-100 text-gray-800', consumable: 'bg-yellow-100 text-yellow-800', other: 'bg-gray-50 text-gray-600' };

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Load Work Order BOM</h3>
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-gray-600">Work Order ID</label>
            <input type="number" className="border rounded px-3 py-2 text-sm w-32" value={woId} onChange={e => setWoId(e.target.value)} placeholder="WO ID" />
          </div>
          <button onClick={loadBOM} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">Load BOM</button>
        </div>
      </div>

      {bomData && (
        <>
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold">{bomData.work_order.order_number} - {bomData.work_order.description}</h3>
                <p className="text-sm text-gray-500">
                  {bomData.work_order.width}mm × {bomData.work_order.height}mm | {bomData.work_order.glass_type} | {bomData.work_order.thickness}mm
                  {bomData.work_order.interlayer_type && ` | Interlayer: ${bomData.work_order.interlayer_type}`}
                </p>
                <p className="text-xs text-gray-400">Category: {bomData.work_order.wo_category} | Status: {bomData.work_order.status}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddLine(true)} className="bg-green-600 text-white px-3 py-2 rounded text-sm">+ Add Component</button>
                <button onClick={explodeBOM} className="bg-orange-600 text-white px-3 py-2 rounded text-sm" disabled={bomData.bom_lines.length === 0}>Explode to Child WOs</button>
              </div>
            </div>
          </div>

          {/* BOM Lines Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seq</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dimensions (W×H)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thickness</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overhang</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {bomData.bom_lines.map(line => (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{line.sequence}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[line.component_type] || typeColors.other}`}>{line.component_type}</span></td>
                    <td className="px-4 py-3 text-sm font-medium">{line.item_number} - {line.item_description}</td>
                    <td className="px-4 py-3 text-sm">{line.quantity_per} {line.uom || line.item_uom}</td>
                    <td className="px-4 py-3 text-sm">{line.width_mm && line.height_mm ? `${line.width_mm} × ${line.height_mm}mm` : '-'}</td>
                    <td className="px-4 py-3 text-sm">{line.thickness_mm ? `${line.thickness_mm}mm` : '-'}</td>
                    <td className="px-4 py-3 text-sm">{line.overhang_mm > 0 ? `+${line.overhang_mm}mm` : '-'}</td>
                    <td className="px-4 py-3 text-sm">{line.consumed_at_operation || '-'}</td>
                    <td className="px-4 py-3"><button onClick={() => deleteLine(line.id)} className="text-red-600 text-sm hover:underline">Delete</button></td>
                  </tr>
                ))}
                {bomData.bom_lines.length === 0 && <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-500">No BOM lines. Click "+ Add Component" to define what materials are needed.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Child Work Orders */}
          {bomData.child_work_orders.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold mb-3">Child Work Orders (from BOM Explosion)</h4>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">WO #</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dimensions</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bomData.child_work_orders.map(cwo => (
                    <tr key={cwo.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium">{cwo.order_number}</td>
                      <td className="px-4 py-2"><span className={`px-2 py-1 rounded-full text-xs font-medium ${cwo.wo_category === 'glass_component' ? 'bg-blue-100 text-blue-800' : cwo.wo_category === 'interlayer_component' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>{cwo.wo_category}</span></td>
                      <td className="px-4 py-2 text-sm">{cwo.description}</td>
                      <td className="px-4 py-2 text-sm">{cwo.width} × {cwo.height}mm</td>
                      <td className="px-4 py-2 text-sm">{cwo.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add Line Modal */}
      {showAddLine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add BOM Component</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Component Type *</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={lineForm.component_type} onChange={e => setLineForm({...lineForm, component_type: e.target.value})}>
                  <option value="glass_lite">Glass Lite</option>
                  <option value="interlayer">Interlayer (PVB/SGP/EVA)</option>
                  <option value="hardware">Hardware (Hinges, Brackets)</option>
                  <option value="consumable">Consumable (Tape, Sealant)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600">Item *</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={lineForm.component_item_id} onChange={e => setLineForm({...lineForm, component_item_id: e.target.value})}>
                  <option value="">Select item...</option>
                  {(items || []).map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Quantity</label><input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm" value={lineForm.quantity_per} onChange={e => setLineForm({...lineForm, quantity_per: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">UOM</label><input className="w-full border rounded px-3 py-2 text-sm" value={lineForm.uom} onChange={e => setLineForm({...lineForm, uom: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Width (mm)</label><input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm" value={lineForm.width_mm} onChange={e => setLineForm({...lineForm, width_mm: e.target.value})} placeholder="From WO if blank" /></div>
              <div><label className="text-xs font-medium text-gray-600">Height (mm)</label><input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm" value={lineForm.height_mm} onChange={e => setLineForm({...lineForm, height_mm: e.target.value})} placeholder="From WO if blank" /></div>
              <div><label className="text-xs font-medium text-gray-600">Thickness (mm)</label><input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm" value={lineForm.thickness_mm} onChange={e => setLineForm({...lineForm, thickness_mm: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Overhang (mm)</label><input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm" value={lineForm.overhang_mm} onChange={e => setLineForm({...lineForm, overhang_mm: e.target.value})} placeholder="5mm typical for interlayer" /></div>
              <div><label className="text-xs font-medium text-gray-600">Consumed at Operation #</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={lineForm.consumed_at_operation} onChange={e => setLineForm({...lineForm, consumed_at_operation: e.target.value})} placeholder="Routing step #" /></div>
              <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Notes</label><input className="w-full border rounded px-3 py-2 text-sm" value={lineForm.notes} onChange={e => setLineForm({...lineForm, notes: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddLine(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={addLine} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Add Component</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== INTERLAYER OPTIMIZER TAB ====================
function InterlayerOptimizerTab() {
  const [queue, setQueue] = useState([]);
  const [rolls, setRolls] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedWOs, setSelectedWOs] = useState([]);
  const [selectedRoll, setSelectedRoll] = useState('');
  const [subTab, setSubTab] = useState('queue');

  useEffect(() => {
    api.get('/api/lamination/interlayer-optimizer/queue').then(r => setQueue(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/lamination/rolls', { params: { status: 'in_use' } }).then(r => setRolls(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/lamination/interlayer-optimizer/plans').then(r => setPlans(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const toggleWO = (id) => {
    setSelectedWOs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const generatePlan = async () => {
    if (!selectedRoll || selectedWOs.length === 0) { alert('Select a roll and at least one WO'); return; }
    try {
      const res = await api.post('/api/lamination/interlayer-optimizer/generate-plan', { roll_id: parseInt(selectedRoll), work_order_ids: selectedWOs });
      alert(`Cut plan ${res.data.plan_number} created! ${res.data.total_pieces} pieces, ${res.data.total_length_m.toFixed(2)}m used.`);
      setSelectedWOs([]);
      api.get('/api/lamination/interlayer-optimizer/plans').then(r => setPlans(Array.isArray(r.data) ? r.data : []));
      api.get('/api/lamination/interlayer-optimizer/queue').then(r => setQueue(Array.isArray(r.data) ? r.data : []));
    } catch (e) { alert(e.response?.data?.error || 'Error generating plan'); }
  };

  const executePlan = async (planId) => {
    if (!confirm('Execute this cut plan? This will deduct material from the roll and mark WOs as complete.')) return;
    try {
      await api.post(`/api/lamination/interlayer-optimizer/plans/${planId}/execute`);
      alert('Cut plan executed!');
      api.get('/api/lamination/interlayer-optimizer/plans').then(r => setPlans(Array.isArray(r.data) ? r.data : []));
      api.get('/api/lamination/rolls').then(r => setRolls(Array.isArray(r.data) ? r.data : []));
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSubTab('queue')} className={`px-4 py-2 rounded text-sm ${subTab === 'queue' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Cutting Queue</button>
        <button onClick={() => setSubTab('plans')} className={`px-4 py-2 rounded text-sm ${subTab === 'plans' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Cut Plans ({plans.length})</button>
      </div>

      {subTab === 'queue' && (
        <>
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-semibold mb-3">Generate Cut Plan</h4>
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-gray-600">Select Roll</label>
                <select className="border rounded px-3 py-2 text-sm" value={selectedRoll} onChange={e => setSelectedRoll(e.target.value)}>
                  <option value="">Choose roll...</option>
                  {(rolls || []).map(r => <option key={r.id} value={r.id}>{r.roll_number} ({r.material_type} {r.thickness_mm}mm, {r.width_mm}mm wide, {r.current_length_m}m left)</option>)}
                </select>
              </div>
              <button onClick={generatePlan} className="bg-green-600 text-white px-4 py-2 rounded text-sm" disabled={!selectedRoll || selectedWOs.length === 0}>
                Generate Plan ({selectedWOs.length} selected)
              </button>
            </div>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><input type="checkbox" onChange={e => setSelectedWOs(e.target.checked ? (queue || []).map(q => q.id) : [])} /></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent WO</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Width × Height</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interlayer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(queue || []).map(wo => (
                  <tr key={wo.id} className={`hover:bg-gray-50 ${selectedWOs.includes(wo.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3"><input type="checkbox" checked={selectedWOs.includes(wo.id)} onChange={() => toggleWO(wo.id)} /></td>
                    <td className="px-4 py-3 text-sm font-medium">{wo.order_number}</td>
                    <td className="px-4 py-3 text-sm">{wo.parent_wo_number || '-'}</td>
                    <td className="px-4 py-3 text-sm">{wo.width} × {wo.height}mm</td>
                    <td className="px-4 py-3 text-sm">{wo.interlayer_type || wo.description}</td>
                    <td className="px-4 py-3 text-sm">{wo.quantity}</td>
                    <td className="px-4 py-3 text-sm">{wo.status}</td>
                  </tr>
                ))}
                {queue.length === 0 && <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No interlayer components in queue. Use BOM Builder to explode assembly WOs first.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subTab === 'plans' && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pieces</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Length Used</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(plans || []).map(plan => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{plan.plan_number}</td>
                  <td className="px-4 py-3 text-sm">{plan.roll_number}</td>
                  <td className="px-4 py-3 text-sm">{plan.material_type} ({plan.roll_width}mm)</td>
                  <td className="px-4 py-3 text-sm">{plan.total_pieces}</td>
                  <td className="px-4 py-3 text-sm">{plan.total_length_used_m}m</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${plan.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{plan.status}</span></td>
                  <td className="px-4 py-3">{plan.status === 'planned' && <button onClick={() => executePlan(plan.id)} className="text-green-600 text-sm hover:underline">Execute</button>}</td>
                </tr>
              ))}
              {plans.length === 0 && <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No cut plans yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==================== CLEAN ROOM TAB ====================
function CleanRoomTab() {
  const [sessions, setSessions] = useState([]);
  const [layups, setLayups] = useState([]);
  const [showNewSession, setShowNewSession] = useState(false);
  const [showNewLayup, setShowNewLayup] = useState(false);
  const [sessionForm, setSessionForm] = useState({ temperature_c: '', humidity_percent: '', notes: '' });
  const [layupForm, setLayupForm] = useState({ work_order_id: '', roll_id: '', interlayer_width_mm: '', interlayer_length_mm: '', temperature_c: '', humidity_percent: '', pre_press_method: 'nip_roller' });
  const [rolls, setRolls] = useState([]);

  useEffect(() => {
    api.get('/api/lamination/cleanroom/sessions').then(r => setSessions(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/lamination/layups').then(r => setLayups(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/lamination/rolls', { params: { status: 'in_use' } }).then(r => setRolls(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const startSession = async () => {
    try {
      const res = await api.post('/api/lamination/cleanroom/sessions', sessionForm);
      alert(`Session ${res.data.session_number} started`);
      setShowNewSession(false);
      api.get('/api/lamination/cleanroom/sessions').then(r => setSessions(Array.isArray(r.data) ? r.data : []));
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  const endSession = async (id) => {
    await api.put(`/api/lamination/cleanroom/sessions/${id}/end`);
    api.get('/api/lamination/cleanroom/sessions').then(r => setSessions(Array.isArray(r.data) ? r.data : []));
  };

  const recordLayup = async () => {
    try {
      const activeSession = sessions.find(s => s.status === 'active');
      await api.post('/api/lamination/layups', { ...layupForm, cleanroom_session_id: activeSession?.id });
      alert('Layup recorded!');
      setShowNewLayup(false);
      api.get('/api/lamination/layups').then(r => setLayups(Array.isArray(r.data) ? r.data : []));
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  const updateLayupStatus = async (id, status) => {
    await api.put(`/api/lamination/layups/${id}/status`, { status });
    api.get('/api/lamination/layups').then(r => setLayups(Array.isArray(r.data) ? r.data : []));
  };

  const activeSession = sessions.find(s => s.status === 'active');

  return (
    <div className="space-y-4">
      {/* Active Session Banner */}
      {activeSession ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-green-800 font-semibold">Clean Room Active: {activeSession.session_number}</p>
            <p className="text-green-600 text-sm">Temp: {activeSession.temperature_c}°C | Humidity: {activeSession.humidity_percent}% | Started: {new Date(activeSession.start_time).toLocaleString()}</p>
            {parseFloat(activeSession.humidity_percent) > 28 && <p className="text-red-600 text-sm font-bold mt-1">WARNING: Humidity above 28% - risk of delamination!</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNewLayup(true)} className="bg-blue-600 text-white px-3 py-2 rounded text-sm">Record Layup</button>
            <button onClick={() => endSession(activeSession.id)} className="bg-red-600 text-white px-3 py-2 rounded text-sm">End Session</button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-gray-600">No active clean room session</p>
          <button onClick={() => setShowNewSession(true)} className="bg-green-600 text-white px-4 py-2 rounded text-sm">Start Session</button>
        </div>
      )}

      {/* Layup Records */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50"><h4 className="font-semibold">Recent Layup Records</h4></div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">WO #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lot #</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temp/Humidity</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(layups || []).map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">{l.order_number}</td>
                <td className="px-4 py-3 text-sm">{l.roll_number} ({l.material_type})</td>
                <td className="px-4 py-3 text-sm">{l.roll_lot_number}</td>
                <td className="px-4 py-3 text-sm">{l.interlayer_width_mm}×{l.interlayer_length_mm}mm</td>
                <td className="px-4 py-3 text-sm">{l.temperature_c}°C / {l.humidity_percent}%</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${l.status === 'ready_for_autoclave' ? 'bg-green-100 text-green-800' : l.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{l.status}</span></td>
                <td className="px-4 py-3 text-sm">
                  {l.status === 'layup_complete' && <button onClick={() => updateLayupStatus(l.id, 'pre_pressed')} className="text-blue-600 hover:underline mr-2">Pre-Press</button>}
                  {l.status === 'pre_pressed' && <button onClick={() => updateLayupStatus(l.id, 'ready_for_autoclave')} className="text-green-600 hover:underline">Ready</button>}
                </td>
              </tr>
            ))}
            {layups.length === 0 && <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No layup records yet</td></tr>}
          </tbody>
        </table>
      </div>

      {/* New Session Modal */}
      {showNewSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Start Clean Room Session</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-600">Temperature (°C) *</label><input type="number" step="0.1" className="w-full border rounded px-3 py-2 text-sm" value={sessionForm.temperature_c} onChange={e => setSessionForm({...sessionForm, temperature_c: e.target.value})} placeholder="18-22°C recommended" /></div>
              <div><label className="text-xs font-medium text-gray-600">Humidity (%) *</label><input type="number" step="0.1" className="w-full border rounded px-3 py-2 text-sm" value={sessionForm.humidity_percent} onChange={e => setSessionForm({...sessionForm, humidity_percent: e.target.value})} placeholder="Below 28% required" /></div>
              <div><label className="text-xs font-medium text-gray-600">Notes</label><input className="w-full border rounded px-3 py-2 text-sm" value={sessionForm.notes} onChange={e => setSessionForm({...sessionForm, notes: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowNewSession(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={startSession} className="px-4 py-2 bg-green-600 text-white rounded text-sm">Start Session</button>
            </div>
          </div>
        </div>
      )}

      {/* New Layup Modal */}
      {showNewLayup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Record Layup</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-600">Work Order ID (Assembly) *</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={layupForm.work_order_id} onChange={e => setLayupForm({...layupForm, work_order_id: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Interlayer Roll *</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={layupForm.roll_id} onChange={e => setLayupForm({...layupForm, roll_id: e.target.value})}>
                  <option value="">Select roll (scan barcode)...</option>
                  {(rolls || []).map(r => <option key={r.id} value={r.id}>{r.roll_number} - {r.material_type} {r.thickness_mm}mm (Lot: {r.lot_number})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-medium text-gray-600">Width (mm)</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={layupForm.interlayer_width_mm} onChange={e => setLayupForm({...layupForm, interlayer_width_mm: e.target.value})} /></div>
                <div><label className="text-xs font-medium text-gray-600">Length (mm)</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={layupForm.interlayer_length_mm} onChange={e => setLayupForm({...layupForm, interlayer_length_mm: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-medium text-gray-600">Temp (°C)</label><input type="number" step="0.1" className="w-full border rounded px-3 py-2 text-sm" value={layupForm.temperature_c} onChange={e => setLayupForm({...layupForm, temperature_c: e.target.value})} /></div>
                <div><label className="text-xs font-medium text-gray-600">Humidity (%)</label><input type="number" step="0.1" className="w-full border rounded px-3 py-2 text-sm" value={layupForm.humidity_percent} onChange={e => setLayupForm({...layupForm, humidity_percent: e.target.value})} /></div>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Pre-Press Method</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={layupForm.pre_press_method} onChange={e => setLayupForm({...layupForm, pre_press_method: e.target.value})}>
                  <option value="nip_roller">Nip Roller</option>
                  <option value="vacuum_bag">Vacuum Bag</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowNewLayup(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={recordLayup} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Record Layup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== AUTOCLAVE TAB ====================
function AutoclaveTab() {
  const [batches, setBatches] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [readyLayups, setReadyLayups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ recipe_id: '', interlayer_type: 'PVB', notes: '' });
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetail, setBatchDetail] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    api.get('/api/lamination/autoclave/batches').then(r => setBatches(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/lamination/autoclave/recipes').then(r => setRecipes(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/lamination/layups', { params: { status: 'ready_for_autoclave' } }).then(r => setReadyLayups(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  };

  const createBatch = async () => {
    try {
      const res = await api.post('/api/lamination/autoclave/batches', createForm);
      alert(`Batch ${res.data.batch_number} created`);
      setShowCreate(false);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  const loadBatchDetail = async (batchId) => {
    const res = await api.get(`/api/lamination/autoclave/batches/${batchId}`);
    setBatchDetail(res.data);
    setSelectedBatch(batchId);
  };

  const addToBatch = async (layup) => {
    if (!selectedBatch) { alert('Select a batch first'); return; }
    try {
      await api.post(`/api/lamination/autoclave/batches/${selectedBatch}/add-item`, {
        work_order_id: layup.work_order_id,
        layup_record_id: layup.id,
        width_mm: layup.interlayer_width_mm,
        height_mm: layup.interlayer_length_mm,
        total_thickness_mm: 12 // Default - should come from WO
      });
      loadBatchDetail(selectedBatch);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  const startCycle = async (batchId) => {
    if (!confirm('Start autoclave cycle? This cannot be undone.')) return;
    await api.post(`/api/lamination/autoclave/batches/${batchId}/start-cycle`);
    loadData();
    if (selectedBatch === batchId) loadBatchDetail(batchId);
  };

  const completeBatch = async (batchId) => {
    const qcPassed = confirm('Did the batch pass QC inspection?');
    await api.post(`/api/lamination/autoclave/batches/${batchId}/complete`, { qc_passed: qcPassed, actual_temp_max: 140, actual_pressure_max: 12 });
    loadData();
    if (selectedBatch === batchId) loadBatchDetail(batchId);
  };

  const statusColors = { loading: 'bg-yellow-100 text-yellow-800', loaded: 'bg-blue-100 text-blue-800', in_cycle: 'bg-orange-100 text-orange-800', cooling: 'bg-purple-100 text-purple-800', completed: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Autoclave Load Builder</h3>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">+ New Batch</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Batches List */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50"><h4 className="font-medium text-sm">Batches</h4></div>
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {(batches || []).map(batch => (
              <div key={batch.id} onClick={() => loadBatchDetail(batch.id)} className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${selectedBatch === batch.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{batch.batch_number}</p>
                    <p className="text-xs text-gray-500">{batch.recipe_name} | {batch.interlayer_type}</p>
                    <p className="text-xs text-gray-400">{batch.total_pieces} pcs | {batch.total_sqm} sqm</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[batch.status]}`}>{batch.status}</span>
                    {batch.status === 'loading' && <button onClick={(e) => { e.stopPropagation(); startCycle(batch.id); }} className="block mt-1 text-xs text-orange-600 hover:underline">Start Cycle</button>}
                    {batch.status === 'in_cycle' && <button onClick={(e) => { e.stopPropagation(); completeBatch(batch.id); }} className="block mt-1 text-xs text-green-600 hover:underline">Complete</button>}
                  </div>
                </div>
              </div>
            ))}
            {batches.length === 0 && <p className="px-4 py-8 text-center text-gray-500 text-sm">No batches yet</p>}
          </div>
        </div>

        {/* Ready for Autoclave / Batch Detail */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50"><h4 className="font-medium text-sm">{batchDetail ? `Batch ${batchDetail.batch_number} Items` : 'Ready for Autoclave'}</h4></div>
          {batchDetail ? (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-gray-500">Recipe:</span> {batchDetail.recipe_name}</p>
                <p><span className="text-gray-500">Cycle Time:</span> {batchDetail.total_cycle_hours}h</p>
                <p><span className="text-gray-500">Temp:</span> {batchDetail.target_temperature_c}°C</p>
                <p><span className="text-gray-500">Pressure:</span> {batchDetail.max_pressure_bar} bar</p>
                <p><span className="text-gray-500">Total Pieces:</span> {batchDetail.total_pieces}</p>
                <p><span className="text-gray-500">Total sqm:</span> {batchDetail.total_sqm}</p>
              </div>
              <div className="border-t pt-3">
                {batchDetail.items?.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.order_number}</p>
                      <p className="text-xs text-gray-500">{item.width_mm}×{item.height_mm}mm ({item.sqm} sqm)</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[item.status]}`}>{item.status}</span>
                  </div>
                ))}
                {(!batchDetail.items || batchDetail.items.length === 0) && <p className="text-sm text-gray-500 text-center py-4">No items in batch. Add from ready layups.</p>}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {(readyLayups || []).map(l => (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{l.order_number}</p>
                    <p className="text-xs text-gray-500">{l.material_type} | {l.interlayer_width_mm}×{l.interlayer_length_mm}mm</p>
                  </div>
                  <button onClick={() => addToBatch(l)} className="text-blue-600 text-sm hover:underline" disabled={!selectedBatch}>Add to Batch</button>
                </div>
              ))}
              {readyLayups.length === 0 && <p className="px-4 py-8 text-center text-gray-500 text-sm">No layups ready for autoclave</p>}
            </div>
          )}
        </div>
      </div>

      {/* Create Batch Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Autoclave Batch</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-600">Interlayer Type *</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={createForm.interlayer_type} onChange={e => setCreateForm({...createForm, interlayer_type: e.target.value})}>
                  {['PVB','SGP','EVA','TPU','Acoustic_PVB'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Recipe *</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={createForm.recipe_id} onChange={e => setCreateForm({...createForm, recipe_id: e.target.value})}>
                  <option value="">Select recipe...</option>
                  {recipes.filter(r => r.interlayer_type === createForm.interlayer_type).map(r => <option key={r.id} value={r.id}>{r.recipe_name} ({r.total_cycle_hours}h, {r.target_temperature_c}°C, {r.max_pressure_bar}bar)</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Notes</label><input className="w-full border rounded px-3 py-2 text-sm" value={createForm.notes} onChange={e => setCreateForm({...createForm, notes: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={createBatch} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Create Batch</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== RECIPES TAB ====================
function RecipesTab() {
  const [recipes, setRecipes] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ recipe_name: '', recipe_code: '', interlayer_type: 'PVB', min_thickness_mm: '', max_thickness_mm: '', ramp_rate_c_per_min: 1.5, target_temperature_c: 135, soak_time_min: 60, max_pressure_bar: 12, cooling_rate_c_per_min: 2, total_cycle_hours: 3.5, vacuum_required: false, notes: '' });

  useEffect(() => { api.get('/api/lamination/autoclave/recipes').then(r => setRecipes(Array.isArray(r.data) ? r.data : [])).catch(() => {}); }, []);

  const addRecipe = async () => {
    try {
      await api.post('/api/lamination/autoclave/recipes', { ...form, vacuum_required: form.vacuum_required ? 1 : 0 });
      setShowAdd(false);
      api.get('/api/lamination/autoclave/recipes').then(r => setRecipes(Array.isArray(r.data) ? r.data : []));
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Autoclave Recipes</h3>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">+ Add Recipe</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(recipes || []).map(recipe => (
          <div key={recipe.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{recipe.recipe_name}</h4>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">{recipe.recipe_code}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <p>Material: <span className="font-medium text-gray-900">{recipe.interlayer_type}</span></p>
              <p>Thickness: <span className="font-medium text-gray-900">{recipe.min_thickness_mm}-{recipe.max_thickness_mm}mm</span></p>
              <p>Target Temp: <span className="font-medium text-gray-900">{recipe.target_temperature_c}°C</span></p>
              <p>Pressure: <span className="font-medium text-gray-900">{recipe.max_pressure_bar} bar</span></p>
              <p>Soak Time: <span className="font-medium text-gray-900">{recipe.soak_time_min} min</span></p>
              <p>Total Cycle: <span className="font-medium text-gray-900">{recipe.total_cycle_hours}h</span></p>
              <p>Ramp Rate: <span className="font-medium text-gray-900">{recipe.ramp_rate_c_per_min}°C/min</span></p>
              <p>Cooling: <span className="font-medium text-gray-900">{recipe.cooling_rate_c_per_min}°C/min</span></p>
            </div>
            {recipe.vacuum_required ? <p className="mt-2 text-xs text-purple-600 font-medium">Vacuum Required</p> : null}
            {recipe.notes && <p className="mt-2 text-xs text-gray-500">{recipe.notes}</p>}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Autoclave Recipe</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Recipe Name *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.recipe_name} onChange={e => setForm({...form, recipe_name: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Recipe Code *</label><input className="w-full border rounded px-3 py-2 text-sm" value={form.recipe_code} onChange={e => setForm({...form, recipe_code: e.target.value})} placeholder="e.g. PVB-CUSTOM" /></div>
              <div><label className="text-xs font-medium text-gray-600">Interlayer Type *</label>
                <select className="w-full border rounded px-3 py-2 text-sm" value={form.interlayer_type} onChange={e => setForm({...form, interlayer_type: e.target.value})}>
                  {['PVB','SGP','EVA','TPU','Acoustic_PVB'].map(t => <option key={t} value={t}>{t}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-600">Min Thickness (mm)</label><input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm" value={form.min_thickness_mm} onChange={e => setForm({...form, min_thickness_mm: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Max Thickness (mm)</label><input type="number" step="0.01" className="w-full border rounded px-3 py-2 text-sm" value={form.max_thickness_mm} onChange={e => setForm({...form, max_thickness_mm: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Ramp Rate (°C/min)</label><input type="number" step="0.1" className="w-full border rounded px-3 py-2 text-sm" value={form.ramp_rate_c_per_min} onChange={e => setForm({...form, ramp_rate_c_per_min: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Target Temp (°C) *</label><input type="number" step="0.1" className="w-full border rounded px-3 py-2 text-sm" value={form.target_temperature_c} onChange={e => setForm({...form, target_temperature_c: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Soak Time (min) *</label><input type="number" className="w-full border rounded px-3 py-2 text-sm" value={form.soak_time_min} onChange={e => setForm({...form, soak_time_min: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Max Pressure (bar) *</label><input type="number" step="0.1" className="w-full border rounded px-3 py-2 text-sm" value={form.max_pressure_bar} onChange={e => setForm({...form, max_pressure_bar: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Cooling Rate (°C/min)</label><input type="number" step="0.1" className="w-full border rounded px-3 py-2 text-sm" value={form.cooling_rate_c_per_min} onChange={e => setForm({...form, cooling_rate_c_per_min: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-gray-600">Total Cycle (hours) *</label><input type="number" step="0.1" className="w-full border rounded px-3 py-2 text-sm" value={form.total_cycle_hours} onChange={e => setForm({...form, total_cycle_hours: e.target.value})} /></div>
              <div className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={form.vacuum_required} onChange={e => setForm({...form, vacuum_required: e.target.checked})} /><label className="text-sm">Vacuum Required (EVA process)</label></div>
              <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Notes</label><textarea className="w-full border rounded px-3 py-2 text-sm" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
              <button onClick={addRecipe} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Add Recipe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
