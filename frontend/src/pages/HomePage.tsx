import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Scorecard } from '../types/scorecard';
import { TrendingUp, BarChart3, Users, Calendar, ArrowRight } from 'lucide-react';

interface HomePageProps {
  scorecards: Scorecard[];
  onGenerateNew: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ scorecards, onGenerateNew }) => {
  const navigate = useNavigate();

  const handleGenerateNew = () => {
    navigate('/generate');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSentimentColor = (score: number) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Reddit Scorecard</h1>
            </div>
            <p className="text-gray-600 text-sm">AI-Powered Brand Research</p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Discover What Reddit Thinks About Your Brand
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get comprehensive insights into brand sentiment, competitor analysis, and community engagement across Reddit with our AI-powered research tool.
          </p>
          
          <button
            onClick={handleGenerateNew}
            className="btn-primary text-lg px-8 py-4 inline-flex items-center space-x-2"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Generate New Scorecard</span>
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            What You'll Discover
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Brand Sentiment</h4>
              <p className="text-gray-600">Understand how Reddit users feel about your brand compared to competitors</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Community Insights</h4>
              <p className="text-gray-600">Discover which subreddits are talking about your brand and why</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Competitive Analysis</h4>
              <p className="text-gray-600">See how your brand stacks up against competitors in mentions and sentiment</p>
            </div>
          </div>
        </div>
      </section>

      {/* Previous Scorecards Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-3xl font-bold text-gray-900">Previous Scorecards</h3>
            {scorecards.length > 0 && (
              <button
                onClick={handleGenerateNew}
                className="btn-secondary inline-flex items-center space-x-2"
              >
                <span>Generate Another</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {scorecards.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-xl font-medium text-gray-900 mb-2">No Scorecards Yet</h4>
              <p className="text-gray-600 mb-6">Generate your first Reddit scorecard to get started</p>
              <button onClick={handleGenerateNew} className="btn-primary">
                Create Your First Scorecard
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scorecards.map((scorecard) => (
                <div
                  key={scorecard.id}
                  onClick={() => navigate(`/scorecard/${scorecard.id}`)}
                  className="card cursor-pointer hover:shadow-lg transition-all duration-200 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {scorecard.brandName}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      scorecard.status === 'completed' ? 'bg-green-100 text-green-800' :
                      scorecard.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {scorecard.status}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(scorecard.createdAt)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {scorecard.subreddits.length} subreddits
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <span className={getSentimentColor(scorecard.sentiment.brand)}>
                        {scorecard.sentiment.brand}/10 sentiment
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Mentions</span>
                      <span className="font-semibold text-gray-900">{scorecard.mentions.brand}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Competitors</span>
                      <span className="font-semibold text-gray-900">{scorecard.competitors.length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
