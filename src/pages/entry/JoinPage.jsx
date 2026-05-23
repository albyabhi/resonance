import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/apiClient';
import { Ticket, Users, CheckCircle, ArrowRight, UserCheck, Shield, BookOpen, Clock } from 'lucide-react';

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

  const inputClass = "w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm";
  const labelClass = "block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300";
  const iconSpan = "absolute inset-y-0 left-0 pl-3.5 flex items-center text-neutral-400";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1220] flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4 border border-blue-100 dark:border-blue-900/40">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Join Competition
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            Step {step} of 3 • Enter details to request access
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <label className={labelClass}>Competition Code OR Paste Link</label>
              <div className="relative">
                <span className={iconSpan}><Ticket className="h-5 w-5" /></span>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. COMP-1234 or https://..."
                  className={inputClass}
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                />
              </div>
              <button 
                type="submit" 
                className="w-full py-3.5 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-4" 
                style={{ backgroundColor: "#2563EB" }}
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className={labelClass}>Select Your Access Role</label>
              <div className="space-y-3">
                {[
                  { id: 'participant', label: 'Participant', desc: 'View standings, register for events', icon: UserCheck },
                  { id: 'coordinator', label: 'Coordinator', desc: 'Submit scores, manage house details', icon: Shield },
                  { id: 'faculty', label: 'Faculty Coordinator', desc: 'Oversee house actions and entries', icon: BookOpen }
                ].map(({ id, label, desc, icon: Icon }) => (
                  <label 
                    key={id} 
                    className={`flex items-start gap-3.5 p-4 border rounded-2xl cursor-pointer transition-all ${
                      formData.role === id
                        ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 dark:border-blue-400"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100/55 dark:hover:bg-slate-900/80"
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="role" 
                      value={id}
                      checked={formData.role === id}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="mt-1 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        {label}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        {desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-6" 
                style={{ backgroundColor: "#2563EB" }}
              >
                {loading ? 'Requesting Access...' : <><span>Request Access</span><ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="h-16 w-16 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900/40 animate-pulse">
                <Clock className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Access Requested</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Your request to join the competition as a <span className="font-bold text-blue-600 dark:text-blue-400 capitalize">{formData.role}</span> has been sent to the administrator. You will be notified once it is approved.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => navigate('/')}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 font-bold rounded-xl transition-all cursor-pointer"
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
