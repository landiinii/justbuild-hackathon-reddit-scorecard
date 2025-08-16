import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import Exa from "exa-js";
import "dotenv/config";

const exa = new Exa(process.env.EXA_API_KEY);

export const redditSearchTool = createTool({
  id: "reddit-search",
  description:
    "Search Reddit for brand mentions, discussions, and competitor analysis using Exa API",
  inputSchema: z.object({
    brandName: z.string().describe("The brand name to search for on Reddit"),
    brandContext: z
      .string()
      .optional()
      .describe(
        'Context about the brand (e.g., "technology company", "airline")'
      ),
    subreddits: z
      .array(z.string())
      .optional()
      .describe(
        "Specific subreddits to focus on. Should just be the subreddit name, not the full URL. Do not include the r/ prefix."
      ),
    maxResults: z
      .number()
      .default(10)
      .describe("Maximum number of results to return"),
    searchDepth: z
      .enum(["shallow", "deep"])
      .default("shallow")
      .describe(
        "Search depth - shallow for quick results, deep for comprehensive analysis"
      ),
  }),
  execute: async ({ context, mastra }) => {
    console.log("Executing Reddit search tool");
    const { brandName, brandContext, subreddits, maxResults, searchDepth } =
      context;

    try {
      if (!process.env.EXA_API_KEY) {
        console.error("Error: EXA_API_KEY not found in environment variables");
        return { results: [], error: "Missing API key" };
      }

      const queries = constructRedditQueries(
        brandName,
        brandContext,
        subreddits
      );
      console.log(`Constructed Reddit search queries:`, queries);

      let allResults = [];
      const targetResults =
        searchDepth === "deep" ? maxResults * 2 : maxResults;

      for (const query of queries) {
        try {
          console.log(`Searching Reddit for: "${query.text}"`);

          // Use Exa's includeDomains to restrict to Reddit
          const searchOptions: any = {
            includeDomains: ["reddit.com"],
            livecrawl: "never",
            numResults: Math.min(10, targetResults),
            type: "fast",
          };
          console.log(`Search options:`, searchOptions);
          const response = await exa.searchAndContents(
            query.text,
            searchOptions
          );
          console.log(`Exa API response:`, response);

          // Validate Exa API response
          if (!response || typeof response !== "object") {
            console.warn(
              `Invalid response from Exa API for query "${query.text}"`
            );
            continue;
          }

          const { results } = response;

          if (!Array.isArray(results)) {
            console.warn(
              `Results is not an array for query "${query.text}":`,
              typeof results
            );
            continue;
          }

          if (results.length > 0) {
            // Filter results to ensure they're from Reddit and match our criteria
            const filteredResults = results.filter((result) => {
              if (!result || typeof result !== "object") return false;
              if (!result.url || typeof result.url !== "string") return false;

              return (
                result.url.includes("reddit.com") && result.url.includes("/r/")
              ); // Ensure it's a subreddit post
            });

            allResults.push(...filteredResults);
            console.log(
              `Query "${query.text}" returned ${filteredResults.length} valid Reddit results`
            );

            if (allResults.length >= targetResults) break;
          } else {
            console.log(`Query "${query.text}" returned no results`);
          }
        } catch (searchError) {
          console.error(
            `Error with Reddit query "${query.text}":`,
            searchError
          );
          continue;
        }
      }

      if (allResults.length === 0) {
        console.log("No Reddit results found for any query");
        return {
          results: [],
          threads: [],
          subreddits: [],
          mentions: [],
          error: "No Reddit results found",
        };
      }

      console.log(`Found ${allResults.length} Reddit results, processing...`);

      const processedResults = await processRedditResults(
        allResults,
        brandName,
        brandContext,
        mastra
      );

      return {
        results: processedResults.slice(0, maxResults),
        threads: extractThreads(processedResults),
        subreddits: extractSubreddits(processedResults),
        mentions: extractMentions(processedResults, brandName),
        searchQueries: queries.map((q) => q.text),
      };
    } catch (error) {
      console.error("Error in Reddit search:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        results: [],
        threads: [],
        mentions: [],
        subreddits: [],
        error: errorMessage,
      };
    }
  },
});

