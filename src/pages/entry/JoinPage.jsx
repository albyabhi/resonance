import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/apiClient';

export default function JoinPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ code: '', role: 'participant' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      if (!formData.code) return;
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      // A user might not have a token if they just landed, so join endpoint needs to handle or require auth first
      // But prompt says User flow goes from /entry -> /join. 
      // If no token, maybe we need them to login first. For now, assume they might need an account or the backend handles it.
      
      const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/competition/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to join');

      if (data.status === 'joined') {
        navigate('/dashboard');
      } else {
        setStep(3); // Pending state
      }
    } catch (err) {
      console.error(err);
      alert('Join failed. You may need to log in first.');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Join Competition</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium">Input Competition Code OR Paste Link</label>
              <input 
                type="text" 
                required
                placeholder="e.g. COMP-1234 or https://..."
                className="w-full p-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
              />
              <button 
                type="submit" 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium">Select Role</label>
              <div className="space-y-2">
                {['participant', 'coordinator', 'faculty'].map(role => (
                  <label key={role} className="flex items-center space-x-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-md cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <input 
                      type="radio" 
                      name="role" 
                      value={role}
                      checked={formData.role === role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="capitalize">{role} {role === 'participant' && '(View only)'}</span>
                  </label>
                ))}
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                {loading ? 'Processing...' : 'Request Access'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Access Requested</h2>
                <p className="text-neutral-500">Your request to join the competition as a {formData.role} has been sent to the administrator. You will be notified once it is approved.</p>
              </div>
              <button 
                type="button" 
                onClick={() => navigate('/')}
                className="w-full py-3 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 font-medium rounded-md transition-colors"
              >
                Return to Home
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
