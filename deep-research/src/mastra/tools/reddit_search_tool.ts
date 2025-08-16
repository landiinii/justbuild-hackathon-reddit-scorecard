import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';
import 'dotenv/config';

const exa = new Exa(process.env.EXA_API_KEY);

export const redditSearchTool = createTool({
  id: 'reddit-search',
  description: 'Search Reddit for brand mentions, discussions, and competitor analysis',
  inputSchema: z.object({
    brandName: z.string().describe('The brand name to search for on Reddit'),
    brandContext: z.string().optional().describe('Context about the brand (e.g., "technology company", "airline")'),
    subreddits: z.array(z.string()).optional().describe('Specific subreddits to focus on'),
    maxResults: z.number().default(10).describe('Maximum number of results to return'),
    searchDepth: z.enum(['shallow', 'deep']).default('shallow').describe('Search depth - shallow for quick results, deep for comprehensive analysis'),
  }),
  execute: async ({ context, mastra }) => {
    console.log('Executing Reddit search tool');
    const { brandName, brandContext, subreddits, maxResults, searchDepth } = context;

    try {
      if (!process.env.EXA_API_KEY) {
        console.error('Error: EXA_API_KEY not found in environment variables');
        return { results: [], error: 'Missing API key' };
      }

      const queries = constructRedditQueries(brandName, brandContext, subreddits);
      console.log(`Constructed Reddit search queries:`, queries);

      let allResults = [];
      const targetResults = searchDepth === 'deep' ? maxResults * 2 : maxResults;
      
      for (const query of queries) {
        try {
          console.log(`Searching Reddit for: "${query}"`);
          const { results } = await exa.searchAndContents(query, {
            livecrawl: 'always',
            numResults: Math.min(10, targetResults),
          });

          if (results && results.length > 0) {
            allResults.push(...results);
            if (allResults.length >= targetResults) break;
          }
        } catch (searchError) {
          console.error(`Error with Reddit query "${query}":`, searchError);
          continue;
        }
      }

      if (allResults.length === 0) {
        console.log('No Reddit results found for any query');
        return { 
          results: [], 
          threads: [],
          subreddits: [],
          mentions: [],
          error: 'No Reddit results found' 
        };
      }

      console.log(`Found ${allResults.length} Reddit results, processing...`);

      const processedResults = await processRedditResults(allResults, brandName, brandContext, mastra);
      
      return {
        results: processedResults.slice(0, maxResults),
        threads: extractThreads(processedResults),
        subreddits: extractSubreddits(processedResults),
        mentions: extractMentions(processedResults, brandName),
        searchQueries: queries,
      };
    } catch (error) {
      console.error('Error in Reddit search:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        results: [],
        threads: [],
        subreddits: [],
        mentions: [],
        error: errorMessage,
      };
    }
  },
});

