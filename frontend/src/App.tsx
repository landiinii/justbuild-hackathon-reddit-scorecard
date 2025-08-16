import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GenerateScorecardPage from './pages/GenerateScorecardPage';
import ScorecardDetailPage from './pages/ScorecardDetailPage';
import { Scorecard } from './types/scorecard';
import { dummyScorecards } from './data/dummyData';

function App() {
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load dummy data on app start
    setScorecards(dummyScorecards);
  }, []);

  const addScorecard = (scorecard: Scorecard) => {
    setScorecards(prev => [scorecard, ...prev]);
  };

  const updateScorecard = (id: string, updates: Partial<Scorecard>) => {
    setScorecards(prev => 
      prev.map(sc => sc.id === id ? { ...sc, ...updates } : sc)
    );
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                scorecards={scorecards}
                onGenerateNew={() => {}}
              />
            } 
          />
          <Route 
            path="/generate" 
            element={
              <GenerateScorecardPage 
                onScorecardCreated={addScorecard}
                onScorecardUpdated={updateScorecard}
              />
            } 
          />
          <Route 
            path="/scorecard/:id" 
            element={
              <ScorecardDetailPage 
                scorecards={scorecards}
                onScorecardUpdated={updateScorecard}
              />
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
