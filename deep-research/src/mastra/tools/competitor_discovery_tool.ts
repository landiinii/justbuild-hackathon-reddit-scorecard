import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { competitorDiscoveryAgent } from '../agents/competitor_discovery_agent';

export const competitorDiscoveryTool = createTool({
  id: 'competitor-discovery',
  description: 'Analyze Reddit discussions to identify competitor brands mentioned in relation to the target brand',
  inputSchema: z.object({
    redditResults: z.array(z.object({
      title: z.string(),
      url: z.string(),
      content: z.string(),
      subreddit: z.string(),
      score: z.number(),
      comments: z.number(),
    })).describe('Reddit search results to analyze for competitor mentions'),
    brandName: z.string().describe('The target brand name to find competitors for'),
    brandContext: z.string().optional().describe('Context about the brand for better competitor identification'),
    maxCompetitors: z.number().default(4).describe('Maximum number of competitors to return'),
  }),
  execute: async ({ context }) => {
    console.log('Executing competitor discovery tool');
    const { redditResults, brandName, brandContext, maxCompetitors } = context;

    try {
      if (!redditResults || redditResults.length === 0) {
        console.log('No Reddit results provided for competitor discovery');
        return { 
          competitors: [], 
          competitorMentions: {},
          analysisContext: 'No Reddit data available for analysis' 
        };
      }

      console.log(`Analyzing ${redditResults.length} Reddit results for competitors of ${brandName} using LLM`);

      // Prepare data for the competitor discovery agent
      const analysisPrompt = `Identify competitor brands for "${brandName}"${brandContext ? ` (${brandContext})` : ''} from the following Reddit discussions. Return maximum ${maxCompetitors} competitors:

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

`
      ).join('')}`;

      const result = await competitorDiscoveryAgent.generate(analysisPrompt);
      
      // Try to parse the result as JSON, fallback to default if parsing fails
      try {
        const parsedResult = JSON.parse(result.text);
        console.log(`LLM competitor discovery for ${brandName}:`, parsedResult.competitors);
        return parsedResult;
      } catch (parseError) {
        console.warn('Failed to parse LLM competitor discovery result, using fallback');
        return {
          competitors: [],
          competitorMentions: {},
          analysisContext: 'LLM analysis completed but result format was invalid',
          error: 'Failed to parse LLM response'
        };
      }
    } catch (error) {
      console.error('Error in competitor discovery:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        competitors: [],
        competitorMentions: {},
        error: errorMessage,
      };
    }
  },
});