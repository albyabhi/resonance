// src/components/CaptainsDirectory.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { Phone, AlertCircle, Shield, Contact, Grid, Search, ExternalLink, Mail } from "lucide-react";
import { FadeIn } from "./AnimateReveal";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function CaptainsDirectory() {
  const { token } = useAuth();
  const [captains, setCaptains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCaptains = async () => {
      try {
        setLoading(true);
        setError("");
        const housesRes = await fetch(`${API_BASE_URL}/api/house`, {
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });

        if (!housesRes.ok) throw new Error(`Operational Failure: ${housesRes.status}`);
        const housesData = await housesRes.json();
        const houses = Array.isArray(housesData) ? housesData : housesData.houses || [];

        const captainDetails = [];
        for (const house of houses) {
          try {
            const captainRes = await fetch(`${API_BASE_URL}/api/house/captain/${house._id}`, {
              headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            const captainData = captainRes.ok ? await captainRes.json() : { captain: null };
            captainDetails.push({ houseId: house._id, houseName: house.name, houseCode: house.code, captain: captainData.captain || null });
          } catch {
            captainDetails.push({ houseId: house._id, houseName: house.name, houseCode: house.code, captain: null });
          }
        }
        setCaptains(captainDetails);
      } catch (err) { setError(err.message || "Directory Synchronization Failed"); }
      finally { setLoading(false); }
    };
    fetchCaptains();
  }, [token]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-slate-100 dark:bg-white/5 rounded-3xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-3xl font-semibold tracking-tight font-heading" style={{ color: 'var(--text)' }}>
                    Strategic Command
                </h2>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.3em] leading-none pl-7 underline decoration-indigo-500/30 underline-offset-4">House Captains Registry</p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="relative group flex-1 md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search personnel..." 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
                />
             </div>
        </div>
      </header>

      {error && (
        <div className="card-premium p-6 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 flex items-center gap-4 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {captains.map((item, idx) => {
          const { captain, houseName, houseCode } = item;
          const hasCaptain = !!captain?.name;

          return (
            <FadeIn key={item.houseId} delay={idx * 0.1}>
              <div className="card-premium group bg-white dark:bg-[#111827] overflow-hidden flex flex-col h-full hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 hover:-translate-y-1">
                {/* Hero Section */}
                <div className="relative h-56 overflow-hidden bg-slate-100 dark:bg-white/5">
                  {hasCaptain && captain?.profile_image ? (
                    <img 
                      src={captain.profile_image} 
                      alt={captain.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/5 dark:to-white/[0.02]">
                       <Shield className="w-12 h-12 text-slate-200 dark:text-white/10 mb-4 transition-transform duration-500 group-hover:rotate-12" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Structure Vacant</p>
                    </div>
                  )}
                  
                  {/* Glass Header */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm border border-white/20 dark:border-white/5 text-slate-600 dark:text-slate-300">
                        {houseCode}
                      </span>
                      {hasCaptain && (
                        <div className="h-8 w-8 rounded-full bg-emerald-400 shadow-lg shadow-emerald-500/50 border-2 border-white dark:border-[#111827] animate-pulse" />
                      )}
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/10 to-transparent opacity-0 group-hover:opacity-100 dark:opacity-100 transition-opacity duration-500" />
                  
                  {/* Name Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-1">{houseName}</p>
                    <h3 className="text-xl font-bold text-white tracking-tight">{hasCaptain ? captain.name : "Unassigned"}</h3>
                  </div>
                </div>

                {/* Info Container */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {hasCaptain ? (
                      <div className="space-y-3">
                         <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/5 group/row transition-colors hover:bg-white dark:hover:bg-slate-800" style={{ backgroundColor: 'var(--surface)' }}>
                           <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm" style={{ backgroundColor: 'var(--card)' }}>
                                <Phone className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1" style={{ color: 'var(--chart-axis)' }}>Direct Comms</p>
                                <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{captain.phone || "---"}</p>
                              </div>
                           </div>
                           <ExternalLink className="w-3 h-3 text-slate-300 opacity-0 group-hover/row:opacity-100 transition-all" />
                         </div>

                         <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/5 group/row transition-colors hover:bg-white dark:hover:bg-slate-800" style={{ backgroundColor: 'var(--surface)' }}>
                           <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl text-violet-600 dark:text-violet-400 shadow-sm" style={{ backgroundColor: 'var(--card)' }}>
                                <Mail className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-widest leading-none mb-1" style={{ color: 'var(--chart-axis)' }}>Intelligence</p>
                                <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{houseCode.toLowerCase()}@resonance.edu</p>
                              </div>
                           </div>
                           <ExternalLink className="w-3 h-3 text-slate-300 opacity-0 group-hover/row:opacity-100 transition-all" />
                         </div>
                      </div>
                    ) : (
                      <div className="py-10 text-center space-y-2">
                         <Contact className="w-8 h-8 text-slate-100 dark:text-white/5 mx-auto" />
                         <p className="text-xs font-semibold text-slate-400">Protocol missing for this node</p>
                      </div>
                    )}
                  </div>

                  {hasCaptain && (
                    <button className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:text-white shadow-xl shadow-slate-900/10 dark:shadow-white/5 active:scale-95 group-hover:translate-y-0 translate-y-1 opacity-0 group-hover:opacity-100 duration-500">
                        Initiate Connection
                    </button>
                  )}
                </div>
              </div>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
