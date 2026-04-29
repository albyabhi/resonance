import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';

export default function EntryPage() {
  const navigate = useNavigate();
  const { isAuthenticated, lastCompetition } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-8">What do you want to do?</h1>
        
        <div className="space-y-4 flex flex-col">
          {isAuthenticated && lastCompetition && (
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors text-lg flex items-center justify-center gap-2"
            >
              Resume {lastCompetition.name}
            </button>
          )}

          <button 
            onClick={() => navigate('/signup')}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-lg"
          >
            Create New Competition
          </button>
          
          <button 
            onClick={() => navigate('/join')}
            className="w-full py-4 px-6 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 font-medium rounded-lg transition-colors text-lg"
          >
            Join Existing Competition
          </button>
        </div>
        
        {!isAuthenticated && (
          <div className="mt-8 text-sm text-neutral-500 dark:text-neutral-400">
            Already have an account? <button onClick={() => navigate('/login')} className="text-blue-600 dark:text-blue-400 underline">Log in</button>
          </div>
        )}
      </div>
    </div>
  );
}
