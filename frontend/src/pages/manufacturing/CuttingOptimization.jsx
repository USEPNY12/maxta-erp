import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';

// Color palette for pieces
const PIECE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#E11D48', '#7C3AED', '#0EA5E9', '#D97706'
];

export default function CuttingOptimization() {
  const [activeTab, setActiveTab] = useState('optimizer'); // optimizer, sheets, remnants, plans
  const [sheets, setSheets] = useState([]);
  const [remnants, setRemnants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Optimizer state
  const [selectedSource, setSelectedSource] = useState(null); // {type, id, width, height, glass_type, thickness}
  const [pieces, setPieces] = useState([]);
  const [optimizeResult, setOptimizeResult] = useState(null);
  const [suggestedPieces, setSuggestedPieces] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // New piece form
  const [newPiece, setNewPiece] = useState({ width: '', height: '', label: '', customer: '', order_number: '', qty: 1 });

  // Sheet form
  const [showSheetForm, setShowSheetForm] = useState(false);
  const [sheetForm, setSheetForm] = useState({ glass_type: 'Clear', thickness: '6mm', width: 93, height: 130, qty_on_hand: 1, cost_per_sheet: 0, location: 'Main Warehouse', supplier: '' });

  // Remnant form
  const [showRemnantForm, setShowRemnantForm] = useState(false);
  const [remnantForm, setRemnantForm] = useState({ glass_type: 'Clear', thickness: '6mm', width: '', height: '', location: 'Remnant Rack', rack_position: '', quality: 'good', cost: 0 });

  const canvasRef = useRef(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (optimizeResult) drawCutPlan(); }, [optimizeResult]);

  const loadData = async () => {
    try {
      const [sheetsRes, remnantsRes, plansRes, statsRes] = await Promise.all([
        api.get(`/api/cutting/sheets`),
        api.get(`/api/cutting/remnants`),
        api.get(`/api/cutting/plans`),
        api.get(`/api/cutting/stats`)
      ]);
      setSheets(Array.isArray(sheetsRes.data) ? sheetsRes.data : []);
      setRemnants(Array.isArray(remnantsRes.data) ? remnantsRes.data : []);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setStats(statsRes.data);
    } catch (err) { console.error(err); }
  };

  const selectSource = (type, item) => {
    setSelectedSource({
      type,
      id: item.id,
      width: parseFloat(item.width),
      height: parseFloat(item.height),
      glass_type: item.glass_type,
      thickness: item.thickness,
      label: type === 'sheet' ? `${item.glass_type} ${item.thickness} (${item.width}" × ${item.height}")` : `Remnant #${item.id} (${item.width}" × ${item.height}")`
    });
    setOptimizeResult(null);
    toast.info(`Selected ${type}: ${item.width}" × ${item.height}" ${item.glass_type} ${item.thickness}`);
  };

  const addPiece = () => {
    if (!newPiece.width || !newPiece.height) return toast.error('Enter width and height');
    setPieces([...pieces, { ...newPiece, id: Date.now(), width: parseFloat(newPiece.width), height: parseFloat(newPiece.height), qty: parseInt(newPiece.qty) || 1 }]);
    setNewPiece({ width: '', height: '', label: '', customer: '', order_number: '', qty: 1 });
  };

  const removePiece = (id) => setPieces(pieces?.filter(p => p.id !== id));

  const loadSuggestions = async () => {
    if (!selectedSource) return toast.error('Select a sheet/remnant first');
    try {
      const res = await api.get(`/api/cutting/suggest-pieces`, {
        params: { glass_type: selectedSource.glass_type, thickness: selectedSource.thickness }
      });
      setSuggestedPieces(Array.isArray(res.data) ? res.data : []);
      setShowSuggestions(true);
    } catch (err) { toast.error('Failed to load suggestions'); }
  };

  const addSuggestedPiece = (wo) => {
    setPieces([...pieces, {
      id: Date.now() + Math.random(),
      width: parseFloat(wo.width),
      height: parseFloat(wo.height),
      label: `WO-${wo.order_number} ${wo.product_type || ''}`,
      customer: wo.customer_name || '',
      order_number: wo.so_number || wo.order_number,
      wo_id: wo.wo_id,
      qty: parseInt(wo.qty_ordered) || 1
    }]);
    toast.success(`Added WO-${wo.order_number}`);
  };

  const runOptimization = async () => {
    if (!selectedSource) return toast.error('Select a sheet or remnant first');
    if (pieces.length === 0) return toast.error('Add at least one piece to cut');
    setLoading(true);
    try {
      const res = await api.post(`/api/cutting/optimize`, {
        sheetWidth: selectedSource.width,
        sheetHeight: selectedSource.height,
        glass_type: selectedSource.glass_type,
        thickness: selectedSource.thickness,
        source_type: selectedSource.type,
        source_id: selectedSource.id,
        pieces
      });
      setOptimizeResult(res.data);
      toast.success(`Optimization complete: ${res.data.stats.utilization_pct}% utilization`);
    } catch (err) { toast.error('Optimization failed'); }
    setLoading(false);
  };

  const saveCutPlan = async () => {
    if (!optimizeResult) return;
    try {
      const res = await api.post(`/api/cutting/plans`, {
        glass_type: selectedSource.glass_type,
        thickness: selectedSource.thickness,
        source_type: selectedSource.type,
        source_sheet_id: selectedSource.type === 'sheet' ? selectedSource.id : null,
        source_remnant_id: selectedSource.type === 'remnant' ? selectedSource.id : null,
        sheet_width: selectedSource.width,
        sheet_height: selectedSource.height,
        pieces: optimizeResult.placed,
        remnants: optimizeResult.remnants,
        stats: optimizeResult.stats
      });
      toast.success(`Cut plan ${res.data.plan_number} saved!`);
      loadData();
    } catch (err) { toast.error('Failed to save cut plan'); }
  };

  const completePlan = async (planId) => {
    try {
      await api.post(`/api/cutting/plans/${planId}/complete`, {});
      toast.success('Cut plan completed! Remnants added to inventory.');
      loadData();
    } catch (err) { toast.error('Failed to complete plan'); }
  };

  // Visual Canvas Drawing
  const drawCutPlan = () => {
    const canvas = canvasRef.current;
    if (!canvas || !optimizeResult) return;
    const ctx = canvas.getContext('2d');
    const { stats, placed, remnants, scrap } = optimizeResult;

    // Scale to fit canvas
    const padding = 40;
    const maxW = canvas.width - padding * 2;
    const maxH = canvas.height - padding * 2;
    const scale = Math.min(maxW / stats.sheetWidth, maxH / stats.sheetHeight);
    const offsetX = padding + (maxW - stats.sheetWidth * scale) / 2;
    const offsetY = padding + (maxH - stats.sheetHeight * scale) / 2;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sheet background
    ctx.fillStyle = '#E5E7EB';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.fillRect(offsetX, offsetY, stats.sheetWidth * scale, stats.sheetHeight * scale);
    ctx.strokeRect(offsetX, offsetY, stats.sheetWidth * scale, stats.sheetHeight * scale);

    // Draw sheet dimensions
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${stats.sheetWidth}"`, offsetX + (stats.sheetWidth * scale) / 2, offsetY - 10);
    ctx.save();
    ctx.translate(offsetX - 15, offsetY + (stats.sheetHeight * scale) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${stats.sheetHeight}"`, 0, 0);
    ctx.restore();

    // Draw placed pieces
    placed?.forEach((piece, i) => {
      const x = offsetX + piece.x * scale;
      const y = offsetY + piece.y * scale;
      const w = piece.placedWidth * scale;
      const h = piece.placedHeight * scale;
      const color = PIECE_COLORS[i % PIECE_COLORS.length];

      ctx.fillStyle = color + 'CC';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      const label = piece.label || `Piece ${i + 1}`;
      const dims = `${piece.placedWidth}" × ${piece.placedHeight}"`;
      if (w > 60 && h > 30) {
        ctx.fillText(label.substring(0, 15), x + w / 2, y + h / 2 - 6);
        ctx.font = '10px Arial';
        ctx.fillText(dims, x + w / 2, y + h / 2 + 10);
      } else if (w > 40 && h > 20) {
        ctx.font = '9px Arial';
        ctx.fillText(dims, x + w / 2, y + h / 2 + 3);
      }
    });

    // Draw remnants (green dashed)
    remnants?.forEach(r => {
      const x = offsetX + r.x * scale;
      const y = offsetY + r.y * scale;
      const w = r.width * scale;
      const h = r.height * scale;

      ctx.fillStyle = '#10B98133';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      ctx.fillStyle = '#065F46';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      if (w > 50 && h > 25) {
        ctx.fillText(`${r.width}" × ${r.height}"`, x + w / 2, y + h / 2 - 4);
        ctx.fillText(`(${r.area_sqft} sqft)`, x + w / 2, y + h / 2 + 10);
      }
    });

    // Draw scrap (red)
    (scrap || [])?.forEach(s => {
      const x = offsetX + s.x * scale;
      const y = offsetY + s.y * scale;
      const w = s.width * scale;
      const h = s.height * scale;
      ctx.fillStyle = '#EF444433';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    });
  };

  // Add sheet stock
  const saveSheet = async () => {
    try {
      await api.post(`/api/cutting/sheets`, sheetForm);
      toast.success('Sheet stock added');
      setShowSheetForm(false);
      loadData();
    } catch (err) { toast.error('Failed to add sheet'); }
  };

  // Add remnant
  const saveRemnant = async () => {
    try {
      await api.post(`/api/cutting/remnants`, remnantForm);
      toast.success('Remnant added');
      setShowRemnantForm(false);
      loadData();
    } catch (err) { toast.error('Failed to add remnant'); }
  };

  const scrapRemnant = async (id) => {
    if (!confirm('Scrap this remnant?')) return;
    try {
      await api.post(`/api/cutting/remnants/${id}/scrap`, {});
      toast.success('Remnant scrapped');
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Glass Cutting Optimization</h1>
        {stats && (
          <div className="flex gap-4 text-sm">
            <div className="bg-blue-50 px-3 py-1 rounded border border-blue-200">
              <span className="text-blue-600 font-semibold">{stats.sheets.total}</span> Sheets in Stock
            </div>
            <div className="bg-green-50 px-3 py-1 rounded border border-green-200">
              <span className="text-green-600 font-semibold">{stats.remnants.count}</span> Remnants ({stats.remnants.total_sqft} sqft)
            </div>
            <div className="bg-purple-50 px-3 py-1 rounded border border-purple-200">
              Avg Utilization: <span className="text-purple-600 font-semibold">{stats.plans.avg_utilization}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        {[
          { id: 'optimizer', label: 'Cut Optimizer', icon: '✂️' },
          { id: 'sheets', label: 'Sheet Stock', icon: '📦' },
          { id: 'remnants', label: 'Remnant Inventory', icon: '🔲' },
          { id: 'plans', label: 'Cut Plans History', icon: '📋' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium border-b-2 transition ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* OPTIMIZER TAB */}
      {activeTab === 'optimizer' && (
        <div className="grid grid-cols-12 gap-4">
          {/* Left: Source Selection & Pieces */}
          <div className="col-span-5 space-y-4">
            {/* Source Selection */}
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-2">1. Select Source (Sheet or Remnant)</h3>
              {selectedSource ? (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-blue-800">{selectedSource.label}</div>
                    <div className="text-sm text-blue-600">{selectedSource.glass_type} • {selectedSource.thickness}</div>
                  </div>
                  <button onClick={() => { setSelectedSource(null); setOptimizeResult(null); }} className="text-red-500 text-sm hover:underline">Change</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-2">Select a full sheet or existing remnant to cut from:</p>
                  <div className="max-h-40 overflow-y-auto border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr><th className="p-1 text-left">Type</th><th className="p-1">Size</th><th className="p-1">Glass</th><th className="p-1">Qty</th><th className="p-1"></th></tr>
                      </thead>
                      <tbody>
                        {sheets?.filter(s => s.qty_on_hand > 0)?.map(s => (
                          <tr key={`s-${s.id}`} className="border-t hover:bg-blue-50 cursor-pointer" onClick={() => selectSource('sheet', s)}>
                            <td className="p-1"><span className="bg-blue-100 text-blue-700 px-1 rounded text-xs">Sheet</span></td>
                            <td className="p-1 font-mono">{s.width}" × {s.height}"</td>
                            <td className="p-1">{s.glass_type} {s.thickness}</td>
                            <td className="p-1 text-center">{s.qty_on_hand}</td>
                            <td className="p-1"><button className="text-blue-500">Select</button></td>
                          </tr>
                        ))}
                        {remnants?.map(r => (
                          <tr key={`r-${r.id}`} className="border-t hover:bg-green-50 cursor-pointer" onClick={() => selectSource('remnant', r)}>
                            <td className="p-1"><span className="bg-green-100 text-green-700 px-1 rounded text-xs">Remnant</span></td>
                            <td className="p-1 font-mono">{parseFloat(r.width).toFixed(1)}" × {parseFloat(r.height).toFixed(1)}"</td>
                            <td className="p-1">{r.glass_type} {r.thickness}</td>
                            <td className="p-1 text-center">1</td>
                            <td className="p-1"><button className="text-green-500">Select</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Pieces to Cut */}
            <div className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-700">2. Pieces to Cut</h3>
                {selectedSource && (
                  <button onClick={loadSuggestions} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200">
                    Load from Open WOs
                  </button>
                )}
              </div>

              {/* Add piece form */}
              <div className="grid grid-cols-12 gap-1 mb-2 text-xs">
                <input type="number" placeholder='W"' value={newPiece.width} onChange={e => setNewPiece({ ...newPiece, width: e.target.value })}
                  className="col-span-2 border rounded px-1 py-1" />
                <input type="number" placeholder='H"' value={newPiece.height} onChange={e => setNewPiece({ ...newPiece, height: e.target.value })}
                  className="col-span-2 border rounded px-1 py-1" />
                <input type="text" placeholder="Label" value={newPiece.label} onChange={e => setNewPiece({ ...newPiece, label: e.target.value })}
                  className="col-span-3 border rounded px-1 py-1" />
                <input type="text" placeholder="Customer" value={newPiece.customer} onChange={e => setNewPiece({ ...newPiece, customer: e.target.value })}
                  className="col-span-2 border rounded px-1 py-1" />
                <input type="number" placeholder="Qty" value={newPiece.qty} onChange={e => setNewPiece({ ...newPiece, qty: e.target.value })}
                  className="col-span-1 border rounded px-1 py-1" min="1" />
                <button onClick={addPiece} className="col-span-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">+ Add</button>
              </div>

              {/* Pieces list */}
              <div className="max-h-48 overflow-y-auto border rounded">
                {pieces.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">No pieces added yet</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr><th className="p-1">#</th><th className="p-1">Size</th><th className="p-1">Label</th><th className="p-1">Customer</th><th className="p-1">Qty</th><th className="p-1"></th></tr>
                    </thead>
                    <tbody>
                      {pieces?.map((p, i) => (
                        <tr key={p.id} className="border-t">
                          <td className="p-1 text-center"><span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: PIECE_COLORS[i % PIECE_COLORS.length] }}></span></td>
                          <td className="p-1 font-mono">{p.width}" × {p.height}"</td>
                          <td className="p-1">{p.label}</td>
                          <td className="p-1">{p.customer}</td>
                          <td className="p-1 text-center">{p.qty}</td>
                          <td className="p-1"><button onClick={() => removePiece(p.id)} className="text-red-500">×</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Optimize button */}
              <button onClick={runOptimization} disabled={loading || !selectedSource || pieces.length === 0}
                className="w-full mt-3 bg-green-600 text-white py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Optimizing...' : '⚡ Run Optimization'}
              </button>
            </div>

            {/* Stats */}
            {optimizeResult && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">3. Results</h3>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-green-50 rounded p-2">
                    <div className="text-2xl font-bold text-green-600">{optimizeResult.stats.utilization_pct}%</div>
                    <div className="text-xs text-green-700">Utilization</div>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <div className="text-2xl font-bold text-blue-600">{optimizeResult.stats.totalPieces}</div>
                    <div className="text-xs text-blue-700">Pieces Placed</div>
                  </div>
                  <div className="bg-amber-50 rounded p-2">
                    <div className="text-2xl font-bold text-amber-600">{optimizeResult.stats.remnantCount}</div>
                    <div className="text-xs text-amber-700">Usable Remnants</div>
                  </div>
                </div>

                {optimizeResult.stats.piecesNotFit > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 mb-2 text-sm text-red-700">
                    ⚠️ {optimizeResult.stats.piecesNotFit} piece(s) did not fit on this sheet!
                  </div>
                )}

                {/* Remnants detail */}
                {optimizeResult.remnants.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-gray-600 mb-1">Usable Remnants After Cutting:</h4>
                    {optimizeResult.remnants?.map((r, i) => (
                      <div key={i} className="flex justify-between text-xs bg-green-50 rounded px-2 py-1 mb-1">
                        <span className="font-mono">{r.width}" × {r.height}"</span>
                        <span className="text-green-700">{r.area_sqft} sqft</span>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={saveCutPlan} className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">
                  💾 Save Cut Plan
                </button>
              </div>
            )}
          </div>

          {/* Right: Visual Cut Plan */}
          <div className="col-span-7">
            <div className="bg-white border rounded-lg p-4 h-full">
              <h3 className="font-semibold text-gray-700 mb-2">Visual Cut Plan</h3>
              {optimizeResult ? (
                <div>
                  <canvas ref={canvasRef} width={700} height={550} className="border rounded bg-gray-50 w-full" />
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-3 text-xs">
                    {optimizeResult.placed?.map((p, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: PIECE_COLORS[i % PIECE_COLORS.length] }}></span>
                        <span>{p.label || `Piece ${i + 1}`} ({p.placedWidth}" × {p.placedHeight}")</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded border-2 border-green-500 border-dashed bg-green-100"></span>
                      <span>Usable Remnant</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400">
                  <div className="text-center">
                    <div className="text-6xl mb-4">✂️</div>
                    <p className="text-lg">Select a sheet, add pieces, and run optimization</p>
                    <p className="text-sm mt-2">The visual cut plan will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHEET STOCK TAB */}
      {activeTab === 'sheets' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Sheet Stock Inventory</h2>
            <button onClick={() => setShowSheetForm(true)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">+ Add Sheet Stock</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sheets?.map(s => (
              <div key={s.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">{s.glass_type} {s.thickness}</h3>
                    <p className="text-sm text-gray-500">{s.supplier || 'No supplier'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${s.qty_on_hand > s.min_qty ? 'bg-green-100 text-green-700' : s.qty_on_hand > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                    {s.qty_on_hand} in stock
                  </span>
                </div>
                {/* Visual sheet representation */}
                <div className="flex items-center justify-center my-3">
                  <div className="border-2 border-blue-300 bg-blue-50 flex items-center justify-center"
                    style={{ width: `${Math.min(s.width * 1.2, 120)}px`, height: `${Math.min(s.height * 0.8, 100)}px` }}>
                    <span className="text-xs font-mono text-blue-700">{s.width}" × {s.height}"</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Area: {(s.width * s.height / 144).toFixed(1)} sqft</span>
                  <span>${parseFloat(s.cost_per_sheet).toFixed(2)}/sheet</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{s.location}</div>
              </div>
            ))}
          </div>

          {/* Add Sheet Modal */}
          {showSheetForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold mb-4">Add Sheet Stock</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-gray-600">Glass Type</label>
                      <select value={sheetForm.glass_type} onChange={e => setSheetForm({ ...sheetForm, glass_type: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                        <option>Clear</option><option>Low-E</option><option>Spandrel Black</option><option>Tinted</option><option>Frosted</option>
                      </select></div>
                    <div><label className="text-xs text-gray-600">Thickness</label>
                      <select value={sheetForm.thickness} onChange={e => setSheetForm({ ...sheetForm, thickness: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                        <option>4mm</option><option>5mm</option><option>6mm</option><option>8mm</option><option>10mm</option><option>12mm</option><option>19mm</option>
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-gray-600">Width (inches)</label>
                      <input type="number" value={sheetForm.width} onChange={e => setSheetForm({ ...sheetForm, width: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                    <div><label className="text-xs text-gray-600">Height (inches)</label>
                      <input type="number" value={sheetForm.height} onChange={e => setSheetForm({ ...sheetForm, height: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-gray-600">Quantity</label>
                      <input type="number" value={sheetForm.qty_on_hand} onChange={e => setSheetForm({ ...sheetForm, qty_on_hand: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                    <div><label className="text-xs text-gray-600">Cost/Sheet</label>
                      <input type="number" value={sheetForm.cost_per_sheet} onChange={e => setSheetForm({ ...sheetForm, cost_per_sheet: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                  </div>
                  <div><label className="text-xs text-gray-600">Supplier</label>
                    <input type="text" value={sheetForm.supplier} onChange={e => setSheetForm({ ...sheetForm, supplier: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                  <div><label className="text-xs text-gray-600">Location</label>
                    <input type="text" value={sheetForm.location} onChange={e => setSheetForm({ ...sheetForm, location: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowSheetForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button onClick={saveSheet} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REMNANTS TAB */}
      {activeTab === 'remnants' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Remnant Inventory</h2>
            <button onClick={() => setShowRemnantForm(true)} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">+ Add Remnant</button>
          </div>

          {/* Visual remnant grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {remnants?.map(r => {
              const maxDim = Math.max(parseFloat(r.width), parseFloat(r.height));
              const scale = 120 / maxDim;
              return (
                <div key={r.id} className="bg-white border rounded-lg p-3 hover:shadow-md transition">
                  <div className="flex items-center justify-center h-32 mb-2">
                    <div className={`border-2 flex items-center justify-center ${r.quality === 'good' ? 'border-green-400 bg-green-50' : r.quality === 'fair' ? 'border-amber-400 bg-amber-50' : 'border-red-400 bg-red-50'}`}
                      style={{ width: `${Math.max(parseFloat(r.width) * scale, 30)}px`, height: `${Math.max(parseFloat(r.height) * scale, 30)}px` }}>
                      <span className="text-xs font-mono text-center leading-tight">
                        {parseFloat(r.width).toFixed(0)}"<br />×<br />{parseFloat(r.height).toFixed(0)}"
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">{r.glass_type} {r.thickness}</div>
                    <div className="text-xs text-gray-500">{(parseFloat(r.width) * parseFloat(r.height) / 144).toFixed(1)} sqft</div>
                    <div className="text-xs text-gray-400 mt-1">{r.rack_position || r.location}</div>
                    <div className="flex justify-center gap-1 mt-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${r.quality === 'good' ? 'bg-green-100 text-green-700' : r.quality === 'fair' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {r.quality}
                      </span>
                      <button onClick={() => scrapRemnant(r.id)} className="px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100">Scrap</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {remnants.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🔲</div>
              <p>No remnants in inventory. They will appear here after completing cut plans.</p>
            </div>
          )}

          {/* Add Remnant Modal */}
          {showRemnantForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold mb-4">Add Remnant</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-gray-600">Glass Type</label>
                      <select value={remnantForm.glass_type} onChange={e => setRemnantForm({ ...remnantForm, glass_type: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                        <option>Clear</option><option>Low-E</option><option>Spandrel Black</option><option>Tinted</option><option>Frosted</option>
                      </select></div>
                    <div><label className="text-xs text-gray-600">Thickness</label>
                      <select value={remnantForm.thickness} onChange={e => setRemnantForm({ ...remnantForm, thickness: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                        <option>4mm</option><option>5mm</option><option>6mm</option><option>8mm</option><option>10mm</option><option>12mm</option><option>19mm</option>
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-gray-600">Width (inches)</label>
                      <input type="number" value={remnantForm.width} onChange={e => setRemnantForm({ ...remnantForm, width: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                    <div><label className="text-xs text-gray-600">Height (inches)</label>
                      <input type="number" value={remnantForm.height} onChange={e => setRemnantForm({ ...remnantForm, height: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-xs text-gray-600">Rack Position</label>
                      <input type="text" value={remnantForm.rack_position} onChange={e => setRemnantForm({ ...remnantForm, rack_position: e.target.value })} className="w-full border rounded px-2 py-1 text-sm" /></div>
                    <div><label className="text-xs text-gray-600">Quality</label>
                      <select value={remnantForm.quality} onChange={e => setRemnantForm({ ...remnantForm, quality: e.target.value })} className="w-full border rounded px-2 py-1 text-sm">
                        <option value="good">Good</option><option value="fair">Fair</option><option value="edge_chip">Edge Chip</option>
                      </select></div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => setShowRemnantForm(false)} className="px-4 py-2 border rounded">Cancel</button>
                  <button onClick={saveRemnant} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Save</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CUT PLANS HISTORY TAB */}
      {activeTab === 'plans' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Cut Plans History</h2>
          {plans.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p>No cut plans yet. Create one in the optimizer tab.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Plan #</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Glass</th>
                    <th className="p-2 text-left">Sheet Size</th>
                    <th className="p-2 text-center">Pieces</th>
                    <th className="p-2 text-center">Utilization</th>
                    <th className="p-2 text-center">Status</th>
                    <th className="p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(plans || [])?.map(p => (
                    <tr key={p.id} className="border-t hover:bg-gray-50">
                      <td className="p-2 font-semibold">{p.plan_number}</td>
                      <td className="p-2">{new Date(p.plan_date).toLocaleDateString()}</td>
                      <td className="p-2">{p.glass_type} {p.thickness}</td>
                      <td className="p-2 font-mono">{parseFloat(p.sheet_width).toFixed(0)}" × {parseFloat(p.sheet_height).toFixed(0)}"</td>
                      <td className="p-2 text-center">{p.total_pieces}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${parseFloat(p.utilization_pct) >= 70 ? 'bg-green-100 text-green-700' : parseFloat(p.utilization_pct) >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {parseFloat(p.utilization_pct).toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${p.status === 'completed' ? 'bg-green-100 text-green-700' : p.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {p.status === 'draft' && (
                          <button onClick={() => completePlan(p.id)} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Suggestions Modal */}
      {showSuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Open Work Orders ({selectedSource?.glass_type} {selectedSource?.thickness})</h3>
              <button onClick={() => setShowSuggestions(false)} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
            </div>
            {suggestedPieces.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No open work orders found for this glass type/thickness</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr><th className="p-2 text-left">WO#</th><th className="p-2">Size</th><th className="p-2">Product</th><th className="p-2">Customer</th><th className="p-2">Qty</th><th className="p-2"></th></tr>
                </thead>
                <tbody>
                  {suggestedPieces?.map(wo => (
                    <tr key={wo.wo_id} className="border-t hover:bg-blue-50">
                      <td className="p-2 font-semibold">{wo.order_number}</td>
                      <td className="p-2 font-mono">{wo.width}" × {wo.height}"</td>
                      <td className="p-2">{wo.product_type}</td>
                      <td className="p-2">{wo.customer_name || '-'}</td>
                      <td className="p-2 text-center">{wo.qty_ordered}</td>
                      <td className="p-2"><button onClick={() => addSuggestedPiece(wo)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">Add</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowSuggestions(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}
