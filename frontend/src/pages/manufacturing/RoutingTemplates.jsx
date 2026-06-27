import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';

function RoutingTemplates() {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [steps, setSteps] = useState([]);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try { const res = await api.get('/api/manufacturing/routing-templates'); setTemplates(Array.isArray(res.data) ? res.data : []); } catch { setTemplates([]); }
  };

  const selectTemplate = async (t) => {
    setSelected(t);
    try { const res = await api.get(`/api/manufacturing/routing-templates/${t.id}`); setSteps(Array.isArray(res.data.operations) ? res.data.operations : []); } catch { setSteps([]); }
  };

  const productTypeLabels = { tempered_panel: 'Tempered Panel', laminated: 'Laminated Glass', tempered_laminated: 'Tempered Laminated', igu: 'Standard IGU', low_e_igu: 'Low-E IGU', heat_soaked: 'Heat Soaked', custom: 'Custom' };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <span className="font-bold text-sm">Routing Templates</span>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchTemplates}>Refresh</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Template List */}
        <div className="w-80 border-r overflow-y-auto bg-gray-50">
          {templates.map(t => (
            <div key={t.id} className={`p-3 border-b cursor-pointer hover:bg-blue-50 ${selected?.id === t.id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''}`} onClick={() => selectTemplate(t)}>
              <div className="font-bold text-sm">{t.name}</div>
              <div className="text-xs text-gray-600">{t.code}</div>
              <div className="text-[10px] text-gray-500 capitalize mt-1">{productTypeLabels[t.product_type] || t.product_type}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{t.description}</div>
            </div>
          ))}
        </div>

        {/* Steps Detail */}
        <div className="flex-1 overflow-auto p-4">
          {selected ? (
            <div>
              <div className="mb-4">
                <h3 className="font-bold text-lg">{selected.name}</h3>
                <p className="text-sm text-gray-600">{selected.description}</p>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">{productTypeLabels[selected.product_type] || selected.product_type}</span>
              </div>

              <h4 className="font-bold text-sm mb-2">Routing Steps ({steps.length})</h4>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: step.color || '#6b7280' }}>
                      {step.icon || (i + 1)}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{step.sequence}. {step.work_center_name} <span className="text-gray-400 font-normal text-xs">({step.work_center_code})</span></div>
                      <div className="text-xs text-gray-600">{step.operation_description}</div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {step.setup_time_hours && <div>{step.setup_time_hours}h est.</div>}
                      {step.qc_required === 1 && <div className="text-amber-600 font-bold">QC Required</div>}
                    </div>
                  </div>
                ))}
              </div>

              {steps.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 border rounded">
                  <h5 className="font-bold text-xs text-gray-700 mb-1">Visual Flow:</h5>
                  <div className="flex items-center flex-wrap gap-1 text-xs">
                    {steps.map((step, i) => (
                      <React.Fragment key={i}>
                        <span className="bg-white border border-gray-300 rounded px-2 py-1">{step.icon} {step.work_center_name}</span>
                        {i < steps.length - 1 && <span className="text-gray-400">→</span>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-16">
              <p className="text-4xl mb-4">🔄</p>
              <p className="text-lg">Select a routing template</p>
              <p className="text-sm">Click a template on the left to view its production steps</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </ModulePage>
  );
}
export default RoutingTemplates;
