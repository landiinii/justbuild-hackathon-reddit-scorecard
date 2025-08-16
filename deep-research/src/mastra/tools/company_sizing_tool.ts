import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import Exa from 'exa-js';
import 'dotenv/config';

// Initialize Exa client
const exa = new Exa(process.env.EXA_API_KEY);

export const companySizingTool = createTool({
  id: 'company-sizing',
  description: 'Determine company size using specialized searches across business intelligence and third-party sources',
  inputSchema: z.object({
    brandName: z.string().describe('The brand/company name to research'),
    brandContext: z.string().optional().describe('Context about the brand (e.g., "technology company")'),
    officialDomain: z.string().optional().describe('Official company domain for validation'),
    industry: z.string().optional().describe('Industry for context-aware sizing'),
    foundingYear: z.string().optional().describe('Company founding year if known'),
  }),
  execute: async ({ context, mastra }) => {
    try {
      const { brandName, brandContext, officialDomain, industry, foundingYear } = context;
      console.log('Executing company sizing research for:', brandName);

      // Check if Exa API key is available
      if (!process.env.EXA_API_KEY) {
        return {
          success: false,
          error: 'EXA_API_KEY not found in environment variables',
          sizingData: null,
        };
      }

      const companySizingAgent = mastra!.getAgent('companySizingAgent');

      // Construct optimized sizing queries (reduced from 6 to 4 for speed)
      const sizingQueries = constructSizingQueries(brandName, brandContext, industry);
      console.log(`Company sizing queries (${sizingQueries.length}):`, sizingQueries.map(q => q.type));

      let allResults = [];
      
      console.log(`Executing ${sizingQueries.length} searches in parallel for faster results...`);
      const startTime = Date.now();

      // Execute all searches in parallel for much better performance
      const searchPromises = sizingQueries.map(async (queryConfig) => {
        try {
          console.log(`Searching: "${queryConfig.query}" in domains: ${queryConfig.domains?.join(', ') || 'all'}`);
          
          // Prepare search options
          const searchOptions: any = {
            livecrawl: 'never',
            numResults: 2, // Reduced from 3 to 2 for faster processing
          };

          // Add domains restriction if provided
          if (queryConfig.domains && queryConfig.domains.length > 0) {
            searchOptions.includeDomains = queryConfig.domains;
          }

          const { results } = await exa.searchAndContents(queryConfig.query, searchOptions);

          if (results && results.length > 0) {
            return results.map(result => ({
              title: result.title || '',
              url: result.url,
              text: result.text || 'No content available',
              searchType: queryConfig.type,
              targetDomains: queryConfig.domains || [],
            }));
          }
          return [];
        } catch (searchError) {
          console.error(`Error in sizing search "${queryConfig.query}":`, searchError);
          return [];
        }
      });

      // Wait for all searches to complete with timeout
      const searchResults = await Promise.allSettled(searchPromises);
      
      // Flatten successful results
      const rawResults = searchResults
        .filter(result => result.status === 'fulfilled')
        .flatMap(result => result.value);
      
      const searchTime = Date.now() - startTime;
      console.log(`Parallel search completed in ${searchTime}ms, found ${rawResults.length} results`);

      if (rawResults.length === 0) {
        return {
          success: false,
          error: 'No sizing data found from any sources',
          sizingData: null,
        };
      }

      // Smart content processing - avoid unnecessary summarization
      const summaryAgent = mastra!.getAgent('webSummarizationAgent');
      const contentProcessingPromises = rawResults.map(async (result) => {
        try {
          let content = result.text;
          
          // Only summarize if content is substantial (>1000 chars) and likely to contain useful data
          if (result.text && result.text.length > 1000) {
            try {
              const summaryResponse = await summaryAgent.generate([
                {
                  role: 'user',
                  content: `Extract key company sizing metrics from this content for "${brandName}":

${result.text.substring(0, 3000)}...

Focus ONLY on: employee count, revenue, valuation, funding amount, market cap. Be concise.`,
                },
              ]);
              content = summaryResponse.text;
            } catch (summaryError) {
              // Fallback to truncated content if summarization fails
              content = result.text.substring(0, 800) + '...';
            }
          } else if (result.text && result.text.length > 500) {
            // For medium content, just truncate intelligently
            content = result.text.substring(0, 500) + '...';
          }

          return {
            title: result.title,
            url: result.url,
            content,
            searchType: result.searchType,
            targetDomains: result.targetDomains,
          };
        } catch (error) {
          // Fallback processing
          return {
            title: result.title,
            url: result.url,
            content: result.text ? result.text.substring(0, 500) + '...' : 'Content unavailable',
            searchType: result.searchType,
            targetDomains: result.targetDomains,
          };
        }
      });

      // Process content in parallel as well
      const contentResults = await Promise.allSettled(contentProcessingPromises);
      allResults = contentResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
      
      const totalProcessingTime = Date.now() - startTime;
      console.log(`Total processing time: ${totalProcessingTime}ms`);

      // Early termination check - if we have high-quality data, skip expensive analysis
      const hasHighQualityData = allResults.some(result => 
        (result.searchType === 'employee-data' && result.url.includes('linkedin.com')) ||
        (result.searchType === 'funding-data' && result.url.includes('crunchbase.com')) ||
        (result.searchType === 'financial-data' && (result.url.includes('bloomberg.com') || result.url.includes('sec.gov')))
      );

      // Fast-path for well-known companies or clear indicators
      if (allResults.length >= 3 && hasHighQualityData) {
        console.log('High-quality data sources found, proceeding with analysis...');
      } else if (allResults.length === 0) {
        // Intelligent fallback when no data is found
        console.log('No external data found, using intelligent fallback...');
        return {
          success: true,
          sizingData: {
            companySize: 'Growth' as const, // Conservative default
            confidence: 'low' as const,
            keyIndicators: {},
            sources: ['fallback'],
            reasoning: `No reliable external data found for ${brandName}. Defaulting to Growth category as most common for actively searched companies.`,
            dataQuality: 'Low - no external validation data available',
            conflictingInfo: 'No data to analyze',
          },
          searchMetadata: {
            totalResults: 0,
            searchTypes: [],
            sourceUrls: [],
            targetedDomains: [],
            processingTime: totalProcessingTime,
            fallbackUsed: true,
          },
        };
      }

      console.log(`Found ${allResults.length} sizing-related results, analyzing with optimized approach...`);

      // Combine results with smart content limits for faster processing
      const prioritizedResults = allResults
        .sort((a, b) => {
          // Prioritize high-value sources for analysis
          const aPriority = getSourcePriority(a.url, a.searchType);
          const bPriority = getSourcePriority(b.url, b.searchType);
          return bPriority - aPriority;
        })
        .slice(0, 8); // Reduced from 10 to 8 for faster processing

      const combinedContent = prioritizedResults
        .map(result => 
          `Source: ${result.url} (${result.searchType})\nTitle: ${result.title}\nContent: ${result.content.substring(0, 300)}...\n---\n`
        ).join('\n');

      // Build context for the sizing agent
      const contextInfo = [];
      if (brandContext) contextInfo.push(`Company context: ${brandContext}`);
      if (industry) contextInfo.push(`Industry: ${industry}`);
      if (foundingYear) contextInfo.push(`Founded: ${foundingYear}`);
      if (officialDomain) contextInfo.push(`Official domain: ${officialDomain}`);

      const contextString = contextInfo.length > 0 ? `\n\nCompany Context:\n${contextInfo.join('\n')}\n` : '';

      // Optimize final analysis with reduced content for faster processing
      const analysisStartTime = Date.now();
      const response = await companySizingAgent.generate(
        [
          {
            role: 'user',
            content: `Analyze the following business data to classify "${brandName}" company size:${contextString}

Data Sources (${prioritizedResults.length} results):
${combinedContent.substring(0, 6000)}...

Classify into: Startup, Growth, Mid-Market, Large Enterprise, or Unicorn. Be decisive and concise.`,
          },
        ],
        {
          experimental_output: z.object({
            companySize: z.enum(['Startup', 'Growth', 'Mid-Market', 'Large Enterprise', 'Unicorn']),
            confidence: z.enum(['high', 'medium', 'low']),
            keyIndicators: z.object({
              revenue: z.string().optional(),
              employees: z.string().optional(),
              valuation: z.string().optional(),
              fundingStage: z.string().optional(),
              marketCap: z.string().optional(),
              foundingYear: z.string().optional(),
              lastFunding: z.string().optional(),
            }),
            sources: z.array(z.string()),
            reasoning: z.string(),
            dataQuality: z.string(),
            conflictingInfo: z.string().optional(),
          }),
        },
      );

      const sizingAnalysis = response.object;

      if (!sizingAnalysis) {
        return {
          success: false,
          error: 'Failed to generate sizing analysis from the collected data',
          sizingData: null,
        };
      }

      const analysisTime = Date.now() - analysisStartTime;
      const totalOptimizedTime = Date.now() - startTime;
      
      // Add metadata about the optimized search process
      const searchMetadata = {
        totalResults: allResults.length,
        processedResults: prioritizedResults.length,
        searchTypes: [...new Set(allResults.map(r => r.searchType))],
        sourceUrls: allResults.map(r => r.url),
        targetedDomains: sizingQueries.flatMap(q => q.domains || []),
        processingTime: totalOptimizedTime,
        searchTime: searchTime,
        analysisTime: analysisTime,
        optimizationsUsed: ['parallel-search', 'smart-content-processing', 'prioritized-sources'],
      };

      console.log('⚡ Optimized company sizing analysis completed:', {
        brandName,
        size: sizingAnalysis.companySize,
        confidence: sizingAnalysis.confidence,
        sourcesFound: sizingAnalysis.sources.length,
        totalTime: `${totalOptimizedTime}ms`,
        searchTime: `${searchTime}ms`,
        analysisTime: `${analysisTime}ms`,
        optimizations: searchMetadata.optimizationsUsed.join(', '),
      });

      return {
        success: true,
        sizingData: sizingAnalysis,
        searchMetadata,
      };
    } catch (error) {
      console.error('Error in company sizing analysis:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in sizing analysis',
        sizingData: null,
      };
    }
  },
});

