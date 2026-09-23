import React, { createContext, useContext } from 'react';
import { useAuth } from '../components/AuthContext';

const CompetitionContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useCompetition = () => useContext(CompetitionContext);

export const CompetitionProvider = ({ children }) => {
  const { competition, setUserData } = useAuth();

  const setCompetition = (newComp) => {
    setUserData((prev) => ({ ...prev, competition: newComp }));
  };

  const value = {
    competition,
    setCompetition,
    // Canonical competition id — the only supported read. Producers disagree
    // on shape (setup maps `{id}`, select/login return `{_id}`), so never
    // read `competition._id` directly in components.
    competitionId: competition?._id || competition?.id || competition?.competition_id || "",
    groupLabel: competition?.group_label || 'Group',
    groupLabelPlural: competition?.group_label_plural || 'Groups',
  };

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
};