function constructRedditQueries(
  brandName: string,
  brandContext?: string,
  subreddits?: string[]
): Array<{ text: string; type: string; domains?: string[] }> {
  const queries: Array<{ text: string; type: string; domains?: string[] }> = [];
  const contextPart = brandContext ? ` ${brandContext}` : "";

  // Primary brand searches - general Reddit search
  queries.push({
    text: `"${brandName}"${contextPart}`,
    type: "brand-mention",
    domains: ["reddit.com"],
  });

  queries.push({
    text: `${brandName}${contextPart} review experience`,
    type: "review-discussion",
    domains: ["reddit.com"],
  });

  queries.push({
    text: `${brandName}${contextPart} vs alternative competitor`,
    type: "comparison",
    domains: ["reddit.com"],
  });

  // General discussion searches
  queries.push({
    text: `"${brandName}" best worst opinion discussion`,
    type: "opinion-discussion",
    domains: ["reddit.com"],
  });

  queries.push({
    text: `${brandName} ${contextPart} reddit community feedback`,
    type: "community-feedback",
    domains: ["reddit.com"],
  });

  // Subreddit-specific searches if provided
  if (subreddits && subreddits.length > 0) {
    for (const subreddit of subreddits.slice(0, 3)) {
      // Limit to top 3 subreddits
      const cleanSubreddit = subreddit.replace(/^r\//, "");

      // Search within specific subreddit
      queries.push({
        text: `"${brandName}"${contextPart}`,
        type: "subreddit-specific",
        domains: [`reddit.com/r/${cleanSubreddit}`],
      });

      // Search for brand discussions in the subreddit
      queries.push({
        text: `${brandName} ${contextPart} discussion`,
        type: "subreddit-discussion",
        domains: [`reddit.com/r/${cleanSubreddit}`],
      });
    }
  }

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
      // Ensure it's a Reddit result
      if (!result.url?.includes("reddit.com") || !result.url?.includes("/r/")) {
        continue;
      }

      // Skip if content is too short
      if (!result.text || result.text.length < 50) {
        processedResults.push({
          title: result.title || "",
          url: result.url,
          content: result.text || "No content available",
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
          const summaryAgent = mastra.getAgent("webSummarizationAgent");
          const summaryResponse = await summaryAgent.generate([
            {
              role: "user",
              content: `Summarize this Reddit discussion about "${brandName}" ${brandContext ? `(${brandContext})` : ""}:

Title: ${result.title || "No title"}
Subreddit: ${subreddit}
Content: ${result.text.substring(0, 3000)}...

Focus on opinions, experiences, and any mentions of competitors or alternatives.`,
            },
          ]);
          processedContent = summaryResponse.text;
        } catch (summaryError) {
          console.error("Error summarizing Reddit content:", summaryError);
          processedContent = result.text.substring(0, 500) + "...";
        }
      }

      const relevanceScore = calculateRedditRelevance(result, brandName);

      processedResults.push({
        title: result.title || "",
        url: result.url,
        content: processedContent,
        subreddit,
        score: redditMetadata.score,
        comments: redditMetadata.comments,
        relevanceScore,
      });

      console.log(
        `Processed Reddit result: ${result.title || result.url} (relevance: ${relevanceScore})`
      );
    } catch (error) {
      console.error("Error processing Reddit result:", error);
    }
  }

  return processedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function extractSubredditFromUrl(url: string): string {
  const match = url.match(/reddit\.com\/r\/([^\/]+)/);
  return match ? `r/${match[1]}` : "unknown";
}

function extractRedditMetadata(content: string): {
  score: number;
  comments: number;
} {
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
  const url = result.url?.toLowerCase() || "";
  const title = result.title?.toLowerCase() || "";
  const content = result.text?.toLowerCase() || "";
  const brandLower = brandName.toLowerCase();

  // Brand name mentions
  const brandMentions = (content.match(new RegExp(brandLower, "gi")) || [])
    .length;
  score += Math.min(brandMentions * 10, 50);

  // Title relevance
  if (title.includes(brandLower)) {
    score += 30;
  }

  // Discussion indicators
  if (
    content.includes("review") ||
    content.includes("experience") ||
    content.includes("opinion")
  ) {
    score += 15;
  }

  // Comparison indicators
  if (
    content.includes("vs") ||
    content.includes("compare") ||
    content.includes("alternative")
  ) {
    score += 20;
  }

  // High engagement indicators
  if (
    content.includes("upvote") ||
    content.includes("popular") ||
    content.includes("trending")
  ) {
    score += 10;
  }

  return Math.min(100, score);
}

function extractThreads(results: any[]): any[] {
  return results.slice(0, 5).map((result) => ({
    title: result.title,
    url: result.url,
    subreddit: result.subreddit,
    score: result.score,
    comments: result.comments,
    sentiment: "neutral" as const, // Will be determined by sentiment analysis tool
    excerpt: result.content.substring(0, 200) + "...",
  }));
}

function extractSubreddits(results: any[]): string[] {
  const subreddits = new Set<string>();
  results.forEach((result) => {
    if (result.subreddit && result.subreddit !== "unknown") {
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
    const mentionCount = (content.match(new RegExp(brandLower, "gi")) || [])
      .length;

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

  if (index === -1) return "";

  const start = Math.max(0, index - 100);
  const end = Math.min(content.length, index + brandName.length + 100);

  return content.substring(start, end);
}
