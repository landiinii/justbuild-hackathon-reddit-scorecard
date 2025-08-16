import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const brandContentExtractionTool = createTool({
  id: 'brand-content-extraction',
  description: 'Extract structured brand information from verified brand content',
  inputSchema: z.object({
    brandName: z.string().describe('The brand name being researched'),
    brandContext: z.string().optional().describe('Context about the brand for validation'),
    results: z.array(z.object({
      title: z.string(),
      url: z.string(),
      content: z.string(),
      isOfficialSite: z.boolean(),
      confidenceScore: z.number(),
    })).describe('Array of search results with relevancy scores'),
    additionalIdentifiers: z.object({
      industry: z.string().optional(),
      location: z.string().optional(),
      products: z.array(z.string()).optional(),
    }).optional().describe('Additional brand identifiers for validation'),
  }),
  execute: async ({ context, mastra }) => {
    try {
      const { brandName, brandContext, results, additionalIdentifiers } = context;
      console.log('Extracting brand content for:', brandName);

      // Filter to only high-confidence, official sources
      const officialResults = results.filter(result => 
        result.isOfficialSite && result.confidenceScore >= 70
      );

      if (officialResults.length === 0) {
        // Fallback to highest confidence results if no official sites found
        const sortedResults = results
          .filter(result => result.confidenceScore >= 50)
          .sort((a, b) => b.confidenceScore - a.confidenceScore);
        
        if (sortedResults.length === 0) {
          return {
            success: false,
            error: 'No sufficiently relevant results found for brand extraction',
            brandData: null,
          };
        }

        console.log('No official sites found, using highest confidence results');
        officialResults.push(...sortedResults.slice(0, 2));
      }

      console.log(`Extracting from ${officialResults.length} high-confidence results`);

      const brandContentExtractionAgent = mastra!.getAgent('brandContentExtractionAgent');

      // Combine content from multiple sources for more comprehensive extraction
      const combinedContent = officialResults.map(result => 
        `Source: ${result.url}\nTitle: ${result.title}\nContent: ${result.content}\n---\n`
      ).join('\n');

      // Construct context information for validation
      const contextInfo = [];
      if (brandContext) contextInfo.push(`Expected context: ${brandContext}`);
      if (additionalIdentifiers?.industry) contextInfo.push(`Expected industry: ${additionalIdentifiers.industry}`);
      if (additionalIdentifiers?.location) contextInfo.push(`Expected location: ${additionalIdentifiers.location}`);
      if (additionalIdentifiers?.products?.length) {
        contextInfo.push(`Expected products/services: ${additionalIdentifiers.products.join(', ')}`);
      }

      const contextString = contextInfo.length > 0 ? `\n\nValidation Context:\n${contextInfo.join('\n')}\n` : '';

      const response = await brandContentExtractionAgent.generate(
        [
          {
            role: 'user',
            content: `Extract structured brand information for "${brandName}" from the following verified brand content:${contextString}

Content to analyze:
${combinedContent.substring(0, 6000)}...

Extract and return the following information in JSON format:
- description: single sentence describing what the brand does
- topics: array of 3-7 relevant topics this brand relates to
- categories: array of business categories/industries the brand operates in
- additionalContext: object with any contextual info (foundingYear, headquarters, globalPresence, etc.)
- confidence: object with confidence levels (high/medium/low) for each field
- extractionNotes: brief notes about the extraction quality and sources used

Focus on factual information from official brand statements. Do NOT attempt to classify company size - this will be handled separately.`,
          },
        ],
        {
          experimental_output: z.object({
            description: z.string(),
            topics: z.array(z.string()).min(3).max(7),
            categories: z.array(z.string()).min(1).max(5),
            additionalContext: z.object({
              foundingYear: z.string().optional(),
              headquarters: z.string().optional(),
              globalPresence: z.string().optional(),
              marketPosition: z.string().optional(),
            }),
            confidence: z.object({
              description: z.enum(['high', 'medium', 'low']),
              topics: z.enum(['high', 'medium', 'low']),
              categories: z.enum(['high', 'medium', 'low']),
              additionalContext: z.enum(['high', 'medium', 'low']),
            }),
            extractionNotes: z.string(),
          }),
        },
      );

      const extractedData = response.object;

      // Add metadata about the extraction process
      const extractionMetadata = {
        sourcesUsed: officialResults.length,
        sourceUrls: officialResults.map(r => r.url),
        averageConfidenceScore: officialResults.reduce((sum, r) => sum + r.confidenceScore, 0) / officialResults.length,
        hasOfficialSites: officialResults.some(r => r.isOfficialSite),
      };

      console.log('Brand content extraction completed:', {
        brandName,
        sourcesUsed: extractionMetadata.sourcesUsed,
        averageConfidence: extractionMetadata.averageConfidenceScore,
      });

      return {
        success: true,
        brandData: extractedData,
        extractionMetadata,
      };
    } catch (error) {
      console.error('Error extracting brand content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in extraction',
        brandData: null,
      };
    }
  },
});