import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiClient';
import { useAuth } from '../components/AuthContext';

const CompetitionContext = createContext();

export const useCompetition = () => useContext(CompetitionContext);

export const CompetitionProvider = ({ children }) => {
  const { lastCompetition, setLastCompetition } = useAuth();
  const [loading, setLoading] = useState(false);

  const competition = lastCompetition;

  useEffect(() => {
    const compId = competition?._id || competition?.id;
    if (compId && !competition?.name) {
      fetchCompetition(compId);
    }
  }, [competition]);

  const fetchCompetition = async (id) => {
    setLoading(true);
    try {
      const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/competition/${id}`);
      if (!res.ok) throw new Error('Failed to fetch competition');
      const data = await res.json();
      setLastCompetition(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    competition,
    setCompetition: setLastCompetition,
    groupLabel: competition?.group_label || 'Group',
    groupLabelPlural: competition?.group_label_plural || 'Groups',
    fetchCompetition,
    loading
  };

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
};
