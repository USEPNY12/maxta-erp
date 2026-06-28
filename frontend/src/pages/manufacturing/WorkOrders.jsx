import { LabelPrintButton } from "../../components/LabelPrint";
import FileAttachments from '../../components/FileAttachments';
import DocumentActions from '../../components/DocumentActions';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ScanPanel from '../../components/ScanPanel';
import SerialNumbersTab from '../../components/SerialNumbersTab';
import { formatDate } from '../../utils/formatDate';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';

function WorkOrders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [productFilter, setProductFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // cards, table, kanban
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(searchParams.get('new') === 'true');
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Routing');
  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [newWO, setNewWO] = useState({ item_id: '', quantity: '', priority: 'normal', product_type: 'tempered_panel', glass_type: 'Clear Float', thickness: '6', width: '', height: '', edge_type: 'Flat Polish', interlayer_type: '', has_holes: false, has_notches: false, hole_specs: '', notes: '', use_template: true });

  useEffect(() => { fetchOrders(); fetchItems(); fetchTemplates(); }, [statusFilter, productFilter]);

  // Auto-open a specific WO when navigated from Production Schedule or other pages
  useEffect(() => {
    const woId = searchParams.get('wo');
    if (woId) {
      // Change filter to 'all' so the WO is visible regardless of status
      setStatusFilter('all');
      // Fetch and open the specific work order detail
      const openSpecificWO = async () => {
        try {
          const res = await api.get(`/api/manufacturing/work-orders/${woId}`);
          setSelected(res.data);
          setActiveTab('Routing');
          setShowDetail(true);
        } catch (err) {
          toast.error('Could not load work order');
        }
      };
      openSpecificWO();
    }
  }, []);

  const fetchOrders = async () => {
    try { const res = await api.get('/api/manufacturing/work-orders', { params: { search, status: statusFilter, product_type: productFilter || undefined } }); setOrders(Array.isArray(res.data) ? res.data : []); } catch { setOrders([]); }
  };
  const fetchItems = async () => {
    try { const res = await api.get('/api/inventory/items'); setItems(Array.isArray(res.data) ? res.data : []); } catch { setItems([]); }
  };
  const fetchTemplates = async () => {
    try { const res = await api.get('/api/manufacturing/routing-templates'); setTemplates(Array.isArray(res.data) ? res.data : []); } catch { setTemplates([]); }
  };
  const openDetail = async (wo) => {
    try { const res = await api.get(`/api/manufacturing/work-orders/${wo.id}`); setSelected(res.data); setActiveTab('Routing'); setShowDetail(true); } catch { setSelected(wo); setShowDetail(true); }
  };
  const handleCreateWO = async () => {
    try {
      const payload = { ...newWO, item_id: parseInt(newWO.item_id), quantity: parseFloat(newWO.quantity), thickness: parseFloat(newWO.thickness) || null, width: parseFloat(newWO.width) || null, height: parseFloat(newWO.height) || null, has_holes: newWO.has_holes ? 1 : 0, has_notches: newWO.has_notches ? 1 : 0 };
      await api.post('/api/manufacturing/work-orders', payload);
      toast.success('Work Order created with routing');
      setShowNew(false); fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create WO'); }
  };
  const handleAction = async (action) => {
    try { await api.post(`/api/manufacturing/work-orders/${selected.id}/${action}`); toast.success(`Work Order ${action}d`); openDetail(selected); fetchOrders(); } catch (err) { toast.error(err.response?.data?.error || `Failed to ${action}`); }
  };

  // Colors & Labels
  const priorityConfig = { urgent: { color: '#dc2626', bg: '#fef2f2', label: 'URGENT', border: '#dc2626' }, high: { color: '#ea580c', bg: '#fff7ed', label: 'HIGH', border: '#ea580c' }, normal: { color: '#2563eb', bg: '#eff6ff', label: 'NORMAL', border: '#2563eb' }, low: { color: '#6b7280', bg: '#f9fafb', label: 'LOW', border: '#9ca3af' } };
  const statusConfig = { planned: { color: '#6b7280', bg: '#f3f4f6', label: 'Planned', icon: '📋' }, scheduled: { color: '#2563eb', bg: '#dbeafe', label: 'Scheduled', icon: '📅' }, released: { color: '#7c3aed', bg: '#ede9fe', label: 'Released', icon: '🚀' }, in_progress: { color: '#d97706', bg: '#fef3c7', label: 'In Progress', icon: '⚙️' }, completed: { color: '#059669', bg: '#d1fae5', label: 'Completed', icon: '✅' }, closed: { color: '#374151', bg: '#e5e7eb', label: 'Closed', icon: '🔒' } };
  const glassTypeColors = { 'Clear Float': '#e0f2fe', 'Low Iron': '#f0fdf4', 'Low-E': '#dcfce7', 'Tinted Gray': '#e5e7eb', 'Tinted Bronze': '#fef3c7', 'Tinted Green': '#d1fae5', 'Reflective': '#dbeafe', 'Patterned': '#fce7f3', 'Wired': '#e5e7eb', 'Spandrel Black': '#374151' };
  const productTypes = [{ value: 'tempered_panel', label: 'Tempered Panel', icon: '🔥' }, { value: 'laminated', label: 'Laminated Glass', icon: '🧱' }, { value: 'tempered_laminated', label: 'Tempered Laminated', icon: '🔥🧱' }, { value: 'igu', label: 'Standard IGU', icon: '🪟' }, { value: 'igu_low_e', label: 'Low-E IGU', icon: '🪟' }, { value: 'low_e_igu', label: 'Low-E IGU', icon: '🪟' }, { value: 'heat_soaked', label: 'Heat Soaked', icon: '♨️' }, { value: 'custom', label: 'Custom', icon: '⚙️' }];

  const getProductLabel = (type) => productTypes?.find(p => p.value === type)?.label || type?.replace(/_/g, ' ') || 'Custom';
  const getProductIcon = (type) => productTypes?.find(p => p.value === type)?.icon || '⚙️';
  const getGlassColor = (type) => glassTypeColors[type] || '#f3f4f6';
  const isOverdue = (date) => date && new Date(date) < new Date();
  const daysUntilDue = (date) => { if (!date) return null; const diff = Math.ceil((new Date(date) - new Date()) / (1000*60*60*24)); return diff; };

  // Calculate routing progress
  const getProgress = (wo) => {
    if (wo.status === 'completed' || wo.status === 'closed') return 100;
    if (wo.status === 'planned') return 0;
    // Estimate based on station position (rough)
    if (wo.current_station_name) {
      const stations = ['Cutting', 'Edge', 'CNC', 'Wash', 'Temper', 'Laminate', 'IGU', 'HST', 'QC', 'Pack'];
      const idx = stations.findIndex(s => wo.current_station_name?.toLowerCase().includes(s.toLowerCase()));
      if (idx >= 0) return Math.round(((idx + 1) / stations.length) * 100);
    }
    return wo.status === 'in_progress' ? 50 : 10;
  };

  // Summary stats
  const stats = {
    total: orders.length,
    inProgress: orders?.filter(o => o.status === 'in_progress').length,
    planned: orders?.filter(o => o.status === 'planned' || o.status === 'scheduled').length,
    overdue: orders?.filter(o => isOverdue(o.finish_date) && o.status !== 'completed' && o.status !== 'closed').length,
    urgent: orders?.filter(o => o.priority === 'urgent' || o.priority === 'high').length
  };

  // ===== CARD VIEW =====
  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
      {(orders || [])?.map(wo => {
        const pri = priorityConfig[wo.priority] || priorityConfig.normal;
        const st = statusConfig[wo.status] || statusConfig.planned;
        const progress = getProgress(wo);
        const due = daysUntilDue(wo.finish_date);
        const overdue = isOverdue(wo.finish_date) && wo.status !== 'completed' && wo.status !== 'closed';
        return (
          <div key={wo.id} className="bg-white rounded-lg shadow-sm border cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden" onClick={() => openDetail(wo)}>
            {/* Priority stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: pri.border }} />
            
            {/* Header */}
            <div className="pl-4 pr-3 pt-3 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-gray-900">{wo.order_number || `WO-${wo.id}`}</span>
                    <span className="text-lg">{getProductIcon(wo.product_type)}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-700 mt-0.5">{getProductLabel(wo.product_type)}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ backgroundColor: pri.bg, color: pri.color }}>{pri.label}</span>
                </div>
              </div>
            </div>

            {/* Glass Visual */}
            <div className="px-4 py-2">
              <div className="flex items-center gap-3">
                {/* Glass rectangle - proportional */}
                <div className="flex-shrink-0 flex items-center justify-center" style={{ width: '70px', height: '50px' }}>
                  <div className="border-2 border-gray-400 rounded-sm flex items-center justify-center text-[9px] font-bold text-gray-600"
                    style={{ 
                      width: `${Math.min(65, Math.max(30, (wo.width || 48) / 96 * 65))}px`, 
                      height: `${Math.min(48, Math.max(20, (wo.height || 48) / 96 * 48))}px`,
                      backgroundColor: getGlassColor(wo.glass_type),
                      borderColor: wo.glass_type === 'Spandrel Black' ? '#1f2937' : '#9ca3af'
                    }}>
                    {wo.width && wo.height ? `${wo.width}"×${wo.height}"` : '-'}
                  </div>
                </div>
                {/* Specs */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">{wo.item_description || wo.item_number || 'Glass Panel'}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-600">
                    <span><strong>Glass:</strong> {wo.glass_type || '-'}</span>
                    <span><strong>Thick:</strong> {wo.thickness || '-'}</span>
                    <span><strong>Edge:</strong> {wo.edge_type || '-'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-lg font-black text-gray-900">×{wo.quantity}</span>
                    {wo.has_holes === 1 && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">HOLES</span>}
                    {wo.has_notches === 1 && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">NOTCHES</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-4 py-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#059669' : progress > 50 ? '#d97706' : '#2563eb' }} />
                </div>
                <span className="text-[10px] font-bold text-gray-500 w-8 text-right">{progress}%</span>
              </div>
              {wo.current_station_name && <div className="text-[10px] text-gray-500 mt-0.5">At: <strong>{wo.station_icon} {wo.current_station_name}</strong></div>}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t bg-gray-50 flex justify-between items-center text-xs">
              <div className="text-gray-600">
                {wo.customer_name ? <span className="font-medium">{wo.customer_name}</span> : <span className="text-gray-400">No customer</span>}
                {wo.so_number && <span className="text-gray-400 ml-1">({wo.so_number})</span>}
              </div>
              <div className={`font-bold ${overdue ? 'text-red-600' : due !== null && due <= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
                {wo.finish_date ? (overdue ? `OVERDUE ${Math.abs(due)}d` : due === 0 ? 'DUE TODAY' : `Due ${due}d`) : 'No date'}
              </div>
            </div>
          </div>
        );
      })}
      {orders.length === 0 && <div className="col-span-full text-center text-gray-500 py-12 text-lg">No work orders found</div>}
    </div>
  );

  // ===== TABLE VIEW =====
  const renderTableView = () => (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-gray-100 sticky top-0">
          <tr className="text-left text-xs font-bold text-gray-600 uppercase">
            <th className="px-3 py-2 w-8"></th>
            <th className="px-3 py-2">WO#</th>
            <th className="px-3 py-2">What's Being Made</th>
            <th className="px-3 py-2">Glass Specs</th>
            <th className="px-3 py-2 text-center">Size</th>
            <th className="px-3 py-2 text-center">Qty</th>
            <th className="px-3 py-2">Progress</th>
            <th className="px-3 py-2">Station</th>
            <th className="px-3 py-2">Customer</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {(orders || [])?.map(wo => {
            const pri = priorityConfig[wo.priority] || priorityConfig.normal;
            const st = statusConfig[wo.status] || statusConfig.planned;
            const progress = getProgress(wo);
            const overdue = isOverdue(wo.finish_date) && wo.status !== 'completed' && wo.status !== 'closed';
            const due = daysUntilDue(wo.finish_date);
            const isExpanded = expandedRow === wo.id;
            return (
              <React.Fragment key={wo.id}>
                <tr className={`border-b hover:bg-blue-50 cursor-pointer ${overdue ? 'bg-red-50/30' : ''}`} onClick={() => openDetail(wo)}>
                  {/* Priority indicator */}
                  <td className="px-1 py-2">
                    <div className="w-3 h-8 rounded-sm" style={{ backgroundColor: pri.border }} title={pri.label} />
                  </td>
                  {/* WO# */}
                  <td className="px-3 py-2">
                    <div className="font-bold text-blue-700">{wo.order_number || `WO-${wo.id}`}</div>
                    <div className="text-[10px] text-gray-500">{getProductIcon(wo.product_type)} {getProductLabel(wo.product_type)}</div>
                  </td>
                  {/* What's Being Made */}
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{wo.item_description || wo.item_number || 'Glass Panel'}</div>
                    <div className="text-[10px] text-gray-500">{wo.item_number}</div>
                  </td>
                  {/* Glass Specs */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm border" style={{ backgroundColor: getGlassColor(wo.glass_type) }} />
                      <span className="text-xs">{wo.glass_type || '-'}</span>
                    </div>
                    <div className="text-[10px] text-gray-500">{wo.thickness || '-'} | {wo.edge_type || '-'}</div>
                  </td>
                  {/* Size */}
                  <td className="px-3 py-2 text-center">
                    <span className="font-bold text-sm">{wo.width && wo.height ? `${wo.width}"×${wo.height}"` : '-'}</span>
                  </td>
                  {/* Qty */}
                  <td className="px-3 py-2 text-center">
                    <span className="text-lg font-black">{wo.quantity}</span>
                  </td>
                  {/* Progress */}
                  <td className="px-3 py-2">
                    <div className="w-20">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#059669' : progress > 50 ? '#d97706' : '#2563eb' }} />
                      </div>
                      <div className="text-[10px] text-gray-500 text-center mt-0.5">{progress}%</div>
                    </div>
                  </td>
                  {/* Station */}
                  <td className="px-3 py-2">
                    <span className="text-xs">{wo.station_icon} {wo.current_station_name || '-'}</span>
                  </td>
                  {/* Customer */}
                  <td className="px-3 py-2">
                    <div className="text-xs font-medium">{wo.customer_name || '-'}</div>
                    {wo.so_number && <div className="text-[10px] text-gray-400">{wo.so_number}</div>}
                  </td>
                  {/* Due */}
                  <td className="px-3 py-2">
                    <div className={`text-xs font-bold ${overdue ? 'text-red-600' : due !== null && due <= 3 ? 'text-amber-600' : 'text-gray-600'}`}>
                      {wo.finish_date ? formatDate(wo.finish_date) : '-'}
                    </div>
                    {overdue && <div className="text-[10px] text-red-500 font-bold">OVERDUE</div>}
                  </td>
                  {/* Status */}
                  <td className="px-3 py-2">
                    <span className="text-[10px] px-2 py-1 rounded-full font-bold whitespace-nowrap" style={{ backgroundColor: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {orders.length === 0 && <div className="text-center text-gray-500 py-12 text-lg">No work orders found</div>}
    </div>
  );

  // ===== KANBAN VIEW =====
  const renderKanbanView = () => {
    const columns = [
      { key: 'planned', label: 'Planned', statuses: ['planned', 'scheduled'] },
      { key: 'released', label: 'Released', statuses: ['released'] },
      { key: 'in_progress', label: 'In Progress', statuses: ['in_progress'] },
      { key: 'completed', label: 'Completed', statuses: ['completed'] }
    ];
    return (
      <div className="flex gap-3 p-4 overflow-x-auto h-full">
        {columns?.map(col => {
          const colOrders = orders?.filter(o => col.statuses?.includes(o.status));
          const colSt = statusConfig[col.key] || statusConfig.planned;
          return (
            <div key={col.key} className="flex-shrink-0 w-72 bg-gray-50 rounded-lg border flex flex-col">
              {/* Column header */}
              <div className="px-3 py-2 border-b flex items-center justify-between" style={{ backgroundColor: colSt.bg }}>
                <span className="font-bold text-sm" style={{ color: colSt.color }}>{colSt.icon} {col.label}</span>
                <span className="text-xs font-bold bg-white rounded-full px-2 py-0.5 text-gray-600">{colOrders.length}</span>
              </div>
              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colOrders?.map(wo => {
                  const pri = priorityConfig[wo.priority] || priorityConfig.normal;
                  const overdue = isOverdue(wo.finish_date) && wo.status !== 'completed';
                  return (
                    <div key={wo.id} className="bg-white rounded border shadow-sm cursor-pointer hover:shadow-md transition-shadow p-2 relative overflow-hidden" onClick={() => openDetail(wo)}>
                      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: pri.border }} />
                      <div className="pl-2">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs text-blue-700">{wo.order_number}</span>
                          <span className="text-[9px] px-1 py-0.5 rounded font-bold" style={{ backgroundColor: pri.bg, color: pri.color }}>{pri.label}</span>
                        </div>
                        <div className="text-xs font-medium text-gray-800 mt-1 truncate">{wo.item_description || getProductLabel(wo.product_type)}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-6 h-4 border rounded-sm" style={{ backgroundColor: getGlassColor(wo.glass_type), borderColor: '#9ca3af' }} />
                          <span className="text-[10px] text-gray-600">{wo.glass_type} {wo.thickness}</span>
                          <span className="text-[10px] font-bold">{wo.width}"×{wo.height}"</span>
                        </div>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-xs font-black">×{wo.quantity}</span>
                          <span className={`text-[9px] font-bold ${overdue ? 'text-red-600' : 'text-gray-500'}`}>{wo.finish_date ? (overdue ? 'OVERDUE' : formatDate(wo.finish_date)) : ''}</span>
                        </div>
                        {wo.customer_name && <div className="text-[10px] text-gray-500 mt-1 truncate">{wo.customer_name}</div>}
                      </div>
                    </div>
                  );
                })}
                {colOrders.length === 0 && <div className="text-center text-gray-400 text-xs py-4">No orders</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex flex-col">
      {/* Summary Bar */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-black text-gray-900">{stats.total}</span>
          <span className="text-xs text-gray-500">Work Orders</span>
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500" /><span className="font-bold">{stats.inProgress}</span> <span className="text-gray-500">In Progress</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="font-bold">{stats.planned}</span> <span className="text-gray-500">Planned</span></div>
          {stats.overdue > 0 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="font-bold text-red-600">{stats.overdue}</span> <span className="text-red-500">Overdue</span></div>}
          {stats.urgent > 0 && <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500" /><span className="font-bold text-orange-600">{stats.urgent}</span> <span className="text-orange-500">Urgent/High</span></div>}
        </div>
      </div>

      {/* Toolbar */}
      <div className="erp-toolbar flex items-center gap-2 flex-wrap">
        <button className="erp-toolbar-btn bg-green-50 border-green-300 text-green-700 font-bold" onClick={() => setShowNew(true)}>+ New WO</button>
        <div className="erp-toolbar-separator" />
        
        {/* View Mode Toggle */}
        <div className="flex rounded border overflow-hidden">
          <button className={`px-3 py-1 text-xs font-bold ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`} onClick={() => setViewMode('cards')} title="Card View">▦ Cards</button>
          <button className={`px-3 py-1 text-xs font-bold border-l ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`} onClick={() => setViewMode('table')} title="Table View">☰ Table</button>
          <button className={`px-3 py-1 text-xs font-bold border-l ${viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`} onClick={() => setViewMode('kanban')} title="Kanban View">▥ Kanban</button>
        </div>
        <div className="erp-toolbar-separator" />

        {/* Filters */}
        <select className="erp-form-select text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="open">All Open</option>
          <option value="planned">Planned</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="all">All</option>
        </select>
        <select className="erp-form-select text-xs" value={productFilter} onChange={e => setProductFilter(e.target.value)}>
          <option value="">All Products</option>
          {productTypes?.map(pt => <option key={pt.value} value={pt.value}>{pt.icon} {pt.label}</option>)}
        </select>
        <input className="erp-form-input text-xs w-48" placeholder="Search WO#, item, customer..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()} />
        <button className="erp-toolbar-btn text-xs" onClick={fetchOrders}>🔍 Find</button>
        <button className="erp-toolbar-btn text-xs" onClick={fetchOrders}>↻ Refresh</button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-100">
        {viewMode === 'cards' && renderCardView()}
        {viewMode === 'table' && renderTableView()}
        {viewMode === 'kanban' && renderKanbanView()}
      </div>

      {/* Detail Panel */}
      {showDetail && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 pt-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-2xl w-[950px] max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white px-5 py-4 sticky top-0 z-10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{selected.order_number || `WO-${selected.id}`}</h3>
                    <span className="text-sm px-2 py-0.5 rounded-full" style={{ backgroundColor: (statusConfig[selected.status] || {}).bg, color: (statusConfig[selected.status] || {}).color }}>{(statusConfig[selected.status] || {}).icon} {(statusConfig[selected.status] || {}).label}</span>
                    <span className="text-sm px-2 py-0.5 rounded" style={{ backgroundColor: (priorityConfig[selected.priority] || {}).bg, color: (priorityConfig[selected.priority] || {}).color }}>{(priorityConfig[selected.priority] || {}).label}</span>
                  </div>
                  <p className="text-gray-300 text-sm mt-1">{selected.item_description || selected.item_number} | {getProductLabel(selected.product_type)}</p>
                </div>
                <div className="flex gap-2 items-center">
                  {selected.status === 'planned' && <button className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-1.5 rounded font-bold" onClick={() => handleAction('release')}>Release</button>}
                  {selected.status === 'scheduled' && <button className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-1.5 rounded font-bold" onClick={() => handleAction('start')}>Start</button>}
                  {['in_progress','scheduled','released'].includes(selected.status) && <button className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded font-bold" onClick={() => handleAction('complete')}>Complete</button>}
                  <LabelPrintButton type="work-order" id={selected.id} size="large" label="Print Production Label" />
                  <button className="text-gray-400 hover:text-white text-2xl px-2 ml-2" onClick={() => setShowDetail(false)}>×</button>
                </div>
              </div>
            </div>

            {/* Glass Specs Banner */}
            <div className="px-5 py-3 bg-blue-50 border-b grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
              <div className="text-center"><div className="text-gray-500 text-[10px]">GLASS TYPE</div><div className="font-bold">{selected.glass_type || '-'}</div></div>
              <div className="text-center"><div className="text-gray-500 text-[10px]">THICKNESS</div><div className="font-bold">{selected.thickness}{String(selected.thickness || '').includes('mm') ? '' : 'mm'}</div></div>
              <div className="text-center"><div className="text-gray-500 text-[10px]">SIZE (W×H)</div><div className="font-bold">{selected.width}" × {selected.height}"</div></div>
              <div className="text-center"><div className="text-gray-500 text-[10px]">EDGE</div><div className="font-bold">{selected.edge_type || '-'}</div></div>
              <div className="text-center"><div className="text-gray-500 text-[10px]">QUANTITY</div><div className="font-bold text-lg">{selected.quantity}</div></div>
              <div className="text-center"><div className="text-gray-500 text-[10px]">STATION</div><div className="font-bold">{selected.station_icon} {selected.current_station_name || '-'}</div></div>
              <div className="text-center"><div className="text-gray-500 text-[10px]">HOLES</div><div className="font-bold">{selected.has_holes ? '✓ Yes' : 'No'}</div></div>
              <div className="text-center"><div className="text-gray-500 text-[10px]">INTERLAYER</div><div className="font-bold">{selected.interlayer_type || '-'}</div></div>
            </div>

            {/* Customer/SO info */}
            {(selected.customer_name || selected.so_number) && (
              <div className="px-5 py-2 bg-gray-50 border-b flex gap-6 text-xs">
                {selected.customer_name && <div><span className="text-gray-500">Customer:</span> <strong>{selected.customer_name}</strong></div>}
                {selected.so_number && <div><span className="text-gray-500">Sales Order:</span> <strong>{selected.so_number}</strong></div>}
                {selected.finish_date && <div><span className="text-gray-500">Due Date:</span> <strong className={isOverdue(selected.finish_date) ? 'text-red-600' : ''}>{formatDate(selected.finish_date)}</strong></div>}
              </div>
            )}

            {/* Tabs */}
            <div className="border-b flex px-2">
              {['Routing', 'Materials', 'Labor', 'Files & CNC', 'Tracking', 'QC', 'Recuts', 'Receipts', 'Serials', 'Scan Station'].map(tab => (
                <button key={tab} className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`} onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-5 min-h-[300px]">
              {activeTab === 'Routing' && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Production Routing Steps</h4>
                  <div className="space-y-2">
                    {(selected.routing || [])?.map((r, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${r.status === 'complete' ? 'bg-green-50 border-green-200' : r.status === 'in_progress' ? 'bg-yellow-50 border-yellow-300 shadow-sm' : 'bg-white border-gray-200'}`}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow" style={{ backgroundColor: r.color || '#6b7280' }}>{r.icon || (i+1)}</div>
                        <div className="flex-1">
                          <div className="font-bold text-sm">{r.work_center_name} <span className="text-gray-400 font-normal text-xs">({r.work_center_code})</span></div>
                          <div className="text-xs text-gray-600">{r.operation_description}</div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${r.status === 'complete' ? 'bg-green-100 text-green-700' : r.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{r.status === 'complete' ? '✓ Done' : r.status === 'in_progress' ? '⚙️ Active' : '○ Pending'}</span>
                          {r.qc_required === 1 && <div className="text-[10px] text-amber-600 mt-1 font-bold">⚠ QC Required</div>}
                        </div>
                      </div>
                    ))}
                    {(!selected.routing || selected.routing.length === 0) && <p className="text-gray-500 text-sm text-center py-8">No routing defined for this work order</p>}
                  </div>
                </div>
              )}
              {activeTab === 'Materials' && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Bill of Materials</h4>
                  <table className="w-full text-sm border"><thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Item#</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2">UOM</th><th className="px-3 py-2">Required</th><th className="px-3 py-2">Issued</th><th className="px-3 py-2">Remaining</th></tr></thead>
                  <tbody>{(selected.materials || [])?.map((m, i) => (<tr key={i} className="border-t"><td className="px-3 py-2 font-medium">{m.item_number}</td><td className="px-3 py-2">{m.item_description}</td><td className="px-3 py-2 text-center">{m.uom}</td><td className="px-3 py-2 text-center font-bold">{m.quantity_required}</td><td className="px-3 py-2 text-center">{m.quantity_issued || 0}</td><td className="px-3 py-2 text-center font-bold text-amber-600">{(m.quantity_required - (m.quantity_issued || 0)) || 0}</td></tr>))}
                  {(!selected.materials || selected.materials.length === 0) && <tr><td colSpan="6" className="text-center text-gray-500 py-8">No materials assigned</td></tr>}</tbody></table>
                </div>
              )}
              {activeTab === 'Labor' && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Labor Time Log</h4>
                  <table className="w-full text-sm border"><thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Station</th><th className="px-3 py-2">Hours</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Notes</th></tr></thead>
                  <tbody>{(selected.labor || [])?.map((l, i) => (<tr key={i} className="border-t"><td className="px-3 py-2">{formatDate(l.work_date)}</td><td className="px-3 py-2">{l.work_center_name}</td><td className="px-3 py-2 text-center font-bold">{l.hours}h</td><td className="px-3 py-2">{l.labor_type}</td><td className="px-3 py-2 text-gray-600">{l.notes}</td></tr>))}
                  {(!selected.labor || selected.labor.length === 0) && <tr><td colSpan="5" className="text-center text-gray-500 py-8">No labor logged</td></tr>}</tbody></table>
                </div>
              )}
              {activeTab === 'Files & CNC' && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Fabrication Files & CNC Programs</h4>
                  <p className="text-xs text-gray-500 mb-3">Download files for your machine. Select your machine type to filter.</p>
                  <FileAttachments documentType="work_order" documentId={selected.id} readOnly={false} />
                </div>
              )}
              {activeTab === 'Tracking' && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Station Tracking History</h4>
                  <table className="w-full text-sm border"><thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Station</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-left">Started</th><th className="px-3 py-2 text-left">Completed</th><th className="px-3 py-2">Qty Good</th><th className="px-3 py-2">Qty Scrap</th></tr></thead>
                  <tbody>{(selected.tracking || [])?.map((t, i) => (<tr key={i} className="border-t"><td className="px-3 py-2">{t.station_icon} {t.station_name}</td><td className="px-3 py-2 text-center"><span className={`text-xs px-2 py-0.5 rounded ${t.status === 'complete' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span></td><td className="px-3 py-2">{formatDate(t.started_at)}</td><td className="px-3 py-2">{formatDate(t.completed_at)}</td><td className="px-3 py-2 text-center font-bold text-green-700">{t.quantity_good || '-'}</td><td className="px-3 py-2 text-center font-bold text-red-600">{t.quantity_scrap || '-'}</td></tr>))}
                  {(!selected.tracking || selected.tracking.length === 0) && <tr><td colSpan="6" className="text-center text-gray-500 py-8">No tracking data</td></tr>}</tbody></table>
                </div>
              )}
              {activeTab === 'QC' && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Quality Control Inspections</h4>
                  <table className="w-full text-sm border"><thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Station</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Inspected</th><th className="px-3 py-2">Failed</th><th className="px-3 py-2 text-left">Defect</th></tr></thead>
                  <tbody>{(selected.qc_inspections || [])?.map((q, i) => (<tr key={i} className={`border-t ${q.result === 'fail' ? 'bg-red-50' : ''}`}><td className="px-3 py-2">{formatDate(q.inspection_date)}</td><td className="px-3 py-2">{q.work_center_name}</td><td className="px-3 py-2 text-center">{q.inspection_type}</td><td className="px-3 py-2 text-center"><span className={`font-bold ${q.result === 'pass' ? 'text-green-700' : 'text-red-700'}`}>{q.result === 'pass' ? '✓ PASS' : '✗ FAIL'}</span></td><td className="px-3 py-2 text-center">{q.quantity_inspected}</td><td className="px-3 py-2 text-center font-bold text-red-600">{q.quantity_failed}</td><td className="px-3 py-2">{q.defect_type}</td></tr>))}
                  {(!selected.qc_inspections || selected.qc_inspections.length === 0) && <tr><td colSpan="7" className="text-center text-gray-500 py-8">No inspections recorded</td></tr>}</tbody></table>
                </div>
              )}
              {activeTab === 'Recuts' && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Recuts / Rework</h4>
                  <table className="w-full text-sm border"><thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Station</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2 text-left">Reason</th><th className="px-3 py-2 text-left">Notes</th></tr></thead>
                  <tbody>{(selected.recuts || [])?.map((r, i) => (<tr key={i} className="border-t bg-red-50/30"><td className="px-3 py-2">{formatDate(r.reported_at)}</td><td className="px-3 py-2">{r.work_center_name}</td><td className="px-3 py-2 text-center font-bold text-red-600">{r.quantity}</td><td className="px-3 py-2">{r.reason_code}</td><td className="px-3 py-2 text-gray-600">{r.notes}</td></tr>))}
                  {(!selected.recuts || selected.recuts.length === 0) && <tr><td colSpan="5" className="text-center text-gray-500 py-8">No recuts recorded</td></tr>}</tbody></table>
                </div>
              )}
              {activeTab === 'Receipts' && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Production Receipts</h4>
                  <table className="w-full text-sm border"><thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left">Receipt#</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2">Qty Completed</th><th className="px-3 py-2">Qty Scrapped</th><th className="px-3 py-2">Total Cost</th></tr></thead>
                  <tbody>{(selected.receipts || [])?.map((r, i) => (<tr key={i} className="border-t"><td className="px-3 py-2 font-medium">{r.receipt_number}</td><td className="px-3 py-2">{formatDate(r.receipt_date)}</td><td className="px-3 py-2 text-center font-bold text-green-700">{r.quantity_completed}</td><td className="px-3 py-2 text-center font-bold text-red-600">{r.quantity_scrapped}</td><td className="px-3 py-2 text-center">${r.total_cost || 0}</td></tr>))}
                  {(!selected.receipts || selected.receipts.length === 0) && <tr><td colSpan="5" className="text-center text-gray-500 py-8">No receipts recorded</td></tr>}</tbody></table>
                </div>
              )}
              {activeTab === 'Serials' && (
                <SerialNumbersTab workOrderId={selected?.id} />
              )}
              {activeTab === 'Scan Station' && (
                <div style={{padding:'16px', backgroundColor:'#1a1a2e', borderRadius:'8px'}}>
                  <ScanPanel 
                    mode="production" 
                    title="Production Station Scanner" 
                    context={{ station: 'general', action: 'complete' }}
                    onScanResult={(r) => { console.log('Production scan:', r); }}
                  />
                  <div style={{marginTop:'12px', display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px'}}>
                    <button onClick={() => {}} style={{padding:'8px', backgroundColor:'#1565c0', color:'#fff', border:'none', borderRadius:'4px', fontSize:'11px', fontWeight:'bold'}}>Cutting Table</button>
                    <button onClick={() => {}} style={{padding:'8px', backgroundColor:'#2e7d32', color:'#fff', border:'none', borderRadius:'4px', fontSize:'11px', fontWeight:'bold'}}>CNC Machine</button>
                    <button onClick={() => {}} style={{padding:'8px', backgroundColor:'#e65100', color:'#fff', border:'none', borderRadius:'4px', fontSize:'11px', fontWeight:'bold'}}>Edging / Polish</button>
                    <button onClick={() => {}} style={{padding:'8px', backgroundColor:'#6a1b9a', color:'#fff', border:'none', borderRadius:'4px', fontSize:'11px', fontWeight:'bold'}}>Tempering</button>
                    <button onClick={() => {}} style={{padding:'8px', backgroundColor:'#00838f', color:'#fff', border:'none', borderRadius:'4px', fontSize:'11px', fontWeight:'bold'}}>QC / Inspection</button>
                    <button onClick={() => {}} style={{padding:'8px', backgroundColor:'#4e342e', color:'#fff', border:'none', borderRadius:'4px', fontSize:'11px', fontWeight:'bold'}}>Packaging</button>
                  </div>
                  <div style={{color:'#888', fontSize:'11px', marginTop:'8px'}}>
                    Select your station above, then scan work order barcodes as pieces complete at your station. Each scan logs the piece as completed at that production step.
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* New Work Order Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 pt-4 overflow-auto">
          <div className="bg-white rounded-lg shadow-2xl w-[750px] max-h-[90vh] overflow-auto">
            <div className="bg-gradient-to-r from-green-700 to-green-600 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">New Work Order - Glass Fabrication</h3>
              <button className="text-green-200 hover:text-white text-2xl" onClick={() => setShowNew(false)}>×</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Product Type & Item */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-700 block mb-1">Product Type *</label>
                  <select className="erp-form-select w-full" value={newWO.product_type} onChange={e => setNewWO({...newWO, product_type: e.target.value})}>
                    {productTypes?.map(pt => <option key={pt.value} value={pt.value}>{pt.icon} {pt.label}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-bold text-gray-700 block mb-1">Item *</label>
                  <select className="erp-form-select w-full" value={newWO.item_id} onChange={e => setNewWO({...newWO, item_id: e.target.value})}>
                    <option value="">Select item...</option>
                    {(items || [])?.map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}
                  </select>
                </div>
              </div>

              {/* Glass Specifications */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30">
                <h4 className="font-bold text-sm text-blue-800 mb-3">Glass Specifications</h4>
                <div className="grid grid-cols-4 gap-3">
                  <div><label className="text-[10px] text-gray-600 font-bold block mb-0.5">Glass Type</label><select className="erp-form-select w-full text-xs" value={newWO.glass_type} onChange={e => setNewWO({...newWO, glass_type: e.target.value})}>
                    <option>Clear Float</option><option>Low Iron</option><option>Tinted Gray</option><option>Tinted Bronze</option><option>Tinted Green</option><option>Low-E</option><option>Reflective</option><option>Patterned</option><option>Wired</option>
                  </select></div>
                  <div><label className="text-[10px] text-gray-600 font-bold block mb-0.5">Thickness (mm)</label><input type="number" className="erp-form-input w-full text-xs" value={newWO.thickness} onChange={e => setNewWO({...newWO, thickness: e.target.value})} /></div>
                  <div><label className="text-[10px] text-gray-600 font-bold block mb-0.5">Width (inches)</label><input type="number" className="erp-form-input w-full text-xs" value={newWO.width} onChange={e => setNewWO({...newWO, width: e.target.value})} /></div>
                  <div><label className="text-[10px] text-gray-600 font-bold block mb-0.5">Height (inches)</label><input type="number" className="erp-form-input w-full text-xs" value={newWO.height} onChange={e => setNewWO({...newWO, height: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div><label className="text-[10px] text-gray-600 font-bold block mb-0.5">Edge Type</label><select className="erp-form-select w-full text-xs" value={newWO.edge_type} onChange={e => setNewWO({...newWO, edge_type: e.target.value})}>
                    <option>Flat Polish</option><option>Pencil Polish</option><option>Beveled</option><option>Seamed</option><option>Mitered</option><option>OG Edge</option><option>Waterfall</option>
                  </select></div>
                  <div><label className="text-[10px] text-gray-600 font-bold block mb-0.5">Interlayer (if laminated)</label><select className="erp-form-select w-full text-xs" value={newWO.interlayer_type} onChange={e => setNewWO({...newWO, interlayer_type: e.target.value})}>
                    <option value="">N/A</option><option>PVB Clear</option><option>PVB White</option><option>PVB Color</option><option>SGP</option><option>EVA</option>
                  </select></div>
                  <div><label className="text-[10px] text-gray-600 font-bold block mb-0.5">Quantity *</label><input type="number" className="erp-form-input w-full text-xs" value={newWO.quantity} onChange={e => setNewWO({...newWO, quantity: e.target.value})} placeholder="How many pieces" /></div>
                </div>
              </div>

              {/* Fabrication Options */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-bold text-sm text-gray-700 mb-2">Fabrication Options</h4>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" className="w-4 h-4" checked={newWO.has_holes} onChange={e => setNewWO({...newWO, has_holes: e.target.checked})} /> Holes Required</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" className="w-4 h-4" checked={newWO.has_notches} onChange={e => setNewWO({...newWO, has_notches: e.target.checked})} /> Notches Required</label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" className="w-4 h-4" checked={newWO.use_template} onChange={e => setNewWO({...newWO, use_template: e.target.checked})} /> Auto-Populate Routing</label>
                </div>
                {newWO.has_holes && <div className="mt-2"><label className="text-[10px] text-gray-600 font-bold block mb-0.5">Hole Specifications</label><input className="erp-form-input w-full text-xs" placeholder="e.g., 4 holes, 12mm dia, 2in from edges" value={newWO.hole_specs} onChange={e => setNewWO({...newWO, hole_specs: e.target.value})} /></div>}
              </div>

              {/* Priority & Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-gray-700 block mb-1">Priority</label>
                  <select className="erp-form-select w-full" value={newWO.priority} onChange={e => setNewWO({...newWO, priority: e.target.value})}>
                    <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div><label className="text-xs font-bold text-gray-700 block mb-1">Notes</label><textarea className="erp-form-input w-full text-xs" rows="2" value={newWO.notes} onChange={e => setNewWO({...newWO, notes: e.target.value})} placeholder="Special instructions..." /></div>
              </div>

              {/* Routing Preview */}
              {newWO.use_template && newWO.product_type && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-green-800 mb-1">Routing Template Preview:</div>
                  <div className="flex items-center gap-1 flex-wrap text-xs">
                    {newWO.product_type === 'tempered_panel' && ['Cut', 'Edge', 'Wash', 'Temper', 'QC', 'Pack'].map((s, i) => <React.Fragment key={s}>{i > 0 && <span className="text-green-400">→</span>}<span className="bg-white border border-green-300 px-2 py-0.5 rounded">{s}</span></React.Fragment>)}
                    {newWO.product_type === 'laminated' && ['Cut', 'Edge', 'Wash', 'Laminate', 'QC', 'Pack'].map((s, i) => <React.Fragment key={s}>{i > 0 && <span className="text-green-400">→</span>}<span className="bg-white border border-green-300 px-2 py-0.5 rounded">{s}</span></React.Fragment>)}
                    {newWO.product_type === 'tempered_laminated' && ['Cut', 'Edge', 'CNC', 'Wash', 'Temper', 'QC', 'Wash', 'Laminate', 'QC', 'Pack'].map((s, i) => <React.Fragment key={s+i}>{i > 0 && <span className="text-green-400">→</span>}<span className="bg-white border border-green-300 px-2 py-0.5 rounded">{s}</span></React.Fragment>)}
                    {(newWO.product_type === 'igu' || newWO.product_type === 'igu_low_e' || newWO.product_type === 'low_e_igu') && ['Cut', 'Edge', 'Wash', 'Temper', 'QC', 'IGU', 'QC', 'Pack'].map((s, i) => <React.Fragment key={s+i}>{i > 0 && <span className="text-green-400">→</span>}<span className="bg-white border border-green-300 px-2 py-0.5 rounded">{s}</span></React.Fragment>)}
                    {newWO.product_type === 'heat_soaked' && ['Cut', 'Edge', 'CNC', 'Wash', 'Temper', 'HST', 'QC', 'Pack'].map((s, i) => <React.Fragment key={s}>{i > 0 && <span className="text-green-400">→</span>}<span className="bg-white border border-green-300 px-2 py-0.5 rounded">{s}</span></React.Fragment>)}
                    {newWO.product_type === 'custom' && <span className="text-gray-500 italic">Custom routing - will be added manually</span>}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold text-sm shadow" onClick={handleCreateWO}>Create Work Order</button>
                <button className="flex-1 bg-gray-200 hover:bg-gray-300 py-2.5 rounded-lg font-bold text-sm" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}
export default WorkOrders;
