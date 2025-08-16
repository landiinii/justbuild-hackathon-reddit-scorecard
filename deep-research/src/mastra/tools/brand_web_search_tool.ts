import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';
import 'dotenv/config';

// Initialize Exa client
const exa = new Exa(process.env.EXA_API_KEY);

export const brandWebSearchTool = createTool({
  id: 'brand-web-search',
  description: 'Search the web for brand-specific information with optimized queries and filtering',
  inputSchema: z.object({
    brandName: z.string().describe('The brand name to search for'),
    brandContext: z.string().optional().describe('Context about the brand (e.g., "technology company", "airline")'),
    searchType: z.enum(['official', 'about', 'general']).default('official').describe('Type of search to perform'),
    additionalIdentifiers: z.object({
      industry: z.string().optional(),
      location: z.string().optional(),
      products: z.array(z.string()).optional(),
    }).optional().describe('Additional brand identifiers for disambiguation'),
  }),
  execute: async ({ context, mastra }) => {
    console.log('Executing brand web search tool');
    const { brandName, brandContext, searchType, additionalIdentifiers } = context;

    try {
      if (!process.env.EXA_API_KEY) {
        console.error('Error: EXA_API_KEY not found in environment variables');
        return { results: [], error: 'Missing API key' };
      }

      // Construct intelligent search queries based on brand context
      const queries = constructBrandQueries(brandName, brandContext, searchType, additionalIdentifiers);
      console.log(`Constructed brand search queries:`, queries);

      let allResults = [];
      
      // Try multiple queries with fallback
      for (const query of queries) {
        try {
          console.log(`Searching for: "${query}"`);
          const { results } = await exa.searchAndContents(query, {
            livecrawl: 'always',
            numResults: 6, // Increased for better brand disambiguation
          });

          if (results && results.length > 0) {
            allResults.push(...results);
            // If we get good results from first query, we can stop
            if (results.length >= 4) break;
          }
        } catch (searchError) {
          console.error(`Error with query "${query}":`, searchError);
          continue; // Try next query
        }
      }

      if (allResults.length === 0) {
        console.log('No search results found for any query');
        return { results: [], error: 'No results found' };
      }

      console.log(`Found ${allResults.length} total search results, processing...`);

      // Pre-filter and score results for brand relevance
      const processedResults = [];
      for (const result of allResults) {
        try {
          // Skip if content is too short or missing
          if (!result.text || result.text.length < 100) {
            processedResults.push({
              title: result.title || '',
              url: result.url,
              content: result.text || 'No content available',
              preliminaryScore: calculatePreliminaryScore(result, brandName, brandContext),
            });
            continue;
          }

          // Get the summarization agent
          const summaryAgent = mastra!.getAgent('webSummarizationAgent');

          // Summarize the content with brand focus
          const summaryResponse = await summaryAgent.generate([
            {
              role: 'user',
              content: `Please summarize the following web content for brand research on "${brandName}" ${brandContext ? `(${brandContext})` : ''}:

Title: ${result.title || 'No title'}
URL: ${result.url}
Content: ${result.text.substring(0, 8000)}...

Focus on information about the brand itself, company details, official presence markers, and any indicators this might be the brand's official website.`,
            },
          ]);

          const preliminaryScore = calculatePreliminaryScore(result, brandName, brandContext);

          processedResults.push({
            title: result.title || '',
            url: result.url,
            content: summaryResponse.text,
            preliminaryScore,
          });

          console.log(`Processed result for: ${result.title || result.url} (score: ${preliminaryScore})`);
        } catch (summaryError) {
          console.error('Error summarizing content:', summaryError);
          // Fallback to truncated original content
          processedResults.push({
            title: result.title || '',
            url: result.url,
            content: result.text ? result.text.substring(0, 500) + '...' : 'Content unavailable',
            preliminaryScore: calculatePreliminaryScore(result, brandName, brandContext),
          });
        }
      }

      // Sort by preliminary score (highest first) and remove duplicates
      const uniqueResults = removeDuplicateUrls(processedResults);
      const sortedResults = uniqueResults.sort((a, b) => b.preliminaryScore - a.preliminaryScore);

      return {
        results: sortedResults.slice(0, 8), // Return top 8 results
        searchQueries: queries,
      };
    } catch (error) {
      console.error('Error in brand web search:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      return {
        results: [],
        error: errorMessage,
      };
    }
  },
});

function constructBrandQueries(
  brandName: string, 
  brandContext?: string, 
  searchType: 'official' | 'about' | 'general' = 'official',
  additionalIdentifiers?: {
    industry?: string;
    location?: string;
    products?: string[];
  }
): string[] {
  const queries: string[] = [];
  const contextPart = brandContext || additionalIdentifiers?.industry || '';
  
  switch (searchType) {
    case 'official':
      queries.push(`"${brandName}" ${contextPart} official website`);
      queries.push(`${brandName} ${contextPart} company homepage`);
      if (additionalIdentifiers?.location) {
        queries.push(`"${brandName}" ${contextPart} ${additionalIdentifiers.location} official site`);
      }
      break;
      
    case 'about':
      queries.push(`"${brandName}" ${contextPart} about company history`);
      queries.push(`${brandName} ${contextPart} company information`);
      break;
      
    case 'general':
      queries.push(`"${brandName}" ${contextPart}`);
      if (additionalIdentifiers?.products && additionalIdentifiers.products.length > 0) {
        queries.push(`${brandName} ${additionalIdentifiers.products[0]} ${contextPart}`);
      }
      break;
  }
  
  // Fallback query if others fail
  queries.push(`"${brandName}"`);
  
  return queries;
}

function calculatePreliminaryScore(
  result: any, 
  brandName: string, 
  brandContext?: string
): number {
  let score = 0;
  const url = result.url?.toLowerCase() || '';
  const title = result.title?.toLowerCase() || '';
  const content = result.text?.toLowerCase() || '';
  const brandLower = brandName.toLowerCase();
  
  // Domain scoring - likely official domains get higher scores
  if (url.includes(brandLower.replace(/\s+/g, '')) || url.includes(brandLower.replace(/\s+/g, '-'))) {
    score += 40; // High score for brand name in domain
  }
  
  // Look for official markers
  if (url.includes('.com') && !url.includes('news') && !url.includes('review') && !url.includes('blog')) {
    score += 20;
  }
  
  // Title relevance
  if (title.includes(brandLower)) {
    score += 15;
  }
  
  // Content indicators
  if (content.includes('official') || content.includes('homepage') || content.includes('about us')) {
    score += 10;
  }
  
  // Context matching
  if (brandContext && content.includes(brandContext.toLowerCase())) {
    score += 10;
  }
  
  // Penalize third-party sites
  if (url.includes('wikipedia') || url.includes('linkedin') || url.includes('facebook') || 
      url.includes('twitter') || url.includes('news') || url.includes('review')) {
    score -= 20;
  }
  
  return Math.max(0, Math.min(100, score));
}

function removeDuplicateUrls(results: any[]): any[] {
  const seen = new Set();
  return results.filter(result => {
    if (seen.has(result.url)) {
      return false;
    }
    seen.add(result.url);
    return true;
  });
}