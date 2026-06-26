import React, { createContext, useContext } from 'react';
import { useAuth } from '../components/AuthContext';

const CompetitionContext = createContext();

export const useCompetition = () => useContext(CompetitionContext);

export const CompetitionProvider = ({ children }) => {
  const { competition } = useAuth();

  const value = {
    competition,
    groupLabel: competition?.group_label || 'Group',
    groupLabelPlural: competition?.group_label_plural || 'Groups',
  };

  return (
    <CompetitionContext.Provider value={value}>
      {children}
    </CompetitionContext.Provider>
  );
};
