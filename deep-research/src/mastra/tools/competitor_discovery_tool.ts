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
      const analysisPrompt = `Identify competitor brands for "${brandName}"${brandContext ? ` (${brandContext})` : ''} from the following Reddit discussions. 

IMPORTANT: Return ONLY a valid JSON object in exactly this format, with no additional text before or after:
{
  "competitors": ["Competitor1", "Competitor2"],
  "competitorMentions": {"Competitor1": 3, "Competitor2": 1},
  "analysisContext": "Brief description of analysis"
}

Maximum ${maxCompetitors} competitors. Reddit discussions to analyze:

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
      ).join('')}

Return ONLY the JSON object with no additional text:`;

      const result = await competitorDiscoveryAgent.generate(analysisPrompt);
      
      // Try to parse the result as JSON, with multiple fallback strategies
      let parsedResult = null;
      
      try {
        // First, try direct JSON parsing
        parsedResult = JSON.parse(result.text);
      } catch (parseError) {
        console.warn('Direct JSON parsing failed, trying to extract JSON from response');
        
        try {
          // Try to find JSON within the response text
          const jsonMatch = result.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResult = JSON.parse(jsonMatch[0]);
          }
        } catch (extractError) {
          console.warn('JSON extraction failed, trying manual parsing');
          
          // Fallback: try to extract competitors manually from text
          const competitorNames = extractCompetitorsFromText(result.text, brandName);
          if (competitorNames.length > 0) {
            parsedResult = {
              competitors: competitorNames.slice(0, maxCompetitors),
              competitorMentions: competitorNames.reduce((acc, name) => {
                acc[name] = 1; // Default count
                return acc;
              }, {} as Record<string, number>),
              analysisContext: 'Competitors extracted from text analysis',
            };
          }
        }
      }
      
      if (parsedResult && parsedResult.competitors) {
        console.log(`LLM competitor discovery for ${brandName}:`, parsedResult.competitors);
        return parsedResult;
      } else {
        console.warn('Failed to parse LLM competitor discovery result, using fallback');
        console.log('Raw LLM response:', result.text);
        return {
          competitors: [],
          competitorMentions: {},
          analysisContext: 'LLM analysis completed but result format was invalid',
          error: 'Failed to parse LLM response',
          rawResponse: result.text.substring(0, 500) // Include first 500 chars for debugging
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

// Helper function to extract competitor names from text when JSON parsing fails
function extractCompetitorsFromText(text: string, brandName: string): string[] {
  const competitors: string[] = [];
  const brandLower = brandName.toLowerCase();
  
  // Look for common competitor patterns in the text
  const competitorPatterns = [
    /competitors?[:\s]+([A-Z][a-zA-Z\s&]+?)(?:\s|,|\.|$)/gi,
    /alternatives?[:\s]+([A-Z][a-zA-Z\s&]+?)(?:\s|,|\.|$)/gi,
    /vs\.?\s+([A-Z][a-zA-Z\s&]+?)(?:\s|,|\.|$)/gi,
    /compared to\s+([A-Z][a-zA-Z\s&]+?)(?:\s|,|\.|$)/gi,
    /better than\s+([A-Z][a-zA-Z\s&]+?)(?:\s|,|\.|$)/gi,
    /instead of\s+([A-Z][a-zA-Z\s&]+?)(?:\s|,|\.|$)/gi,
  ];
  
  for (const pattern of competitorPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const competitor = match[1].trim();
      
      // Basic validation
      if (competitor.length > 2 && 
          competitor.length < 50 && 
          competitor.toLowerCase() !== brandLower &&
          !competitors.includes(competitor)) {
        competitors.push(competitor);
      }
    }
  }
  
  // Also look for quoted brand names
  const quotedBrands = text.match(/"([A-Z][a-zA-Z\s&]+?)"/g);
  if (quotedBrands) {
    quotedBrands.forEach(quoted => {
      const brand = quoted.replace(/"/g, '').trim();
      if (brand.length > 2 && 
          brand.length < 50 && 
          brand.toLowerCase() !== brandLower &&
          !competitors.includes(brand)) {
        competitors.push(brand);
      }
    });
  }
  
  return competitors.slice(0, 10); // Limit to reasonable number
}