function constructSizingQueries(
  brandName: string,
  brandContext?: string,
  industry?: string
): Array<{ query: string; type: string; domains?: string[]; priority: number }> {
  const queries = [];
  const contextPart = brandContext || industry || '';

  // High priority - most reliable sources for quick results
  queries.push({
    query: `"${brandName}" ${contextPart} employees headcount`,
    type: 'employee-data',
    domains: ['linkedin.com'],
    priority: 1,
  });

  queries.push({
    query: `"${brandName}" ${contextPart} funding valuation Series`,
    type: 'funding-data', 
    domains: ['crunchbase.com', 'techcrunch.com'],
    priority: 1,
  });

  // Medium priority - financial data
  queries.push({
    query: `"${brandName}" ${contextPart} revenue "market cap" IPO`,
    type: 'financial-data',
    domains: ['bloomberg.com', 'reuters.com'],
    priority: 2,
  });

  // Lower priority - general scale indicators
  queries.push({
    query: `"${brandName}" ${contextPart} "company size" startup unicorn`,
    type: 'scale-indicators',
    priority: 3,
  });

  // Sort by priority for potential early termination
  return queries.sort((a, b) => a.priority - b.priority);
}

function getSourcePriority(url: string, searchType: string): number {
  // Higher numbers = higher priority
  let priority = 0;
  
  // High-value domains
  if (url.includes('linkedin.com')) priority += 10;
  if (url.includes('crunchbase.com')) priority += 9;
  if (url.includes('sec.gov')) priority += 8;
  if (url.includes('bloomberg.com')) priority += 7;
  if (url.includes('reuters.com')) priority += 6;
  if (url.includes('techcrunch.com')) priority += 5;
  
  // Search type priority
  if (searchType === 'employee-data') priority += 3;
  if (searchType === 'funding-data') priority += 3;
  if (searchType === 'financial-data') priority += 2;
  
  return priority;
}