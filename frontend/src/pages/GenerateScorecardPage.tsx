import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Loader2, CheckCircle, AlertCircle, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import { Scorecard, GenerationStep } from '../types/scorecard';
import apiService, { BrandAnalysisRequest } from '../services/api';

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
  const [brandContext, setBrandContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentScorecard, setCurrentScorecard] = useState<Scorecard | null>(null);
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Test backend connection
  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const result = await apiService.testConnection();
      if (result.success) {
        setConnectionStatus('connected');
        setError(null);
      } else {
        setConnectionStatus('disconnected');
        setError(result.message);
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Test on component mount
  React.useEffect(() => {
    testConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;

    // Check connection before starting
    if (connectionStatus !== 'connected') {
      setError('Please ensure the backend is connected before starting analysis');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
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
        step: 'Brand Search & Discovery',
        status: 'pending',
        message: 'Searching for brand information...',
        timestamp: new Date().toISOString()
      },
      {
        step: 'Relevancy Evaluation',
        status: 'pending',
        message: 'Evaluating source relevance...',
        timestamp: new Date().toISOString()
      },
      {
        step: 'Content Extraction',
        status: 'pending',
        message: 'Extracting brand information...',
        timestamp: new Date().toISOString()
      },
      {
        step: 'Company Sizing',
        status: 'pending',
        message: 'Analyzing company size...',
        timestamp: new Date().toISOString()
      }
    ];

    setGenerationSteps(initialSteps);

    try {
      // Start the brand analysis
      await performBrandAnalysis(newScorecard.id, initialSteps);
    } catch (err) {
      console.error('Brand analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setIsGenerating(false);
      
      // Update scorecard status to failed
      onScorecardUpdated(newScorecard.id, { status: 'failed' });
    }
  };

  const performBrandAnalysis = async (scorecardId: string, steps: GenerationStep[]) => {
    try {
      // Update first step to in-progress
      const updatedSteps = [...steps];
      updatedSteps[0].status = 'in-progress';
      updatedSteps[0].timestamp = new Date().toISOString();
      setGenerationSteps(updatedSteps);

      // Prepare the request
      const request: BrandAnalysisRequest = {
        brandName: brandName.trim(),
        brandContext: brandContext.trim() || undefined,
      };

      // Try streaming first, fallback to regular call
      let stream = await apiService.streamBrandDiscoveryAgent(request);
      
      if (stream) {
        // Handle streaming response
        await handleStreamingResponse(stream, scorecardId, updatedSteps);
      } else {
        // Fallback to regular API call
        await handleRegularResponse(request, scorecardId, updatedSteps);
      }

    } catch (error) {
      console.error('Analysis failed:', error);
      throw error;
    }
  };

  const handleStreamingResponse = async (
    stream: ReadableStream<Uint8Array>,
    scorecardId: string,
    steps: GenerationStep[]
  ) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process any complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            await processStreamLine(line, scorecardId, steps);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  };

  const handleRegularResponse = async (
    request: BrandAnalysisRequest,
    scorecardId: string,
    steps: GenerationStep[]
  ) => {
    // Simulate step-by-step progress for regular API calls
    for (let i = 0; i < steps.length; i++) {
      // Update step to in-progress
      const updatedSteps = [...steps];
      updatedSteps[i].status = 'in-progress';
      updatedSteps[i].timestamp = new Date().toISOString();
      setGenerationSteps(updatedSteps);

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      // Update step to completed
      updatedSteps[i].status = 'completed';
      updatedSteps[i].timestamp = new Date().toISOString();
      setGenerationSteps(updatedSteps);

      // Update the scorecard with progress
      onScorecardUpdated(scorecardId, {
        generationProgress: updatedSteps
      });
    }

    // Make the actual API call
    try {
      const response = await apiService.callBrandDiscoveryAgent(request);
      
      if (response.success && response.data) {
        // Convert response to scorecard format
        const scorecardUpdates = apiService.convertToScorecard(
          brandName.trim(),
          response,
          scorecardId
        );

        // Update the scorecard with real data
        onScorecardUpdated(scorecardId, scorecardUpdates);
        setCurrentScorecard(prev => prev ? { ...prev, ...scorecardUpdates } : null);
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  const processStreamLine = async (
    line: string,
    scorecardId: string,
    steps: GenerationStep[]
  ) => {
    try {
      // Try to parse as JSON
      const data = JSON.parse(line);
      
      // Update steps based on the streaming data
      if (data.step || data.phase) {
        const stepName = data.step || data.phase;
        const stepIndex = steps.findIndex(s => 
          s.step.toLowerCase().includes(stepName.toLowerCase()) ||
          stepName.toLowerCase().includes(s.step.toLowerCase())
        );

        if (stepIndex !== -1) {
          const updatedSteps = [...steps];
          updatedSteps[stepIndex].status = 'in-progress';
          updatedSteps[stepIndex].message = data.message || data.description || `Processing ${stepName}...`;
          updatedSteps[stepIndex].timestamp = new Date().toISOString();
          
          setGenerationSteps(updatedSteps);
          onScorecardUpdated(scorecardId, { generationProgress: updatedSteps });
        }
      }

      // Check if analysis is complete
      if (data.status === 'completed' || data.finishReason === 'stop') {
        // Mark all steps as completed
        const completedSteps = steps.map(step => ({
          ...step,
          status: 'completed' as const,
          timestamp: new Date().toISOString()
        }));

        setGenerationSteps(completedSteps);
        onScorecardUpdated(scorecardId, { 
          status: 'completed',
          generationProgress: completedSteps
        });

        // Convert final data to scorecard format if available
        if (data.output || data.result) {
          try {
            const scorecardUpdates = apiService.convertToScorecard(
              brandName.trim(),
              { success: true, data: data.output || data.result },
              scorecardId
            );
            onScorecardUpdated(scorecardId, scorecardUpdates);
          } catch (conversionError) {
            console.warn('Could not convert streaming output to scorecard:', conversionError);
          }
        }

        setIsGenerating(false);
        
        // Navigate to the completed scorecard after a short delay
        setTimeout(() => {
          navigate(`/scorecard/${scorecardId}`);
        }, 2000);
      }

    } catch (parseError) {
      // Not JSON, treat as text update
      console.log('Stream update:', line);
    }
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

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="w-5 h-5 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="w-5 h-5 text-red-500" />;
      default:
        return <Wifi className="w-5 h-5 text-gray-400" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Backend Connected';
      case 'disconnected':
        return 'Backend Disconnected';
      default:
        return 'Checking Connection...';
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
            {/* Connection Status */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getConnectionIcon()}
                  <span className="font-medium text-gray-900">{getConnectionText()}</span>
                </div>
                <button
                  onClick={testConnection}
                  disabled={isTestingConnection}
                  className="btn-secondary text-sm px-3 py-1"
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              {connectionStatus === 'disconnected' && (
                <p className="text-sm text-red-600 mt-2">
                  Make sure your Mastra backend is running at http://localhost:4111
                </p>
              )}
            </div>

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
                  Brand Name *
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

              <div className="mb-6">
                <label htmlFor="brandContext" className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Context (Optional)
                </label>
                <input
                  type="text"
                  id="brandContext"
                  value={brandContext}
                  onChange={(e) => setBrandContext(e.target.value)}
                  placeholder="e.g., technology company, coffee chain, athletic wear"
                  className="input-field text-lg"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Helps disambiguate brands with common names
                </p>
              </div>

              <button
                type="submit"
                disabled={!brandName.trim() || connectionStatus !== 'connected'}
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
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Analysis Failed</h3>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setError(null);
                    setIsGenerating(false);
                  }}
                  className="mt-4 btn-secondary"
                >
                  Try Again
                </button>
              </div>
            )}

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
                Our AI is analyzing brand data to create your comprehensive scorecard. This may take a few minutes.
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
