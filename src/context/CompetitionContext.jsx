import React, { createContext, useContext } from 'react';
import { useAuth } from '../components/AuthContext';

const CompetitionContext = createContext();

export const useCompetition = () => useContext(CompetitionContext);

export const CompetitionProvider = ({ children }) => {
  const { competition, setUserData } = useAuth();

  const setCompetition = (newComp) => {
    setUserData((prev) => ({ ...prev, competition: newComp }));
  };

  const value = {
    competition,
    setCompetition,
    groupLabel: competition?.group_label || 'Group',
    groupLabelPlural: competition?.group_label_plural || 'Groups',
  };

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
};
