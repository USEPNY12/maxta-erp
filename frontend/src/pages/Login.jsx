import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { toast } from 'react-toastify';

function Login() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome to Max TA Group ERP');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#d4d0c8' }}>
      <div className="erp-modal" style={{ minWidth: '400px' }}>
        <div className="erp-modal-title">
          <span>Max TA Group - Glass Fabrication ERP</span>
        </div>
        <div className="erp-modal-body p-6">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">System Login</h2>
            <p className="text-xs text-gray-500 mt-1">Enter your credentials to access the ERP system</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="erp-form-group mb-4">
              <label className="erp-form-label">Username:</label>
              <input
                type="text"
                className="erp-form-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="erp-form-group mb-6">
              <label className="erp-form-label">Password:</label>
              <input
                type="password"
                className="erp-form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-center">
              <button type="submit" className="erp-btn erp-btn-primary px-8" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
