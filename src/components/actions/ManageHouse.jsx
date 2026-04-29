// src/components/actions/ManageHouse.jsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../AuthContext";
import { apiJson } from "../../utils/apiClient";
import Select from "react-select";
import { FadeIn } from "../AnimateReveal";
import { House, Grid, PlusCircle, Search, Edit3, Trash2, Shield, Upload, X, Camera, User, Hash } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

const ManageHouse = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("manage");
  const [houses, setHouses] = useState([]);
  const [captainOptions, setCaptainOptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({ name: "", code: "", captainUserId: "", logoUrl: "" });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const fileInputRef = useRef(null);
  const [editingHouseId, setEditingHouseId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiCall = async (endpoint, options = {}) => {
    if (!token) throw new Error("No auth token available");
    const isFormData = options.body instanceof FormData;
    return apiJson(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) }
    });
  };

  const fetchHouses = async () => {
    try { setLoading(true); setHouses(await apiCall("/api/house")); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (token) fetchHouses(); }, [token]);

  const handleAddOrEditHouse = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      let body;
      if (logoFile) {
        body = new FormData();
        body.append("name", formData.name);
        body.append("code", formData.code);
        if (formData.captainUserId) body.append("captainUserId", formData.captainUserId);
        body.append("logo", logoFile);
      } else {
        body = JSON.stringify({ name: formData.name, code: formData.code, captainUserId: formData.captainUserId || undefined, logoUrl: formData.logoUrl });
      }

      if (editingHouseId) {
        const updated = await apiCall(`/api/house/${editingHouseId}`, { method: "PUT", body });
        setHouses(houses.map(h => h._id === editingHouseId ? updated : h));
      } else {
        const created = await apiCall("/api/house", { method: "POST", body });
        setHouses([created, ...houses]);
      }
      resetForm();
      setActiveTab("manage");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({ name: "", code: "", captainUserId: "", logoUrl: "" });
    setLogoFile(null); setLogoPreview(""); setEditingHouseId(null);
  };

  const onLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) { setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); setFormData(p => ({ ...p, logoUrl: "" })); }
  };

  const filteredHouses = houses.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()) || h.code.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <House className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white font-heading">
                    {groupLabelPlural} Registry
                </h2>
            </div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-[0.3em] leading-none pl-7">{groupLabel} Management & Assets</p>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/5">
          {["manage", "add"].map(t => (
            <button
              key={t}
              onClick={() => { setActiveTab(t); if(t==='add') resetForm(); }}
              className={`px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === t ? 'bg-white dark:bg-[#0B1220] text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-500/10' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t === 'manage' ? 'Directory' : editingHouseId ? `Edit ${groupLabel}` : `Initialize ${groupLabel}`}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl flex items-center gap-4 text-rose-600 dark:text-rose-400 shadow-soft">
          <Shield className="w-5 h-5 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-widest leading-none">{error}</p>
        </div>
      )}

      {activeTab === "manage" ? (
        <FadeIn className="space-y-10">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
             <div className="relative group w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Locate infrastructure node..." 
                    className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-sm"
                />
             </div>
             <div className="text-xs font-black text-slate-400 underline decoration-indigo-500/20 underline-offset-8 decoration-2">{filteredHouses.length} SYSTEMS ACTIVE</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHouses.map((house, idx) => (
              <FadeIn key={house._id} delay={idx * 0.1}>
                <div className="card-premium group bg-white dark:bg-[#111827] overflow-hidden flex flex-col h-full hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 hover:-translate-y-1 border-slate-200 dark:border-white/5">
                   <div className="relative h-48 bg-slate-50 dark:bg-white/5 overflow-hidden border-b border-slate-100 dark:border-white/5">
                      {house.logoUrl ? (
                         <img src={house.logoUrl} alt={house.name} className="w-full h-full object-cover p-8 transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center space-y-3 opacity-20">
                            <Camera className="w-12 h-12" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Asset Missing</p>
                         </div>
                      )}
                      <div className="absolute top-4 left-4">
                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-sm border border-white/20 text-indigo-600 dark:text-indigo-400">
                          {house.code}
                        </span>
                      </div>
                   </div>

                   <div className="p-6 space-y-6 flex-1 flex flex-col">
                      <div className="space-y-1">
                         <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{house.name}</h3>
                         <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-300" />
                            <p className="text-xs font-semibold text-slate-500">{house.captain?.name || "No Command Assigned"}</p>
                         </div>
                      </div>

                      <div className="mt-auto flex items-center justify-end gap-2 pt-6 border-t border-slate-50 dark:border-white/5">
                        <button 
                            onClick={() => { setFormData({ name: house.name, code: house.code, captainUserId: house.captain?._id || "", logoUrl: house.logoUrl || "" }); setEditingHouseId(house._id); setLogoPreview(house.logoUrl || ""); setActiveTab("add"); }}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-white text-slate-400 hover:text-indigo-600 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-indigo-400 border border-slate-200/50 dark:border-white/10 transition-all shadow-sm active:scale-95"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => { if(window.confirm('Decommission Infrastructure?')) apiCall(`/api/house/${house._id}`, { method: 'DELETE' }).then(fetchHouses); }}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-white text-slate-400 hover:text-rose-600 dark:bg-white/5 dark:hover:bg-white/10 dark:hover:text-rose-400 border border-slate-200/50 dark:border-white/10 transition-all shadow-sm active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </div>
                </div>
              </FadeIn>
            ))}
          </div>
          {loading && <div className="p-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 animate-pulse">Syncing Infrastructure...</div>}
        </FadeIn>
      ) : (
        <FadeIn className="max-w-4xl mx-auto">
          <div className="card-premium p-10 bg-white dark:bg-[#111827] grid grid-cols-1 lg:grid-cols-12 gap-12 relative overflow-hidden">
             {/* Decorative */}
             <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <PlusCircle className="w-48 h-48 text-indigo-500" />
             </div>

             <div className="lg:col-span-4 space-y-8">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Visual Asset</h3>
                    <p className="text-sm font-medium text-slate-500">Official {groupLabel.toLowerCase()} identification.</p>
                </div>

                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative cursor-pointer aspect-square rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-indigo-500/50 hover:bg-indigo-500/[0.02]"
                >
                    {logoPreview ? (
                        <div className="relative w-full h-full">
                            <img src={logoPreview} className="w-full h-full object-cover p-10 transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-6 space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 shadow-xl flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
                                <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Visual</p>
                                <p className="text-[9px] font-medium text-slate-400 max-w-[120px] mx-auto">PNG, SVG, or JPEG (Max 2MB)</p>
                            </div>
                        </div>
                    )}
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onLogoFileChange} />
                </div>
             </div>

             <div className="lg:col-span-8 flex flex-col justify-center">
                <form onSubmit={handleAddOrEditHouse} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <Shield className="w-3 h-3 text-indigo-500" /> System Designation
                        </label>
                        <input 
                            required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                            placeholder="e.g. Phoenix Prime"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                          <Hash className="w-3 h-3 text-indigo-500" /> Protocol Code
                        </label>
                        <input 
                            required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})}
                            placeholder="e.g. PHX"
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                        />
                      </div>
                   </div>

                   <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-5 text-[11px] font-black uppercase tracking-[0.3em] text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-2xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-50"
                   >
                        {loading ? "Writing Strategy..." : editingHouseId ? `Update ${groupLabel} Protocol` : `Initialize ${groupLabel} System`}
                   </button>

                   <button 
                        type="button" 
                        onClick={() => setActiveTab("manage")}
                        className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-all"
                   >
                        Abort Operation
                   </button>
                </form>
             </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
};

export default ManageHouse;
