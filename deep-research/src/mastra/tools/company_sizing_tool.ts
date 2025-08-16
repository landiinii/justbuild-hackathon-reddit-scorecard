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

      // Construct specialized sizing queries
      const sizingQueries = constructSizingQueries(brandName, brandContext, industry);
      console.log('Company sizing queries:', sizingQueries);

      let allResults = [];

      // Execute searches with domain targeting for better results
      for (const queryConfig of sizingQueries) {
        try {
          console.log(`Searching for sizing data: "${queryConfig.query}" in domains: ${queryConfig.domains?.join(', ') || 'all'}`);
          
          // Prepare search options
          const searchOptions: any = {
            livecrawl: 'never',
            numResults: 3,
          };

          // Add domains restriction if provided
          if (queryConfig.domains && queryConfig.domains.length > 0) {
            searchOptions.includeDomains = queryConfig.domains;
          }

          const { results } = await exa.searchAndContents(queryConfig.query, searchOptions);

          if (results && results.length > 0) {
            // Get the summarization agent for content processing
            const summaryAgent = mastra!.getAgent('webSummarizationAgent');

            // Process each result
            for (const result of results) {
              try {
                let content = result.text || 'No content available';
                
                // Summarize if content is substantial
                if (result.text && result.text.length > 200) {
                  const summaryResponse = await summaryAgent.generate([
                    {
                      role: 'user',
                      content: `Summarize the following content for company sizing research on "${brandName}":

Title: ${result.title || 'No title'}
URL: ${result.url}
Content: ${result.text.substring(0, 4000)}...

Focus on company size indicators: employee counts, revenue, funding, valuation, market cap, and growth metrics.`,
                    },
                  ]);
                  content = summaryResponse.text;
                }

                // Tag results with search type for analysis
                allResults.push({
                  title: result.title || '',
                  url: result.url,
                  content,
                  searchType: queryConfig.type,
                  targetDomains: queryConfig.domains || [],
                });
              } catch (processError) {
                console.error('Error processing result:', processError);
                // Add result without summarization as fallback
                allResults.push({
                  title: result.title || '',
                  url: result.url,
                  content: result.text ? result.text.substring(0, 1000) + '...' : 'Content unavailable',
                  searchType: queryConfig.type,
                  targetDomains: queryConfig.domains || [],
                });
              }
            }
          }
        } catch (searchError) {
          console.error(`Error in sizing search "${queryConfig.query}":`, searchError);
          continue;
        }
      }

      if (allResults.length === 0) {
        return {
          success: false,
          error: 'No sizing data found from any sources',
          sizingData: null,
        };
      }

      console.log(`Found ${allResults.length} sizing-related results, analyzing...`);

      // Combine all results for comprehensive analysis
      const combinedContent = allResults.map(result => 
        `Source: ${result.url} (Search: ${result.searchType})\nTitle: ${result.title}\nContent: ${result.content}\n---\n`
      ).join('\n');

      // Build context for the sizing agent
      const contextInfo = [];
      if (brandContext) contextInfo.push(`Company context: ${brandContext}`);
      if (industry) contextInfo.push(`Industry: ${industry}`);
      if (foundingYear) contextInfo.push(`Founded: ${foundingYear}`);
      if (officialDomain) contextInfo.push(`Official domain: ${officialDomain}`);

      const contextString = contextInfo.length > 0 ? `\n\nCompany Context:\n${contextInfo.join('\n')}\n` : '';

      // Analyze sizing data
      const response = await companySizingAgent.generate(
        [
          {
            role: 'user',
            content: `Analyze the following business intelligence data to determine the size classification for "${brandName}":${contextString}

Business Intelligence Data:
${combinedContent.substring(0, 8000)}...

Based on this data, determine the company size classification and provide detailed analysis in JSON format:
- companySize: one of "Startup", "Growth", "Mid-Market", "Large Enterprise", "Unicorn"
- confidence: "high", "medium", or "low" based on source quality and data consistency
- keyIndicators: object with specific metrics found (revenue, employees, valuation, fundingStage, marketCap, etc.)
- sources: array of source types found (e.g., ["LinkedIn", "Crunchbase", "News"])
- reasoning: detailed explanation of classification decision
- dataQuality: assessment of information reliability and recency
- conflictingInfo: any contradictory data points found`,
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

      // Add metadata about the search process
      const searchMetadata = {
        totalResults: allResults.length,
        searchTypes: [...new Set(allResults.map(r => r.searchType))],
        sourceUrls: allResults.map(r => r.url),
        targetedDomains: sizingQueries.flatMap(q => q.domains || []),
      };

      console.log('Company sizing analysis completed:', {
        brandName,
        size: sizingAnalysis.companySize,
        confidence: sizingAnalysis.confidence,
        sourcesFound: sizingAnalysis.sources.length,
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
): Array<{ query: string; type: string; domains?: string[] }> {
  const queries = [];
  const contextPart = brandContext || industry || '';

  // LinkedIn employee data
  queries.push({
    query: `"${brandName}" ${contextPart} employees headcount team size`,
    type: 'employee-data',
    domains: ['linkedin.com', 'glassdoor.com'],
  });

  // Funding and valuation data
  queries.push({
    query: `"${brandName}" ${contextPart} funding Series revenue valuation`,
    type: 'funding-data',
    domains: ['crunchbase.com', 'pitchbook.com', 'techcrunch.com'],
  });

  // Revenue and financial data
  queries.push({
    query: `"${brandName}" ${contextPart} revenue "annual revenue" "market cap"`,
    type: 'financial-data',
    domains: ['bloomberg.com', 'reuters.com', 'sec.gov'],
  });

  // Company scale indicators
  queries.push({
    query: `"${brandName}" ${contextPart} "company size" offices locations global`,
    type: 'scale-indicators',
  });

  // Industry-specific sizing
  if (industry) {
    queries.push({
      query: `"${brandName}" ${industry} market leader startup unicorn`,
      type: 'industry-position',
    });
  }

  // Public company data
  queries.push({
    query: `"${brandName}" IPO "went public" "stock ticker" NYSE NASDAQ`,
    type: 'public-status',
    domains: ['sec.gov', 'finance.yahoo.com', 'bloomberg.com'],
  });

  return queries;
}