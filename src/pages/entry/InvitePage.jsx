import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';
import toast from 'react-hot-toast';

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/invite/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to accept invite');
      
      toast.success('Invite accepted!');
      
      if (data.access_token) {
        login(data.user, data.access_token, data.refresh_token, data.competition);
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2 text-center">You've been invited</h1>
        <p className="text-center text-neutral-500 mb-6">Role: Coordinator</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Set Password (if new user)</label>
            <input 
              type="password" 
              className="w-full p-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            {loading ? 'Processing...' : 'Enter Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
