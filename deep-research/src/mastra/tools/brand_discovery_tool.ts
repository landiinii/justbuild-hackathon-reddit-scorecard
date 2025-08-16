import { z } from 'zod';
import { brandDiscoveryAgent } from '../agents/brand_discovery_agent';

export const brandDiscoveryTool = {
  description: 'Discovers comprehensive brand information including company details, website, size, and context',
  parameters: z.object({
    brandName: z.string().describe('The name of the brand to research'),
    brandContext: z.string().optional().describe('Optional context for disambiguation (e.g., "technology company", "airline")'),
    brandUrl: z.string().optional().describe('Optional known URL to validate against'),
    additionalIdentifiers: z.string().optional().describe('Optional industry, location, or product info for better targeting'),
  }),
  execute: async ({ brandName, brandContext, brandUrl, additionalIdentifiers }: {
    brandName: string;
    brandContext?: string;
    brandUrl?: string;
    additionalIdentifiers?: string;
  }) => {
    try {
      const result = await brandDiscoveryAgent.generate(
        `Research the brand "${brandName}"${brandContext ? ` (${brandContext})` : ''}${brandUrl ? ` with known URL: ${brandUrl}` : ''}${additionalIdentifiers ? ` Additional context: ${additionalIdentifiers}` : ''}`
      );

      return {
        success: true,
        data: result.text,
        metadata: {
          brandName,
          brandContext,
          brandUrl,
          additionalIdentifiers,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during brand discovery',
        metadata: {
          brandName,
          brandContext,
          brandUrl,
          additionalIdentifiers,
        }
      };
    }
  },
};