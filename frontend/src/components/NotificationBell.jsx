import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { FaBell } from 'react-icons/fa';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCount = async () => {
    try {
      const res = await api.get('/api/notifications/count');
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) { /* silent */ }
  };

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications', { params: { unread_only: 'true' } });
      setNotifications((res.data.notifications || []).slice(0, 5));
    } catch (err) { /* silent */ }
  };

  const toggleDropdown = () => {
    if (!showDropdown) fetchNotifications();
    setShowDropdown(!showDropdown);
  };

  const markRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(notifications.filter(n => n.id !== id));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) { /* silent */ }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={toggleDropdown} className="relative p-1 text-gray-600 hover:text-gray-800">
        <FaBell size={14} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      {showDropdown && (
        <div className="absolute right-0 top-6 w-72 bg-white border rounded-lg shadow-xl z-50">
          <div className="p-2 border-b font-medium text-xs flex justify-between items-center">
            <span>Notifications</span>
            <a href="/notifications" className="text-blue-600 hover:underline text-xs">View All</a>
          </div>
          <div className="max-h-60 overflow-auto">
            {notifications.length === 0 && <div className="p-4 text-center text-gray-400 text-xs">No unread notifications</div>}
            {notifications.map(n => (
              <div key={n.id} className="p-2 border-b hover:bg-gray-50 cursor-pointer text-xs" onClick={() => markRead(n.id)}>
                <div className="font-medium">{n.title}</div>
                <div className="text-gray-500 truncate">{n.message}</div>
                <div className="text-gray-400 text-[10px] mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
