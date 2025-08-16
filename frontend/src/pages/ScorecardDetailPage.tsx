import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, TrendingUp, Users, Globe, Building, Users2, MessageSquare, Heart, ThumbsDown, Minus } from 'lucide-react';
import { Scorecard } from '../types/scorecard';
import redditLogo from '../images/reddit_logo.png';

interface ScorecardDetailPageProps {
  scorecards: Scorecard[];
  onScorecardUpdated: (id: string, updates: Partial<Scorecard>) => void;
}

const ScorecardDetailPage: React.FC<ScorecardDetailPageProps> = ({
  scorecards,
  onScorecardUpdated
}) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const scorecard = scorecards.find(sc => sc.id === id);

  if (!scorecard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Scorecard Not Found</h2>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Heart className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <ThumbsDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (score: number) => {
    if (score >= 7) return 'text-green-600';
    if (score >= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSentimentLabel = (score: number) => {
    if (score >= 7) return 'Positive';
    if (score >= 5) return 'Neutral';
    return 'Negative';
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
                <img src={redditLogo} alt="Reddit" className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{scorecard.brandName} Scorecard</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scorecard Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{scorecard.brandName}</h2>
              <p className="text-gray-600">Generated on {formatDate(scorecard.createdAt)}</p>
            </div>
            <div className="mt-4 lg:mt-0">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                scorecard.status === 'completed' ? 'bg-green-100 text-green-800' :
                scorecard.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {scorecard.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Brand Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Brand Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Website</p>
                    <a 
                      href={scorecard.brandWebsite} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center"
                    >
                      {scorecard.brandWebsite}
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-gray-600">Company Size</p>
                    <p className="font-medium text-gray-900">{scorecard.companySize}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sentiment Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Sentiment Analysis</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">{scorecard.brandName}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${getSentimentColor(scorecard.sentiment.brand)}`}>
                      {scorecard.sentiment.brand}/10
                    </span>
                    <p className="text-sm text-gray-600">{getSentimentLabel(scorecard.sentiment.brand)}</p>
                  </div>
                </div>
                
                {Object.entries(scorecard.sentiment.competitors).map(([competitor, score]) => (
                  <div key={competitor} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="font-medium">{competitor}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-semibold ${getSentimentColor(score)}`}>
                        {score}/10
                      </span>
                      <p className="text-sm text-gray-600">{getSentimentLabel(score)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mention Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Mention Comparison</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">{scorecard.brandName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-600">{scorecard.mentions.brand}</span>
                    <p className="text-sm text-gray-600">mentions</p>
                  </div>
                </div>
                
                {Object.entries(scorecard.mentions.competitors).map(([competitor, count]) => (
                  <div key={competitor} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span className="font-medium">{competitor}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-semibold text-gray-900">{count}</span>
                      <p className="text-sm text-gray-600">mentions</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notable Threads */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Notable Threads</h3>
              <div className="space-y-4">
                {scorecard.threads.map((thread, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 flex-1 mr-4">{thread.title}</h4>
                      {getSentimentIcon(thread.sentiment)}
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{thread.excerpt}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>{thread.score}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>{thread.comments}</span>
                        </span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {thread.subreddit}
                        </span>
                      </div>
                      <a 
                        href={thread.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                      >
                        View Thread
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Competitors */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Competitors</h3>
              <div className="space-y-3">
                {scorecard.competitors.map((competitor, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="font-medium text-gray-900">{competitor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subreddits */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Subreddits</h3>
              <div className="space-y-3">
                {scorecard.subreddits.map((subreddit, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-900">{subreddit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{scorecard.mentions.brand}</div>
                  <div className="text-sm text-gray-600">Total Mentions</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{scorecard.competitors.length}</div>
                  <div className="text-sm text-gray-600">Competitors Analyzed</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{scorecard.subreddits.length}</div>
                  <div className="text-sm text-gray-600">Active Communities</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScorecardDetailPage;
