import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { sentimentAnalysisAgent } from '../agents/sentiment_analysis_agent';

export const sentimentAnalysisTool = createTool({
  id: 'sentiment-analysis',
  description: 'Analyze sentiment of Reddit discussions for a specific brand, returning percentage-based sentiment scores',
  inputSchema: z.object({
    redditResults: z.array(z.object({
      title: z.string(),
      url: z.string(),
      content: z.string(),
      subreddit: z.string(),
      score: z.number(),
      comments: z.number(),
    })).describe('Reddit search results to analyze for sentiment'),
    brandName: z.string().describe('The brand name to analyze sentiment for'),
    brandContext: z.string().optional().describe('Context about the brand for better sentiment analysis'),
  }),
  execute: async ({ context }) => {
    console.log('Executing sentiment analysis tool');
    const { redditResults, brandName, brandContext } = context;

    try {
      if (!redditResults || redditResults.length === 0) {
        console.log('No Reddit results provided for sentiment analysis');
        return { 
          sentimentScore: 5.0, // Neutral default
          sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
          totalMentions: 0,
          analysisContext: 'No Reddit data available for analysis' 
        };
      }

      console.log(`Analyzing sentiment for ${brandName} across ${redditResults.length} Reddit results using LLM`);

      // Prepare data for the sentiment analysis agent
      const analysisPrompt = `Analyze sentiment for the brand "${brandName}"${brandContext ? ` (${brandContext})` : ''} in the following Reddit discussions:

${redditResults.map((result, index) => 
        `**Discussion ${index + 1}:**
` +
        `Title: ${result.title}
` +
        `URL: ${result.url}
` +
        `Subreddit: ${result.subreddit}
` +
        `Score: ${result.score} | Comments: ${result.comments}
` +
        `Content: ${result.content.substring(0, 1000)}${result.content.length > 1000 ? '...' : ''}
\n`
      ).join('')}`;

      const result = await sentimentAnalysisAgent.generate(analysisPrompt);
      
      // Try to parse the result as JSON, fallback to default if parsing fails
      try {
        const parsedResult = JSON.parse(result.text);
        console.log(`LLM sentiment analysis for ${brandName}: ${parsedResult.sentimentScore}/10`);
        return parsedResult;
      } catch (parseError) {
        console.warn('Failed to parse LLM sentiment analysis result, using fallback');
        return {
          sentimentScore: 5.0,
          sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
          totalMentions: 0,
          analysisContext: 'LLM analysis completed but result format was invalid',
          error: 'Failed to parse LLM response'
        };
      }
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        sentimentScore: 5.0,
        sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
        totalMentions: 0,
        error: errorMessage,
      };
    }
  },
});

