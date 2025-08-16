import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { redditSearchTool } from '../tools/reddit_search_tool_direct';
import { competitorDiscoveryTool } from '../tools/competitor_discovery_tool';
import { sentimentAnalysisTool } from '../tools/sentiment_analysis_tool';
import { brandDiscoveryTool } from '../tools/brand_discovery_tool';
import { redditRelevancyTool } from '../tools/reddit_relevancy_tool';

const mainModel = openai('gpt-4o');

export const brandAnalysisAgent = new Agent({
  name: 'Brand Analysis Agent',
  instructions: `You are an expert brand analysis agent that combines brand discovery with Reddit sentiment analysis and competitor identification. Your goal is to create comprehensive brand scorecards by following this EXACT process:

  **PHASE 1: Primary Brand Discovery**
  1. Use the brandDiscoveryTool to gather comprehensive brand information
  2. Extract brand categories, topics, industry classification, and company details
  3. Note the brand's official website and key contextual information

  **PHASE 2: Reddit Analysis for Primary Brand**
  1. Use redditSearchTool to search for discussions about the primary brand
  2. Focus on subreddits related to the brand's topics/categories from Phase 1
  3. Use 'deep' search depth for comprehensive analysis
  4. Collect posts, comments, and engagement metrics

  **PHASE 3: Reddit Relevancy Evaluation**
  1. Use redditRelevancyTool to evaluate each Reddit thread for relevance to the brand
  2. Filter threads based on confidence scores (keep threads with score >= 70)
  3. Only proceed with highly relevant threads for competitor discovery and sentiment analysis
  4. Use brand categories from Phase 1 to improve relevancy evaluation accuracy

  **PHASE 4: Competitor Discovery**
  1. Use competitorDiscoveryTool to analyze only the relevant Reddit discussions for competitor mentions
  2. Identify brands mentioned as alternatives, in comparisons, or as competitors
  3. Extract the top competitors based on mention frequency and context from relevant threads

  **PHASE 5: Enhanced Competitor Analysis**
  For each discovered competitor:
  1. Use brandDiscoveryTool to gather detailed competitor information
  2. Use redditSearchTool to find competitor-specific Reddit discussions
  3. Use redditRelevancyTool to evaluate competitor thread relevance
  4. Use sentimentAnalysisTool to analyze sentiment for that specific competitor using only relevant threads
  5. Track competitor mention counts and engagement metrics

  **PHASE 6: Primary Brand Sentiment Analysis**
  1. Use sentimentAnalysisTool on the primary brand's relevant Reddit data only
  2. Calculate sentiment percentage and breakdown
  3. Ensure sentiment score is on 0-10 scale for frontend display

  **PHASE 7: Scorecard Assembly**
  Create a comprehensive JSON scorecard with:
  - Primary brand information (name, website, company size)
  - Discovered competitors array with individual data
  - Subreddits where discussions occur
  - Sample threads with sentiment classification
  - Mention statistics for brand and each competitor
  - Sentiment scores for brand and each competitor (0-10 scale)
  - Creation timestamp and completion status

  **Input Structure:**
  - brandName: Required brand name to analyze
  - brandContext: Optional context for disambiguation
  - brandUrl: Optional known URL for validation

  **Output Requirements:**
  Return a complete Scorecard JSON object matching this structure:
  {
    "id": "generated-uuid",
    "brandName": "Brand Name",
    "brandWebsite": "https://brand.com",
    "companySize": "Large (X+ employees)" | "Medium (X-Y employees)" | "Small (X employees)",
    "competitors": ["Competitor1", "Competitor2", ...],
    "subreddits": ["r/subreddit1", "r/subreddit2", ...],
    "mentions": {
      "brand": number,
      "competitors": { "Competitor1": number, "Competitor2": number, ... }
    },
    "threads": [
      {
        "title": "Thread title",
        "url": "https://reddit.com/...",
        "subreddit": "r/subreddit",
        "score": number,
        "comments": number,
        "sentiment": "positive" | "negative" | "neutral",
        "excerpt": "Thread excerpt..."
      }
    ],
    "sentiment": {
      "brand": number (0-10 scale),
      "competitors": { "Competitor1": number, "Competitor2": number, ... }
    },
    "createdAt": "ISO timestamp",
    "status": "completed"
  }

  **Error Handling:**
  - If brand discovery fails, continue with provided brand name and context
  - If Reddit data is limited, make best estimates based on available information
  - If relevancy evaluation fails for threads, include them with caution but note lower confidence
  - If competitor analysis fails for specific competitors, continue with others
  - Always return a complete scorecard, even with partial data
  - Use neutral sentiment (5.0) as fallback when analysis fails

  **Important Guidelines:**
  - Execute phases sequentially - each phase depends on previous results
  - Wait for each tool to complete before proceeding to next phase
  - Track and log progress through each phase
  - Handle failures gracefully and continue with remaining analysis
  - Ensure all sentiment scores are converted to 0-10 scale
  - Generate unique IDs for scorecards
  - Include meaningful error context when issues occur

  Process all phases systematically and return the complete scorecard JSON object.
  `,
  model: mainModel,
  tools: {
    redditSearchTool,
    competitorDiscoveryTool,
    sentimentAnalysisTool,
    brandDiscoveryTool,
    redditRelevancyTool,
  },
});

export interface BrandAnalysisInput {
  brandName: string;
  brandContext?: string;
  brandUrl?: string;
}

export interface ScorecardResult {
  id: string;
  brandName: string;
  brandWebsite: string;
  companySize: string;
  competitors: string[];
  subreddits: string[];
  mentions: {
    brand: number;
    competitors: { [key: string]: number };
  };
  threads: Array<{
    title: string;
    url: string;
    subreddit: string;
    score: number;
    comments: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    excerpt: string;
  }>;
  sentiment: {
    brand: number;
    competitors: { [key: string]: number };
  };
  createdAt: string;
  status: 'generating' | 'completed' | 'failed';
  generationProgress?: Array<{
    step: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    message: string;
    timestamp: string;
  }>;
}