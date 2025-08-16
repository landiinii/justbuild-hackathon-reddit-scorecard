import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import 'dotenv/config';

export const redditSearchTool = createTool({
  id: 'reddit-search',
  description: 'Search Reddit directly for brand mentions, discussions, and competitor analysis using Reddit JSON API',
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
      const queries = constructRedditQueries(brandName, brandContext, subreddits);
      console.log(`Constructed Reddit search URLs:`, queries);

      let allResults = [];
      const targetResults = searchDepth === 'deep' ? maxResults * 2 : maxResults;
      
      for (const queryUrl of queries) {
        try {
          console.log(`Fetching Reddit data from: "${queryUrl}"`);
          const response = await fetch(queryUrl, {
            headers: {
              'User-Agent': 'RedditSearchTool/1.0 (by /u/reddituser)',
            },
          });

          if (!response.ok) {
            console.error(`Reddit API responded with status: ${response.status}`);
            continue;
          }

          const data = await response.json();
          
          if (data.data && data.data.children && data.data.children.length > 0) {
            const posts = data.data.children
              .map((child: any) => child.data)
              .slice(0, Math.min(10, targetResults))
              .map((post: any) => ({
                title: post.title,
                url: `https://www.reddit.com${post.permalink}`,
                text: `${post.title}\n\n${post.selftext || ''}`,
                subreddit: post.subreddit,
                score: post.score,
                num_comments: post.num_comments,
                created_utc: post.created_utc,
                author: post.author,
              }));

            allResults.push(...posts);
            if (allResults.length >= targetResults) break;
          }
        } catch (searchError) {
          console.error(`Error with Reddit query "${queryUrl}":`, searchError);
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
  
  // URL encode the search terms
  const encodeBrandName = encodeURIComponent(brandName);
  const encodeFullSearch = (term: string) => encodeURIComponent(term);
  
  // Primary brand searches
  queries.push(`https://www.reddit.com/search/.json?q=${encodeBrandName}${encodeURIComponent(contextPart)}&sort=relevance&t=all`);
  queries.push(`https://www.reddit.com/search/.json?q=${encodeFullSearch(`${brandName}${contextPart} review`)}&sort=relevance&t=all`);
  queries.push(`https://www.reddit.com/search/.json?q=${encodeFullSearch(`${brandName}${contextPart} experience`)}&sort=relevance&t=all`);
  queries.push(`https://www.reddit.com/search/.json?q=${encodeFullSearch(`${brandName}${contextPart} vs`)}&sort=relevance&t=all`);
  
  // Subreddit-specific searches if provided
  if (subreddits && subreddits.length > 0) {
    for (const subreddit of subreddits.slice(0, 3)) { // Limit to top 3 subreddits
      const cleanSubreddit = subreddit.replace(/^r\//, '');
      queries.push(`https://www.reddit.com/r/${cleanSubreddit}/search/.json?q=${encodeBrandName}&restrict_sr=1&sort=relevance&t=all`);
    }
  }
  
  // General discussion searches
  queries.push(`https://www.reddit.com/search/.json?q=${encodeFullSearch(`${brandName} best OR worst OR opinion`)}&sort=relevance&t=all`);
  queries.push(`https://www.reddit.com/search/.json?q=${encodeFullSearch(`${brandName} alternative OR competitor`)}&sort=relevance&t=all`);
  
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
      // Skip if content is too short
      if (!result.text || result.text.length < 50) {
        processedResults.push({
          title: result.title || '',
          url: result.url,
          content: result.text || 'No content available',
          subreddit: `r/${result.subreddit}`,
          score: result.score || 0,
          comments: result.num_comments || 0,
          author: result.author || 'unknown',
          created_utc: result.created_utc || 0,
          relevanceScore: calculateRedditRelevance(result, brandName),
        });
        continue;
      }

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
Subreddit: r/${result.subreddit}
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
        subreddit: `r/${result.subreddit}`,
        score: result.score || 0,
        comments: result.num_comments || 0,
        author: result.author || 'unknown',
        created_utc: result.created_utc || 0,
        relevanceScore,
      });

      console.log(`Processed Reddit result: ${result.title || result.url} (relevance: ${relevanceScore})`);
    } catch (error) {
      console.error('Error processing Reddit result:', error);
    }
  }

  return processedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function calculateRedditRelevance(result: any, brandName: string): number {
  let score = 0;
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
  
  // Reddit score boost (higher scored posts are more relevant)
  if (result.score) {
    score += Math.min(result.score / 10, 15);
  }
  
  // Comment count boost (more discussed posts are more relevant)
  if (result.num_comments) {
    score += Math.min(result.num_comments / 5, 10);
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