function constructRedditQueries(
  brandName: string, 
  brandContext?: string, 
  subreddits?: string[]
): string[] {
  const queries: string[] = [];
  const contextPart = brandContext ? ` ${brandContext}` : '';
  
  // Primary brand searches
  queries.push(`site:reddit.com "${brandName}"${contextPart}`);
  queries.push(`site:reddit.com ${brandName}${contextPart} review`);
  queries.push(`site:reddit.com ${brandName}${contextPart} experience`);
  queries.push(`site:reddit.com ${brandName}${contextPart} vs`);
  
  // Subreddit-specific searches if provided
  if (subreddits && subreddits.length > 0) {
    for (const subreddit of subreddits.slice(0, 3)) { // Limit to top 3 subreddits
      const cleanSubreddit = subreddit.replace(/^r\//, '');
      queries.push(`site:reddit.com/r/${cleanSubreddit} "${brandName}"`);
    }
  }
  
  // General discussion searches
  queries.push(`site:reddit.com "${brandName}" "best" OR "worst" OR "opinion"`);
  queries.push(`site:reddit.com "${brandName}" "alternative" OR "competitor"`);
  
  return queries;
}

async function processRedditResults(
  results: any[], 
  brandName: string, 
  brandContext?: string,
  mastra?: any
): Promise<any[]> {
  const processedResults = [];
  
  for (const result of results) {
    try {
      // Filter out non-Reddit results
      if (!result.url?.includes('reddit.com')) {
        continue;
      }

      // Skip if content is too short
      if (!result.text || result.text.length < 50) {
        processedResults.push({
          title: result.title || '',
          url: result.url,
          content: result.text || 'No content available',
          subreddit: extractSubredditFromUrl(result.url),
          score: 0,
          comments: 0,
          relevanceScore: calculateRedditRelevance(result, brandName),
        });
        continue;
      }

      // Extract basic Reddit metadata
      const subreddit = extractSubredditFromUrl(result.url);
      const redditMetadata = extractRedditMetadata(result.text);
      
      // Summarize content with Reddit focus
      let processedContent = result.text;
      if (mastra && result.text.length > 1000) {
        try {
          const summaryAgent = mastra.getAgent('webSummarizationAgent');
          const summaryResponse = await summaryAgent.generate([
            {
              role: 'user',
              content: `Summarize this Reddit discussion about "${brandName}" ${brandContext ? `(${brandContext})` : ''}:

Title: ${result.title || 'No title'}
Subreddit: ${subreddit}
Content: ${result.text.substring(0, 3000)}...

Focus on opinions, experiences, and any mentions of competitors or alternatives.`,
            },
          ]);
          processedContent = summaryResponse.text;
        } catch (summaryError) {
          console.error('Error summarizing Reddit content:', summaryError);
          processedContent = result.text.substring(0, 500) + '...';
        }
      }

      const relevanceScore = calculateRedditRelevance(result, brandName);

      processedResults.push({
        title: result.title || '',
        url: result.url,
        content: processedContent,
        subreddit,
        score: redditMetadata.score,
        comments: redditMetadata.comments,
        relevanceScore,
      });

      console.log(`Processed Reddit result: ${result.title || result.url} (relevance: ${relevanceScore})`);
    } catch (error) {
      console.error('Error processing Reddit result:', error);
    }
  }

  return processedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function extractSubredditFromUrl(url: string): string {
  const match = url.match(/reddit\.com\/r\/([^\/]+)/);
  return match ? `r/${match[1]}` : 'unknown';
}

function extractRedditMetadata(content: string): { score: number; comments: number } {
  // Try to extract score and comment count from content
  const scoreMatch = content.match(/(\d+)\s*(?:points?|upvotes?)/i);
  const commentsMatch = content.match(/(\d+)\s*comments?/i);
  
  return {
    score: scoreMatch ? parseInt(scoreMatch[1], 10) : 0,
    comments: commentsMatch ? parseInt(commentsMatch[1], 10) : 0,
  };
}

function calculateRedditRelevance(result: any, brandName: string): number {
  let score = 0;
  const url = result.url?.toLowerCase() || '';
  const title = result.title?.toLowerCase() || '';
  const content = result.text?.toLowerCase() || '';
  const brandLower = brandName.toLowerCase();
  
  // Brand name mentions
  const brandMentions = (content.match(new RegExp(brandLower, 'gi')) || []).length;
  score += Math.min(brandMentions * 10, 50);
  
  // Title relevance
  if (title.includes(brandLower)) {
    score += 30;
  }
  
  // Discussion indicators
  if (content.includes('review') || content.includes('experience') || content.includes('opinion')) {
    score += 15;
  }
  
  // Comparison indicators
  if (content.includes('vs') || content.includes('compare') || content.includes('alternative')) {
    score += 20;
  }
  
  // High engagement indicators
  if (content.includes('upvote') || content.includes('popular') || content.includes('trending')) {
    score += 10;
  }
  
  return Math.min(100, score);
}

function extractThreads(results: any[]): any[] {
  return results.slice(0, 5).map(result => ({
    title: result.title,
    url: result.url,
    subreddit: result.subreddit,
    score: result.score,
    comments: result.comments,
    sentiment: 'neutral' as const, // Will be determined by sentiment analysis tool
    excerpt: result.content.substring(0, 200) + '...',
  }));
}

function extractSubreddits(results: any[]): string[] {
  const subreddits = new Set<string>();
  results.forEach(result => {
    if (result.subreddit && result.subreddit !== 'unknown') {
      subreddits.add(result.subreddit);
    }
  });
  return Array.from(subreddits).slice(0, 10);
}

function extractMentions(results: any[], brandName: string): any[] {
  const mentions = [];
  const brandLower = brandName.toLowerCase();
  
  for (const result of results) {
    const content = result.content.toLowerCase();
    const mentionCount = (content.match(new RegExp(brandLower, 'gi')) || []).length;
    
    if (mentionCount > 0) {
      mentions.push({
        url: result.url,
        title: result.title,
        subreddit: result.subreddit,
        mentionCount,
        context: extractMentionContext(result.content, brandName),
      });
    }
  }
  
  return mentions;
}

function extractMentionContext(content: string, brandName: string): string {
  const brandLower = brandName.toLowerCase();
  const contentLower = content.toLowerCase();
  const index = contentLower.indexOf(brandLower);
  
  if (index === -1) return '';
  
  const start = Math.max(0, index - 100);
  const end = Math.min(content.length, index + brandName.length + 100);
  
  return content.substring(start, end);
}