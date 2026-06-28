/**
 * MaxTA ERP - Global Omni-Search Component
 * Professional search-everywhere functionality
 * Searches: Quotes, Sales Orders, Work Orders, POs, Customers, Vendors, Items, Invoices
 * Keyboard shortcut: Ctrl+K / Cmd+K
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaTimes, FaFileAlt, FaShoppingCart, FaIndustry, FaBoxes, FaUsers, FaTruck, FaCalculator, FaWrench } from 'react-icons/fa';
import api from '../services/api';

const SEARCH_CATEGORIES = [
  { key: 'quotes', label: 'Quotes', icon: FaFileAlt, color: '#3b82f6', path: '/sales/quotes' },
  { key: 'sales_orders', label: 'Sales Orders', icon: FaShoppingCart, color: '#10b981', path: '/sales/orders' },
  { key: 'work_orders', label: 'Work Orders', icon: FaIndustry, color: '#f59e0b', path: '/manufacturing/work-orders' },
  { key: 'purchase_orders', label: 'Purchase Orders', icon: FaTruck, color: '#8b5cf6', path: '/purchasing/orders' },
  { key: 'customers', label: 'Customers', icon: FaUsers, color: '#06b6d4', path: '/sales/customers' },
  { key: 'vendors', label: 'Vendors', icon: FaUsers, color: '#ec4899', path: '/purchasing/vendors' },
  { key: 'items', label: 'Items', icon: FaBoxes, color: '#84cc16', path: '/inventory/items' },
  { key: 'invoices', label: 'Invoices', icon: FaCalculator, color: '#f97316', path: '/sales/invoices' },
];

export default function OmniSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  // Keyboard shortcut: Ctrl+K / Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      setResults(response.data.results || []);
      setSelectedIndex(0);
    } catch (err) {
      // Fallback: search individual endpoints
      try {
        const allResults = [];
        const searches = [
          api.get(`/api/sales/quotes?search=${encodeURIComponent(searchQuery)}&limit=3`).then(r => 
            (r.data.quotes || r.data || [])?.slice(0, 3)?.map(item => ({
              type: 'quotes', label: `${item.quote_number || 'QT-' + item.id}`, 
              subtitle: item.company_name || item.project_name || '', id: item.id
            }))
          ).catch(() => []),
          api.get(`/api/sales/orders?search=${encodeURIComponent(searchQuery)}&limit=3`).then(r => 
            (r.data.orders || r.data || [])?.slice(0, 3)?.map(item => ({
              type: 'sales_orders', label: `${item.order_number || 'SO-' + item.id}`,
              subtitle: item.company_name || item.customer_po || '', id: item.id
            }))
          ).catch(() => []),
          api.get(`/api/manufacturing/work-orders?search=${encodeURIComponent(searchQuery)}&limit=3`).then(r => 
            (r.data.workOrders || r.data || [])?.slice(0, 3)?.map(item => ({
              type: 'work_orders', label: `${item.wo_number || 'WO-' + item.id}`,
              subtitle: item.item_description || item.status || '', id: item.id
            }))
          ).catch(() => []),
          api.get(`/api/purchasing/orders?search=${encodeURIComponent(searchQuery)}&limit=3`).then(r => 
            (r.data.orders || r.data || [])?.slice(0, 3)?.map(item => ({
              type: 'purchase_orders', label: `${item.po_number || 'PO-' + item.id}`,
              subtitle: item.company_name || '', id: item.id
            }))
          ).catch(() => []),
          api.get(`/api/sales/customers?search=${encodeURIComponent(searchQuery)}&limit=3`).then(r => 
            (r.data.customers || r.data || [])?.slice(0, 3)?.map(item => ({
              type: 'customers', label: item.company_name,
              subtitle: item.contact_name || item.city || '', id: item.id
            }))
          ).catch(() => []),
          api.get(`/api/purchasing/vendors?search=${encodeURIComponent(searchQuery)}&limit=3`).then(r => 
            (r.data.vendors || r.data || [])?.slice(0, 3)?.map(item => ({
              type: 'vendors', label: item.company_name,
              subtitle: item.contact_name || '', id: item.id
            }))
          ).catch(() => []),
          api.get(`/api/inventory/items?search=${encodeURIComponent(searchQuery)}&limit=3`).then(r => 
            (r.data.items || r.data || [])?.slice(0, 3)?.map(item => ({
              type: 'items', label: `${item.item_number} - ${item.description}`,
              subtitle: item.uom || '', id: item.id
            }))
          ).catch(() => []),
        ];

        const searchResults = await Promise.allSettled(searches);
        searchResults?.forEach(result => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            allResults.push(...result.value);
          }
        });

        setResults(allResults);
        setSelectedIndex(0);
      } catch (e) {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value), 300);
  };

  // Navigate to result
  const handleSelect = (result) => {
    const category = SEARCH_CATEGORIES?.find(c => c.key === result.type);
    if (category) {
      navigate(`${category.path}?id=${result.id}`);
    }
    setIsOpen(false);
  };

  // Keyboard navigation in results
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  // Get category info for a result
  const getCategoryInfo = (type) => SEARCH_CATEGORIES?.find(c => c.key === type) || {};

  if (!isOpen) {
    return (
      <button 
        className="omni-search-trigger" 
        onClick={() => setIsOpen(true)}
        title="Search everywhere (Ctrl+K)"
        aria-label="Open search"
      >
        <FaSearch size={14} />
        <span className="omni-search-placeholder">Search...</span>
        <kbd className="omni-search-kbd">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="omni-search-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
      <div className="omni-search-modal" role="dialog" aria-label="Search">
        <div className="omni-search-input-wrapper">
          <FaSearch className="omni-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="omni-search-input"
            placeholder="Search quotes, orders, customers, items..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {query && (
            <button className="omni-search-clear" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}>
              <FaTimes size={12} />
            </button>
          )}
          <button className="omni-search-close" onClick={() => setIsOpen(false)}>
            <kbd>ESC</kbd>
          </button>
        </div>

        <div className="omni-search-results" ref={resultsRef}>
          {loading && (
            <div className="omni-search-loading">
              <div className="omni-search-spinner"></div>
              <span>Searching...</span>
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="omni-search-empty">
              No results found for "{query}"
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="omni-search-hint">
              <p>Type at least 2 characters to search across:</p>
              <div className="omni-search-categories">
                {SEARCH_CATEGORIES?.map(cat => (
                  <span key={cat.key} className="omni-search-category-tag" style={{ borderColor: cat.color }}>
                    <cat.icon size={10} style={{ color: cat.color }} />
                    {cat.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="omni-search-list">
              {(results || [])?.map((result, idx) => {
                const catInfo = getCategoryInfo(result.type);
                const Icon = catInfo.icon || FaFileAlt;
                return (
                  <li
                    key={`${result.type}-${result.id}-${idx}`}
                    className={`omni-search-item ${idx === selectedIndex ? 'selected' : ''}`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="omni-search-item-icon" style={{ backgroundColor: `${catInfo.color}15`, color: catInfo.color }}>
                      <Icon size={14} />
                    </div>
                    <div className="omni-search-item-content">
                      <span className="omni-search-item-label">{result.label}</span>
                      {result.subtitle && <span className="omni-search-item-subtitle">{result.subtitle}</span>}
                    </div>
                    <span className="omni-search-item-type" style={{ color: catInfo.color }}>
                      {catInfo.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="omni-search-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Select</span>
          <span><kbd>ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
