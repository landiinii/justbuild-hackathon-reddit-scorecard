import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Loader2, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Scorecard, GenerationStep } from '../types/scorecard';

interface GenerateScorecardPageProps {
  onScorecardCreated: (scorecard: Scorecard) => void;
  onScorecardUpdated: (id: string, updates: Partial<Scorecard>) => void;
}

const GenerateScorecardPage: React.FC<GenerateScorecardPageProps> = ({
  onScorecardCreated,
  onScorecardUpdated
}) => {
  const navigate = useNavigate();
  const [brandName, setBrandName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentScorecard, setCurrentScorecard] = useState<Scorecard | null>(null);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    setIsGenerating(true);
    
    // Create a new scorecard
    const newScorecard: Scorecard = {
      id: Date.now().toString(),
      brandName: brandName.trim(),
      brandWebsite: '',
      companySize: '',
      competitors: [],
      subreddits: [],
      mentions: { brand: 0, competitors: {} },
      threads: [],
      sentiment: { brand: 0, competitors: {} },
      createdAt: new Date().toISOString(),
      status: 'generating',
      generationProgress: []
    };

    setCurrentScorecard(newScorecard);
    onScorecardCreated(newScorecard);

    // Initialize generation steps
    const initialSteps: GenerationStep[] = [
      {
        step: 'Initializing Research',
        status: 'pending',
        message: 'Setting up research parameters...',
        timestamp: new Date().toISOString()
      },
      {
        step: 'Web Search',
        status: 'pending',
        message: 'Searching for brand information...',
        timestamp: new Date().toISOString()
      },
      {
        step: 'Reddit Analysis',
        status: 'pending',
        message: 'Analyzing Reddit mentions and sentiment...',
        timestamp: new Date().toISOString()
      },
      {
        step: 'Competitor Research',
        status: 'pending',
        message: 'Identifying and analyzing competitors...',
        timestamp: new Date().toISOString()
      },
      {
        step: 'Data Compilation',
        status: 'pending',
        message: 'Compiling final scorecard...',
        timestamp: new Date().toISOString()
      }
    ];

    setGenerationSteps(initialSteps);

    // Simulate the generation process
    await simulateGeneration(newScorecard.id, initialSteps);
  };

  const simulateGeneration = async (scorecardId: string, steps: GenerationStep[]) => {
    for (let i = 0; i < steps.length; i++) {
      // Update step to in-progress
      const updatedSteps = [...steps];
      updatedSteps[i].status = 'in-progress';
      updatedSteps[i].timestamp = new Date().toISOString();
      setGenerationSteps(updatedSteps);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

      // Update step to completed
      updatedSteps[i].status = 'completed';
      updatedSteps[i].timestamp = new Date().toISOString();
      setGenerationSteps(updatedSteps);

      // Update the scorecard with progress
      if (currentScorecard) {
        onScorecardUpdated(scorecardId, {
          generationProgress: updatedSteps
        });
      }
    }

    // Mark as completed
    if (currentScorecard) {
      const completedScorecard = {
        ...currentScorecard,
        status: 'completed' as const,
        brandWebsite: 'https://example.com',
        companySize: 'Medium (1,000-10,000 employees)',
        competitors: ['Competitor A', 'Competitor B', 'Competitor C'],
        subreddits: ['r/technology', 'r/business', 'r/startups'],
        mentions: { brand: 1500, competitors: { 'Competitor A': 1200, 'Competitor B': 980, 'Competitor C': 750 } },
        threads: [
          {
            title: 'Great experience with this brand!',
            url: 'https://reddit.com/r/example',
            subreddit: 'r/technology',
            score: 1250,
            comments: 89,
            sentiment: 'positive' as const,
            excerpt: 'I\'ve been using this product for months and it\'s been fantastic...'
          }
        ],
        sentiment: { brand: 7.5, competitors: { 'Competitor A': 6.8, 'Competitor B': 7.2, 'Competitor C': 6.5 } }
      };

      onScorecardUpdated(scorecardId, completedScorecard);
      setCurrentScorecard(completedScorecard);
    }

    setIsGenerating(false);
    
    // Navigate to the completed scorecard after a short delay
    setTimeout(() => {
      navigate(`/scorecard/${scorecardId}`);
    }, 2000);
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'in-progress':
        return 'border-blue-200 bg-blue-50';
      case 'failed':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <button
              onClick={() => navigate('/')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Generate New Scorecard</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isGenerating ? (
          /* Brand Input Form */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Research Your Brand on Reddit
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Enter the brand name you'd like to research. Our AI will analyze Reddit mentions, 
                sentiment, competitors, and community engagement to create a comprehensive scorecard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-md mx-auto">
              <div className="mb-6">
                <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  id="brandName"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Tesla, Starbucks, Nike"
                  className="input-field text-lg"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!brandName.trim()}
                className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="w-5 h-5 mr-2" />
                Start Research
              </button>
            </form>
          </div>
        ) : (
          /* Generation Progress */
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Researching: {currentScorecard?.brandName}
                </h2>
              </div>
              <p className="text-gray-600">
                Our AI is analyzing Reddit data to create your comprehensive scorecard. This may take a few minutes.
              </p>
            </div>

            {/* Generation Steps */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Progress</h3>
              <div className="space-y-4">
                {generationSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStepStatusColor(step.status)} transition-all duration-300`}
                  >
                    <div className="flex items-center space-x-3">
                      {getStepIcon(step.status)}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{step.step}</h4>
                        <p className="text-sm text-gray-600">{step.message}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm text-gray-500">
                  {Math.round((generationSteps.filter(s => s.status === 'completed').length / generationSteps.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(generationSteps.filter(s => s.status === 'completed').length / generationSteps.length) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateScorecardPage;
