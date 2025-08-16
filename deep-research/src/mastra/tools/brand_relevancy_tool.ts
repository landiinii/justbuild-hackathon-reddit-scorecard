import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const brandRelevancyTool = createTool({
  id: 'brand-relevancy',
  description: 'Evaluate if a search result is relevant to a specific brand and determine if it represents the official brand presence',
  inputSchema: z.object({
    brandName: z.string().describe('The brand name being researched'),
    brandContext: z.string().optional().describe('Context about the brand (e.g., "technology company", "airline")'),
    result: z
      .object({
        title: z.string(),
        url: z.string(),
        content: z.string(),
        preliminaryScore: z.number().optional(),
      })
      .describe('The search result to evaluate'),
    additionalIdentifiers: z.object({
      industry: z.string().optional(),
      location: z.string().optional(),
      products: z.array(z.string()).optional(),
    }).optional().describe('Additional brand identifiers for disambiguation'),
    existingUrls: z.array(z.string()).describe('URLs that have already been processed').optional(),
  }),
  execute: async ({ context, mastra }) => {
    try {
      const { brandName, brandContext, result, additionalIdentifiers, existingUrls = [] } = context;
      console.log('Evaluating brand relevancy for:', { brandName, url: result.url });

      // Check if URL already exists
      if (existingUrls.includes(result.url)) {
        return {
          isOfficialSite: false,
          confidenceScore: 0,
          signals: {
            domainMatch: false,
            contextMatch: false,
            contentConsistency: false,
            hasAboutPage: false,
            industryAlignment: false,
            alreadyProcessed: true,
          },
          reasoning: 'URL already processed',
          brandMatch: false,
        };
      }

      const brandRelevancyAgent = mastra!.getAgent('brandRelevancyAgent');

      // Construct evaluation prompt with all available context
      const contextInfo = [];
      if (brandContext) contextInfo.push(`Brand context: ${brandContext}`);
      if (additionalIdentifiers?.industry) contextInfo.push(`Industry: ${additionalIdentifiers.industry}`);
      if (additionalIdentifiers?.location) contextInfo.push(`Location: ${additionalIdentifiers.location}`);
      if (additionalIdentifiers?.products?.length) {
        contextInfo.push(`Products/Services: ${additionalIdentifiers.products.join(', ')}`);
      }

      const contextString = contextInfo.length > 0 ? `\n\nAdditional Context:\n${contextInfo.join('\n')}` : '';

      const response = await brandRelevancyAgent.generate(
        [
          {
            role: 'user',
            content: `Evaluate whether this search result is relevant to the brand "${brandName}" and determine if it represents the brand's official presence.${contextString}

Search result to evaluate:
Title: ${result.title}
URL: ${result.url}
Content snippet: ${result.content.substring(0, 1000)}...
${result.preliminaryScore ? `Preliminary score: ${result.preliminaryScore}` : ''}

Respond with a JSON object containing:
- isOfficialSite: boolean (true only if this appears to be the brand's official website)
- confidenceScore: number from 0-100 indicating overall relevance
- signals: object with boolean flags for:
  - domainMatch: domain relates to brand name
  - contextMatch: content matches provided brand context
  - contentConsistency: content appears professional/official
  - hasAboutPage: indicates presence of about/company sections
  - industryAlignment: aligns with expected industry
- reasoning: brief explanation of your evaluation
- brandMatch: boolean (true if this is definitely about the intended brand, not a different company with similar name)`,
          },
        ],
        {
          experimental_output: z.object({
            isOfficialSite: z.boolean(),
            confidenceScore: z.number().min(0).max(100),
            signals: z.object({
              domainMatch: z.boolean(),
              contextMatch: z.boolean(),
              contentConsistency: z.boolean(),
              hasAboutPage: z.boolean(),
              industryAlignment: z.boolean(),
            }),
            reasoning: z.string(),
            brandMatch: z.boolean(),
          }),
        },
      );

      const evaluation = response.object;
      
      console.log(`Brand relevancy evaluation for ${result.url}:`, {
        isOfficialSite: evaluation.isOfficialSite,
        confidenceScore: evaluation.confidenceScore,
        brandMatch: evaluation.brandMatch,
      });

      return evaluation;
    } catch (error) {
      console.error('Error evaluating brand relevancy:', error);
      return {
        isOfficialSite: false,
        confidenceScore: 0,
        signals: {
          domainMatch: false,
          contextMatch: false,
          contentConsistency: false,
          hasAboutPage: false,
          industryAlignment: false,
        },
        reasoning: 'Error in evaluation process',
        brandMatch: false,
      };
    }
  },
});