import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetition } from '../../context/CompetitionContext';
import { useAuth } from '../../components/AuthContext';
import { apiFetch, getAuthToken } from '../../utils/apiClient';
import toast from 'react-hot-toast';
import { 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Upload, 
  Camera, 
  Loader2 
} from 'lucide-react';

const COMPETITION_TYPES = [
  { id: 'school_houses', label: 'School Houses', groupLabel: 'House', groupLabelPlural: 'Houses', placeholder: 'Red House' },
  { id: 'college_departments', label: 'College Departments', groupLabel: 'Department', groupLabelPlural: 'Departments', placeholder: 'CSE' },
  { id: 'inter_school', label: 'Inter School', groupLabel: 'School', groupLabelPlural: 'Schools', placeholder: 'ABC School' },
  { id: 'inter_college', label: 'Inter College', groupLabel: 'College', groupLabelPlural: 'Colleges', placeholder: 'Govt College' },
  { id: 'sports_meet', label: 'Sports Meet', groupLabel: 'Team', groupLabelPlural: 'Teams', placeholder: 'Team A' },
  { id: 'custom', label: 'Custom', groupLabel: 'Group', groupLabelPlural: 'Groups', placeholder: 'Zone A' }
];

const STEPS = [
  { num: 1, title: 'Type' },
  { num: 2, title: 'Info' },
  { num: 3, title: 'Groups' },
  { num: 4, title: 'Flow' },
];

function generateSlugPreview(name, year) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 40) + '-' + year;
}

