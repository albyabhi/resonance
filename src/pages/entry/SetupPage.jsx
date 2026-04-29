import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetition } from '../../context/CompetitionContext';
import { useAuth } from '../../components/AuthContext';
import { apiFetch, getAuthToken } from '../../utils/apiClient';
import toast from 'react-hot-toast';

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

  const [formData, setFormData] = useState({
    competition_type: 'school_houses',
    custom_label: '',
    institution_name: '',
    competition_name: '',
    year: new Date().getFullYear().toString(),
    groups: ['', ''],
    skip_groups: true,
    flow_template_id: '',
    is_public: false,
    slug: '',
  });

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
  }, []);

  const selectedType = COMPETITION_TYPES.find(t => t.id === formData.competition_type);

  const getGroupLabel = () => {
    if (formData.competition_type === 'custom') return formData.custom_label || 'Group';
    return selectedType?.groupLabel || 'Group';
  };

  const getPlaceholder = (index) => {
    if (formData.competition_type === 'custom') return `e.g. ${formData.custom_label || 'Group'} ${String.fromCharCode(65 + index)}`;
    return selectedType?.placeholder || 'Group Name';
  };

  const slugPreview = formData.slug || generateSlugPreview(formData.competition_name, formData.year);

  const canAdvance = () => {
    switch (step) {
      case 1:
        if (formData.competition_type === 'custom' && formData.custom_label.trim().length < 2) return false;
        return true;
      case 2:
        return formData.institution_name.trim() && formData.competition_name.trim();
      case 3:
        return true; // Groups are optional
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
      fd.append('groups', JSON.stringify(formData.skip_groups ? [] : formData.groups.filter(g => g.trim() !== '')));
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

  const inputClass = "w-full p-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all";
  const labelClass = "block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-1";

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-md w-full">
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
                    ? 'bg-blue-600 text-white shadow-md'
                    : s.num < step
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 cursor-pointer'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400'
                }`}
              >
                {s.num}
              </button>
              {s.num < STEPS.length && (
                <div className={`w-8 h-0.5 ${s.num < step ? 'bg-blue-400' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
              )}
            </div>
          ))}
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">{error}</div>}

        {/* Step 1: Competition Type */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 mb-2">What kind of competition are you running?</p>
            <div className="grid grid-cols-2 gap-2">
              {COMPETITION_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, competition_type: type.id })}
                  className={`p-3 rounded-lg border text-sm font-medium text-left transition-all ${
                    formData.competition_type === type.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'
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
                  <p className="text-xs text-neutral-500 mt-1">Groups will be called: {formData.custom_label}s</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 mb-2">Tell us about your institution and competition.</p>
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
                className={`${inputClass} bg-neutral-100 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed`}
                value={formData.year}
              />
            </div>
          </div>
        )}

        {/* Step 3: Groups */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 mb-2">Add your {getGroupLabel()}s, or skip to create them later.</p>
            
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id="skip"
                checked={formData.skip_groups}
                onChange={(e) => setFormData({ ...formData, skip_groups: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="skip" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
                Skip — add {getGroupLabel()}s later
              </label>
            </div>

            {!formData.skip_groups && (
              <div className="space-y-2">
                {formData.groups.map((g, i) => (
                  <input 
                    key={i} type="text"
                    placeholder={getPlaceholder(i)}
                    className={inputClass}
                    value={g}
                    onChange={(e) => {
                      const newGroups = [...formData.groups];
                      newGroups[i] = e.target.value;
                      setFormData({ ...formData, groups: newGroups });
                    }}
                  />
                ))}
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, groups: [...formData.groups, ''] })}
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                >
                  <span className="text-lg">+</span> Add {getGroupLabel()}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Flow & Settings */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 mb-2">Choose a competition flow and configure access.</p>
            
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
                className="w-4 h-4 text-blue-600 rounded border-neutral-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="public" className="text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer">
                Make scoreboard publicly visible
              </label>
            </div>

            <div>
              <label className={labelClass}>Public URL Slug (optional)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">/view/</span>
                <input 
                  type="text"
                  placeholder={slugPreview || 'auto-generated'}
                  className={inputClass}
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                />
              </div>
              {slugPreview && !formData.slug && (
                <p className="text-xs text-neutral-500 mt-1">Preview: /view/{slugPreview}</p>
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
              className="flex-1 py-3 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Back
            </button>
          )}
          {step < 4 ? (
            <button 
              type="button"
              onClick={() => canAdvance() && setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              Next
            </button>
          ) : (
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              {loading ? 'Creating...' : 'Create & Enter Dashboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
