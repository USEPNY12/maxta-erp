import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const MACHINE_TAGS = [
  { value: 'cutting_table', label: 'Cutting Table', icon: '🔪', color: '#e74c3c' },
  { value: 'cnc_machine', label: 'CNC Machine', icon: '⚙️', color: '#3498db' },
  { value: 'waterjet', label: 'Waterjet', icon: '💧', color: '#1abc9c' },
  { value: 'edge_polisher', label: 'Edge Polisher', icon: '✨', color: '#9b59b6' },
  { value: 'shop_drawing', label: 'Shop Drawing', icon: '📐', color: '#f39c12' },
  { value: 'reference', label: 'Reference', icon: '📎', color: '#95a5a6' },
  { value: 'other', label: 'Other', icon: '📄', color: '#7f8c8d' }
];

const FILE_ICONS = {
  dxf: '📐', dwg: '📐', pdf: '📕', png: '🖼️', jpg: '🖼️', jpeg: '🖼️',
  sgc: '🔷', step: '🧊', stp: '🧊', nc: '⚙️', gcode: '⚙️', tap: '⚙️',
  zip: '📦', default: '📄'
};

function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function FileAttachments({ documentType, documentId, lineId, readOnly = false, machineFilter = null, compact = false }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTag, setSelectedTag] = useState('shop_drawing');
  const [description, setDescription] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (documentId) fetchFiles();
  }, [documentType, documentId, lineId, machineFilter]);

  const fetchFiles = async () => {
    try {
      let url = `/api/files/${documentType}/${documentId}`;
      if (lineId) url += `/line/${lineId}`;
      else if (machineFilter) url += `/machine/${machineFilter}`;
      const res = await api.get(url);
      setFiles(res.data);
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  const handleUpload = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        formData.append('files', fileList[i]);
      }
      formData.append('machine_tag', selectedTag);
      formData.append('description', description);
      if (lineId) formData.append('line_id', lineId);

      await api.post(`/api/files/${documentType}/${documentId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(`${fileList.length} file(s) uploaded`);
      setDescription('');
      fetchFiles();
    } catch (err) {
      toast.error('Upload failed: ' + (err.response?.data?.error || err.message));
    }
    setUploading(false);
  };

  const handleDownload = async (file) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api.defaults.baseURL}/api/files/download/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Download failed');
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file?')) return;
    try {
      await api.delete(`/api/files/${fileId}`);
      toast.success('File deleted');
      fetchFiles();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);

  const getTagInfo = (tag) => MACHINE_TAGS?.find(t => t.value === tag) || MACHINE_TAGS[6];

  // Group files by machine tag
  const grouped = {};
  files?.forEach(f => {
    const tag = f.machine_tag || 'other';
    if (!grouped[tag]) grouped[tag] = [];
    grouped[tag].push(f);
  });

  if (compact) {
    return (
      <div className="text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold">Files:</span>
          <span className="text-gray-500">{files.length} attached</span>
        </div>
        {files?.map(f => {
          const tag = getTagInfo(f.machine_tag);
          return (
            <div key={f.id} className="flex items-center gap-2 py-0.5">
              <span>{getFileIcon(f.original_name)}</span>
              <span className="truncate flex-1">{f.original_name}</span>
              <span className="px-1 rounded text-[10px]" style={{ background: tag.color + '20', color: tag.color }}>{tag.label}</span>
              <button onClick={() => handleDownload(f)} className="text-blue-600 hover:underline">↓</button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="text-xs">
      {/* Upload area - only shown when not read-only */}
      {!readOnly && (
        <div className="mb-3">
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
              accept=".dxf,.dwg,.pdf,.png,.jpg,.jpeg,.sgc,.step,.stp,.nc,.gcode,.tap,.svg,.zip,.txt,.csv,.xlsx"
            />
            <div className="text-2xl mb-1">📁</div>
            <div className="font-bold text-gray-700">
              {uploading ? 'Uploading...' : 'Drop files here or click to browse'}
            </div>
            <div className="text-gray-400 mt-1">DXF, DWG, PDF, Images, CNC programs (max 50MB)</div>
          </div>
          <div className="flex gap-2 mt-2 items-center">
            <label className="font-bold whitespace-nowrap">Machine:</label>
            <select
              className="erp-form-select text-xs flex-1"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              {MACHINE_TAGS?.map(t => (
                <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
              ))}
            </select>
            <input
              className="erp-form-input text-xs flex-1"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* File list grouped by machine */}
      {files.length === 0 ? (
        <div className="text-gray-400 text-center py-4">No files attached yet</div>
      ) : (
        <div className="space-y-3">
          {Object.keys(grouped)?.map(tag => {
            const tagInfo = getTagInfo(tag);
            return (
              <div key={tag}>
                <div className="flex items-center gap-2 mb-1 pb-1 border-b">
                  <span>{tagInfo.icon}</span>
                  <span className="font-bold" style={{ color: tagInfo.color }}>{tagInfo.label}</span>
                  <span className="text-gray-400">({grouped[tag].length})</span>
                </div>
                <div className="space-y-1">
                  {grouped[tag].map(f => (
                    <div key={f.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 group">
                      <span className="text-lg">{getFileIcon(f.original_name)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{f.original_name}</div>
                        <div className="text-gray-400">
                          {formatFileSize(f.file_size)}
                          {f.description && ` • ${f.description}`}
                          {f.uploaded_by_name && ` • by ${f.uploaded_by_name}`}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(f)}
                        className="erp-btn text-xs px-2 py-1 bg-blue-600 text-white hover:bg-blue-700"
                        title="Download"
                      >
                        ⬇ Download
                      </button>
                      {!readOnly && (
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