export default function SetupPage() {
  const navigate = useNavigate();
  const { setCompetition } = useCompetition();
  const { user, token, refreshToken, login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [templates, setTemplates] = useState([]);

  // Setup form states
  const [formData, setFormData] = useState({
    competition_type: 'school_houses',
    custom_label: '',
    institution_name: '',
    competition_name: '',
    year: new Date().getFullYear().toString(),
    groups: [], // Array of group objects: { name, logoUrl, logoPublicId }
    skip_groups: true,
    flow_template_id: '',
    is_public: false,
    slug: '',
    logo: null,
  });

  // Group Form (Inline Modal/Drawer State inside Step 3)
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    name: ''
  });
  const [groupLogoUrl, setGroupLogoUrl] = useState('');
  const [groupLogoPublicId, setGroupLogoPublicId] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Fetch flow templates on mount
  useEffect(() => {
    apiFetch(`${backendUrl}/api/competition/templates`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTemplates(data);
          if (data.length > 0) setFormData(f => ({ ...f, flow_template_id: data[0]._id }));
        }
      })
      .catch(() => {});
  }, [backendUrl]);

  const selectedType = COMPETITION_TYPES.find(t => t.id === formData.competition_type);

  const getGroupLabel = () => {
    if (formData.competition_type === 'custom') return formData.custom_label || 'Group';
    return selectedType?.groupLabel || 'Group';
  };

  const getGroupLabelPlural = () => {
    if (formData.competition_type === 'custom') return (formData.custom_label || 'Group') + 's';
    return selectedType?.groupLabelPlural || 'Groups';
  };

  const getPlaceholder = () => {
    return selectedType?.placeholder || 'e.g. Red House';
  };

  const slugPreview = formData.slug || generateSlugPreview(formData.competition_name, formData.year);

  // Group Logo Uploader utilizing /api/competition/upload
  const handleGroupLogoUpload = async (file) => {
    if (!file) return;
    if (!/image\/(png|jpe?g|webp|svg\+xml)/i.test(file.type)) {
      toast.error("Only PNG, JPEG, SVG or WEBP images are supported");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    try {
      setUploadingLogo(true);
      const uploadFd = new FormData();
      uploadFd.append("image", file);

      const activeToken = token || getAuthToken();
      const response = await apiFetch(`${backendUrl}/api/competition/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${activeToken}`
        },
        body: uploadFd
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to upload image");

      setGroupLogoUrl(data.secure_url);
      setGroupLogoPublicId(data.public_id);
      toast.success("Logo uploaded successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const onLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleGroupLogoUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleGroupLogoUpload(file);
  };

  const handlePaste = (e) => {
    const item = e.clipboardData?.items?.[0];
    if (item && item.type.indexOf("image") !== -1) {
      const file = item.getAsFile();
      if (file) handleGroupLogoUpload(file);
    }
  };

  // Group Form CRUD operations
  const openAddGroup = () => {
    setGroupFormData({ name: '' });
    setGroupLogoUrl('');
    setGroupLogoPublicId('');
    setEditingIndex(null);
    setShowGroupForm(true);
  };

  const openEditGroup = (index) => {
    const group = formData.groups[index];
    setGroupFormData({
      name: group.name
    });
    setGroupLogoUrl(group.logoUrl || '');
    setGroupLogoPublicId(group.logoPublicId || '');
    setEditingIndex(index);
    setShowGroupForm(true);
  };

  const saveGroup = () => {
    if (!groupFormData.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    const groupObj = {
      name: groupFormData.name.trim(),
      logoUrl: groupLogoUrl || null,
      logoPublicId: groupLogoPublicId || null
    };

    const newGroups = [...formData.groups];
    if (editingIndex !== null) {
      newGroups[editingIndex] = groupObj;
    } else {
      newGroups.push(groupObj);
    }

    setFormData({ ...formData, groups: newGroups });
    setShowGroupForm(false);
    toast.success(`${getGroupLabel()} saved!`);
  };

  const deleteGroup = (index) => {
    const newGroups = formData.groups.filter((_, i) => i !== index);
    setFormData({ ...formData, groups: newGroups });
    toast.success(`${getGroupLabel()} deleted`);
  };

  const canAdvance = () => {
    switch (step) {
      case 1:
        if (formData.competition_type === 'custom' && formData.custom_label.trim().length < 2) return false;
        return true;
      case 2:
        return formData.institution_name.trim() && formData.competition_name.trim();
      case 3:
        if (!formData.skip_groups && formData.groups.length < 2) return false; // At least 2 groups required if not skipped
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const activeToken = token || getAuthToken();
      const fd = new FormData();
      fd.append('competition_type', formData.competition_type);
      fd.append('competition_name', formData.competition_name);
      fd.append('institution_name', formData.institution_name);
      fd.append('year', formData.year);
      if (formData.competition_type === 'custom') {
        fd.append('group_label', formData.custom_label);
      }
      fd.append('groups', JSON.stringify(formData.skip_groups ? [] : formData.groups));
      if (formData.flow_template_id) {
        fd.append('flow_template_id', formData.flow_template_id);
      }
      fd.append('is_public', formData.is_public);
      if (formData.slug) {
        fd.append('slug', formData.slug);
      }
      if (formData.logo) {
        fd.append('logo', formData.logo);
      }

      const res = await apiFetch(`${backendUrl}/api/competition/setup`, {
        method: 'POST',
        body: fd
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Setup failed');
      }
      
      const data = await res.json();
      
      const newComp = {
        id: data.competition_id,
        name: data.name,
        slug: data.slug,
        group_label: data.group_label,
        group_label_plural: data.group_label_plural,
        logoUrl: data.logoUrl,
      };
      
      setCompetition(newComp);
      login(user, activeToken, refreshToken, newComp);
      
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full p-3 bg-input-bg border border-input rounded-xl outline-none focus:ring-2 focus:ring-ring transition-all font-medium text-sm";
  const labelClass = "block text-xs font-black uppercase tracking-widest text-muted-foreground mb-1.5";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground">
      <div className="max-w-xl w-full bg-card p-8 rounded-3xl border border-border shadow-xl transition-all duration-300">
        <h1 className="text-2xl font-bold mb-2 text-center">Setup Competition</h1>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((s) => (
            <div key={s.num} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => s.num < step && setStep(s.num)}
                className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                  s.num === step
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : s.num < step
                    ? 'bg-primary/10 text-primary cursor-pointer'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s.num}
              </button>
              {s.num < STEPS.length && (
                <div className={`w-8 h-0.5 ${s.num < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl text-xs font-bold uppercase tracking-wider">{error}</div>}

        {/* Step 1: Competition Type */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2 font-medium">What kind of competition are you running?</p>
            <div className="grid grid-cols-2 gap-2">
              {COMPETITION_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, competition_type: type.id })}
                  className={`p-4 rounded-xl border text-sm font-bold text-left transition-all ${
                    formData.competition_type === type.id
                      ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-muted hover:bg-muted/50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {formData.competition_type === 'custom' && (
              <div className="pt-2">
                <label className={labelClass}>What do you call your groups?</label>
                <input 
                  type="text" placeholder="e.g. Zone, Batch, Clan" required
                  className={inputClass}
                  value={formData.custom_label}
                  onChange={(e) => setFormData({ ...formData, custom_label: e.target.value })}
                />
                {formData.custom_label && (
                  <p className="text-xs text-muted-foreground mt-1">Groups will be called: {formData.custom_label}s</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Tell us about your institution and competition.</p>
            <div>
              <label className={labelClass}>Institution Name</label>
              <input 
                type="text" placeholder="e.g. Govt Higher Secondary School" required
                className={inputClass}
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Competition Name</label>
              <input 
                type="text" placeholder="e.g. Annual Arts Fest 2026" required
                className={inputClass}
                value={formData.competition_name}
                onChange={(e) => setFormData({ ...formData, competition_name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Competition Logo (optional)</label>
              <input 
                type="file" 
                accept="image/*"
                className={inputClass}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFormData({ ...formData, logo: e.target.files[0] });
                  }
                }}
              />
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <input 
                type="text" disabled
                className={`${inputClass} bg-muted text-muted-foreground cursor-not-allowed`}
                value={formData.year}
              />
            </div>
          </div>
        )}

        {/* Step 3: Groups */}
        {step === 3 && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Initialize your {getGroupLabelPlural()}. Captains can be assigned after participants are added.</p>
            
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="skip"
                checked={formData.skip_groups}
                onChange={(e) => setFormData({ ...formData, skip_groups: e.target.checked })}
                className="w-4 h-4 text-primary rounded border-input focus:ring-primary cursor-pointer"
              />
              <label htmlFor="skip" className="text-sm font-semibold text-foreground cursor-pointer">
                Skip — add {getGroupLabelPlural().toLowerCase()} later
              </label>
            </div>

            {!formData.skip_groups && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Active Groups List */}
                {formData.groups.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-border rounded-2xl">
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">No {getGroupLabelPlural()} Initialized</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Add at least 2 {getGroupLabelPlural().toLowerCase()} to continue</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {formData.groups.map((g, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 bg-muted border border-border rounded-2xl shadow-sm">
                        <div className="flex items-center gap-3">
                          {g.logoUrl ? (
                            <img src={g.logoUrl} className="w-8 h-8 rounded-lg object-contain border border-border bg-card" alt="Group Logo" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground">
                              {g.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-black truncate">{g.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              Captains available after participant setup
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditGroup(i)}
                            className="p-1.5 rounded-lg hover:bg-muted hover:text-primary text-muted-foreground transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGroup(i)}
                            className="p-1.5 rounded-lg hover:bg-muted hover:text-destructive text-muted-foreground transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!showGroupForm ? (
                  <button 
                    type="button"
                    onClick={openAddGroup}
                    className="w-full py-3.5 border-2 border-dashed border-primary/20 hover:border-primary/50 bg-primary/10 text-xs font-black uppercase tracking-widest text-primary rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" /> Add {getGroupLabel()}
                  </button>
                ) : (
                  /* High Fidelity Drag/Paste upload and CRUD modal form */
                  <div onPaste={handlePaste} className="p-5 border border-primary/30 bg-primary/5 rounded-2xl space-y-4 shadow-inner animate-in slide-in-from-top-2 duration-300">
                    <p className="text-xs font-black uppercase tracking-widest text-primary">
                      {editingIndex !== null ? `Edit ${getGroupLabel()} Configuration` : `Add ${getGroupLabel()} Node`}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Logo Zone */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center">
                        <div
                          onClick={() => !uploadingLogo && fileInputRef.current?.click()}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`group relative cursor-pointer w-full aspect-square max-w-[120px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all duration-300
                            ${isDragOver 
                              ? 'border-primary bg-primary/10 scale-102 shadow-md shadow-primary/5' 
                              : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5'
                            }`}
                        >
                          {uploadingLogo ? (
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                          ) : groupLogoUrl ? (
                            <div className="relative w-full h-full p-2 flex items-center justify-center">
                              <img src={groupLogoUrl} className="w-full h-full object-contain p-2" alt="Logo Preview" />
                              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                                <Camera className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center p-2 space-y-1">
                              <Upload className="w-5 h-5 text-primary mx-auto" />
                              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Logo Zone</p>
                              <p className="text-[7px] text-muted-foreground">Paste/Drop</p>
                            </div>
                          )}
                          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onLogoFileChange} />
                        </div>
                        {groupLogoUrl && (
                          <button
                            type="button"
                            onClick={() => { setGroupLogoUrl(""); setGroupLogoPublicId(""); }}
                            className="mt-1 text-[8px] font-black uppercase tracking-wider text-destructive hover:underline"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>

                      {/* Fields */}
                      <div className="md:col-span-8 space-y-3">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Name Designation</label>
                          <input
                            type="text"
                            required
                            placeholder={`e.g. ${getPlaceholder()}`}
                            className={inputClass}
                            value={groupFormData.name}
                            onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowGroupForm(false)}
                        className="py-2.5 px-4 rounded-xl border border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={uploadingLogo}
                        onClick={saveGroup}
                        className="py-2.5 px-5 rounded-xl bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary-strong disabled:opacity-50 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Flow & Settings */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-2 font-medium">Choose a competition flow and configure access.</p>
            
            {templates.length > 0 && (
              <div>
                <label className={labelClass}>Flow Template</label>
                <select
                  className={inputClass}
                  value={formData.flow_template_id}
                  onChange={(e) => setFormData({ ...formData, flow_template_id: e.target.value })}
                >
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.name} — {t.stages.join(' → ')}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <input 
                type="checkbox" 
                id="public"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-4 h-4 text-primary rounded border-input focus:ring-primary cursor-pointer"
              />
              <label htmlFor="public" className="text-sm font-semibold text-foreground cursor-pointer">
                Make scoreboard publicly visible
              </label>
            </div>

            <div>
              <label className={labelClass}>Public URL Slug (optional)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/view/</span>
                <input 
                  type="text"
                  placeholder={slugPreview || 'auto-generated'}
                  className={inputClass}
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                />
              </div>
              {slugPreview && !formData.slug && (
                <p className="text-xs text-muted-foreground mt-1">Preview: /view/{slugPreview}</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button 
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3.5 border border-border text-foreground font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-muted transition-colors cursor-pointer"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button 
              type="button"
              onClick={() => canAdvance() && setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex-1 py-3.5 bg-primary hover:bg-primary-strong text-primary-foreground font-black uppercase tracking-[0.2em] text-xs rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 cursor-pointer"
            >
              Next
            </button>
          ) : (
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3.5 bg-primary hover:bg-primary-strong text-primary-foreground font-black uppercase tracking-[0.2em] text-xs rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create & Enter Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}