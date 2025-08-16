import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const redditRelevancyTool = createTool({
  id: 'reddit-relevancy',
  description: 'Evaluate if a Reddit thread is relevant to a specific brand and determine its value for competitor discovery and sentiment analysis',
  inputSchema: z.object({
    brandName: z.string().describe('The brand name being researched'),
    brandContext: z.string().optional().describe('Context about the brand (e.g., "technology company", "airline")'),
    thread: z
      .object({
        title: z.string(),
        url: z.string(),
        subreddit: z.string(),
        score: z.number(),
        comments: z.number(),
        content: z.string(),
        excerpt: z.string().optional(),
      })
      .describe('The Reddit thread to evaluate'),
    brandCategories: z.array(z.string()).optional().describe('Brand categories/topics from brand discovery'),
    thresholdScore: z.number().optional().default(70).describe('Minimum confidence score to consider thread relevant'),
  }),
  execute: async ({ context, mastra }) => {
    try {
      const { brandName, brandContext, thread, brandCategories = [], thresholdScore = 70 } = context;
      console.log('Evaluating Reddit thread relevancy for:', { brandName, threadTitle: thread.title, subreddit: thread.subreddit });

      const redditRelevancyAgent = mastra!.getAgent('redditRelevancyAgent');

      // Construct evaluation prompt with all available context
      const contextInfo = [];
      if (brandContext) contextInfo.push(`Brand context: ${brandContext}`);
      if (brandCategories.length > 0) contextInfo.push(`Brand categories: ${brandCategories.join(', ')}`);

      const contextString = contextInfo.length > 0 ? `\n\nAdditional Context:\n${contextInfo.join('\n')}` : '';

      const response = await redditRelevancyAgent.generate(
        [
          {
            role: 'user',
            content: `Evaluate whether this Reddit thread is relevant to the brand "${brandName}" and valuable for competitor discovery and sentiment analysis.${contextString}

Reddit thread to evaluate:
Title: ${thread.title}
Subreddit: ${thread.subreddit}
Score: ${thread.score}
Comments: ${thread.comments}
URL: ${thread.url}
Content: ${thread.content.substring(0, 1500)}...
${thread.excerpt ? `Excerpt: ${thread.excerpt}` : ''}

Respond with a JSON object containing:
- isRelevant: boolean (true if thread discusses the brand meaningfully)
- confidenceScore: number from 0-100 indicating relevance confidence
- relevanceType: string indicating type of relevance ("direct_mention", "comparison", "user_experience", "support_discussion", "industry_discussion", "competitor_mention", "irrelevant")
- signals: object with boolean flags for:
  - directBrandMention: brand name is explicitly mentioned
  - contextualRelevance: discussion relates to brand's industry/products
  - userExperience: contains user experiences/reviews
  - competitorComparison: compares brand to competitors
  - highEngagement: thread has significant engagement (score/comments)
  - subredditAlignment: subreddit is relevant to brand's domain
- reasoning: brief explanation of evaluation
- sentimentIndicators: object with:
  - hasSentiment: boolean indicating if thread contains sentiment about the brand
  - sentimentClarity: number 0-100 indicating how clear the sentiment is
- competitorValue: object with:
  - hasCompetitorMentions: boolean indicating if competitors are discussed
  - competitorDiscoveryValue: number 0-100 indicating value for finding competitors`,
          },
        ],
        {
          experimental_output: z.object({
            isRelevant: z.boolean(),
            confidenceScore: z.number().min(0).max(100),
            relevanceType: z.enum([
              'direct_mention',
              'comparison',
              'user_experience',
              'support_discussion',
              'industry_discussion',
              'competitor_mention',
              'irrelevant'
            ]),
            signals: z.object({
              directBrandMention: z.boolean(),
              contextualRelevance: z.boolean(),
              userExperience: z.boolean(),
              competitorComparison: z.boolean(),
              highEngagement: z.boolean(),
              subredditAlignment: z.boolean(),
            }),
            reasoning: z.string(),
            sentimentIndicators: z.object({
              hasSentiment: z.boolean(),
              sentimentClarity: z.number().min(0).max(100),
            }),
            competitorValue: z.object({
              hasCompetitorMentions: z.boolean(),
              competitorDiscoveryValue: z.number().min(0).max(100),
            }),
          }),
        },
      );

      const evaluation = response.object;
      
      console.log(`Reddit thread relevancy evaluation for "${thread.title}":`, {
        isRelevant: evaluation.isRelevant,
        confidenceScore: evaluation.confidenceScore,
        relevanceType: evaluation.relevanceType,
        meetsThreshold: evaluation.confidenceScore >= thresholdScore,
      });

      return {
        ...evaluation,
        meetsThreshold: evaluation.confidenceScore >= thresholdScore,
        thresholdUsed: thresholdScore,
      };
    } catch (error) {
      console.error('Error evaluating Reddit thread relevancy:', error);
      return {
        isRelevant: false,
        confidenceScore: 0,
        relevanceType: 'irrelevant' as const,
        signals: {
          directBrandMention: false,
          contextualRelevance: false,
          userExperience: false,
          competitorComparison: false,
          highEngagement: false,
          subredditAlignment: false,
        },
        reasoning: 'Error in evaluation process',
        sentimentIndicators: {
          hasSentiment: false,
          sentimentClarity: 0,
        },
        competitorValue: {
          hasCompetitorMentions: false,
          competitorDiscoveryValue: 0,
        },
        meetsThreshold: false,
        thresholdUsed: 70,
      };
    }
  },
});