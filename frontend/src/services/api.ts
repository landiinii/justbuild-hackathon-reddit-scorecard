import { Scorecard, GenerationStep } from "../types/scorecard";

const API_BASE_URL = "http://localhost:4111";

export interface BrandAnalysisRequest {
  brandName: string;
  brandContext?: string;
  brandUrl?: string;
  additionalIdentifiers?: {
    industry?: string;
    location?: string;
    products?: string[];
  };
}

export interface BrandAnalysisResponse {
  success: boolean;
  data?: {
    // New scorecard format
    id?: string;
    brandName?: string;
    brandWebsite?: string;
    companySize?: string;
    competitors?: string[];
    subreddits?: string[];
    mentions?: {
      brand: number;
      competitors: { [key: string]: number };
    };
    threads?: Array<{
      title: string;
      url: string;
      subreddit: string;
      score: number;
      comments: number;
      sentiment: "positive" | "negative" | "neutral";
      excerpt: string;
    }>;
    sentiment?: {
      brand: number;
      competitors: { [key: string]: number };
    };
    createdAt?: string;
    status?: string;
    // Old format (fallback)
    brandData?: {
      description: string;
      topics: string[];
      categories: string[];
      additionalContext: any;
    };
    sizingData?: {
      companySize: string;
      confidence: string;
      keyIndicators: any;
      sources: any[];
      reasoning: string;
    };
    searchMetadata?: {
      confidence: number;
      sources: Array<{
        url: string;
        confidenceScore: number;
      }>;
      disambiguation: string;
    };
  };
  error?: string;
}

export interface WorkflowRun {
  id: string;
  status: "running" | "completed" | "failed";
  output?: any;
  error?: string;
}

export class ApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      console.log(`Making API request to: ${url}`);
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      console.log(`Response status: ${response.status}`);
      console.log(
        `Response headers:`,
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
        throw new Error(`HTTP error! status: ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      } else {
        const text = await response.text();
        return { text } as T;
      }
    } catch (error) {
      console.error(`Request failed for ${url}:`, error);
      throw error;
    }
  }

  // Test backend connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      if (response.ok) {
        return { success: true, message: "Backend is running" };
      } else {
        return {
          success: false,
          message: `Backend responded with status: ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  // Get available agents
  async getAgents(): Promise<any[]> {
    try {
      const response = await this.makeRequest<any>("/api/agents");
      return response.agents || [];
    } catch (error) {
      console.warn("Could not fetch agents:", error);
      return [];
    }
  }

  // Get available workflows
  async getWorkflows(): Promise<any[]> {
    try {
      const response = await this.makeRequest<any>("/api/workflows");
      return response.workflows || [];
    } catch (error) {
      console.warn("Could not fetch workflows:", error);
      return [];
    }
  }

  // Call the brandAnalysisAgent directly
  async callBrandAnalysisAgent(
    request: BrandAnalysisRequest
  ): Promise<BrandAnalysisResponse> {
    const endpoint = "/api/agents/brandAnalysisAgent/generate";

    try {
      const response = await this.makeRequest<any>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Analyze the brand "${request.brandName}" ${
                request.brandContext ? `(${request.brandContext})` : ""
              }. 
              ${request.brandUrl ? `Known URL: ${request.brandUrl}` : ""}
              ${
                request.additionalIdentifiers?.industry
                  ? `Industry: ${request.additionalIdentifiers.industry}`
                  : ""
              }
              ${
                request.additionalIdentifiers?.location
                  ? `Location: ${request.additionalIdentifiers.location}`
                  : ""
              }
              ${
                request.additionalIdentifiers?.products?.length
                  ? `Products: ${request.additionalIdentifiers.products.join(
                      ", "
                    )}`
                  : ""
              }
              
              Follow the exact process: Brand Search & Discovery → Relevancy Evaluation → Content Extraction → Company Sizing.
              Return findings in the specified JSON format.`,
            },
          ],
          maxSteps: 20,
          experimental_output: {
            type: "object",
            properties: {
              id: { type: "string" },
              brandName: { type: "string" },
              brandWebsite: { type: "string" },
              companySize: { type: "string" },
              competitors: { type: "array", items: { type: "string" } },
              subreddits: { type: "array", items: { type: "string" } },
              mentions: {
                type: "object",
                properties: {
                  brand: { type: "number" },
                  competitors: { type: "object" },
                },
              },
              threads: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    url: { type: "string" },
                    subreddit: { type: "string" },
                    score: { type: "number" },
                    comments: { type: "number" },
                    sentiment: {
                      type: "string",
                      enum: ["positive", "negative", "neutral"],
                    },
                    excerpt: { type: "string" },
                  },
                },
              },
              sentiment: {
                type: "object",
                properties: {
                  brand: { type: "number" },
                  competitors: { type: "object" },
                },
              },
              createdAt: { type: "string" },
              status: { type: "string" },
            },
            required: [
              "id",
              "brandName",
              "brandWebsite",
              "companySize",
              "competitors",
              "subreddits",
              "mentions",
              "threads",
              "sentiment",
              "createdAt",
              "status",
            ],
          },
        }),
      });

      // Handle different response formats
      if (response.choices && response.choices[0]?.message?.content) {
        try {
          const content = response.choices[0].message.content;
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[1]);
            return { success: true, data: parsed };
          } else {
            // Try to parse the entire content as JSON
            const parsed = JSON.parse(content);
            return { success: true, data: parsed };
          }
        } catch (parseError) {
          console.warn("Could not parse JSON response:", parseError);
          // Return as text response
          return {
            success: true,
            data: {
              brandData: {
                description: response.text,
                topics: [],
                categories: [],
                additionalContext: {},
              },
              sizingData: {
                companySize: "Unknown",
                confidence: "low",
                keyIndicators: {},
                sources: [],
                reasoning: "Text response",
              },
              searchMetadata: {
                confidence: 50,
                sources: [],
                disambiguation: "Text response",
              },
            },
          };
        }
      } else if (response.object) {
        return { success: true, data: response.object };
      } else {
        return { success: true, data: response };
      }
    } catch (error) {
      console.error("Brand analysis agent call failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Stream the brand analysis agent for real-time progress
  async streamBrandAnalysisAgent(
    request: BrandAnalysisRequest
  ): Promise<ReadableStream<Uint8Array> | null> {
    try {
      console.log("Attempting to stream from brand analysis agent...");
      const response = await fetch(
        `${API_BASE_URL}/api/agents/brandAnalysisAgent/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Analyze the brand "${request.brandName}" ${
                  request.brandContext ? `(${request.brandContext})` : ""
                }. 
                ${request.brandUrl ? `Known URL: ${request.brandUrl}` : ""}
                ${
                  request.additionalIdentifiers?.industry
                    ? `Industry: ${request.additionalIdentifiers.industry}`
                    : ""
                }
                ${
                  request.additionalIdentifiers?.location
                    ? `Location: ${request.additionalIdentifiers.location}`
                    : ""
                }
                ${
                  request.additionalIdentifiers?.products?.length
                    ? `Products: ${request.additionalIdentifiers.products.join(
                        ", "
                      )}`
                    : ""
                }
                
                Follow the exact process: Brand Search & Discovery → Relevancy Evaluation → Content Extraction → Company Sizing.
                Provide step-by-step updates as you work through each phase.`,
              },
            ],
            maxSteps: 20,
          }),
        }
      );

      console.log(`Stream response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Stream request failed: ${response.status} - ${errorText}`
        );
        return null;
      }

      if (response.body) {
        console.log("Stream response body available");
        return response.body;
      } else {
        console.log("No stream response body");
        return null;
      }
    } catch (error) {
      console.error(`Stream request failed:`, error);
      return null;
    }
  }

  // Convert brand analysis response to scorecard format
  convertToScorecard(
    brandName: string,
    analysis: BrandAnalysisResponse,
    runId: string
  ): Partial<Scorecard> {
    if (!analysis.success || !analysis.data) {
      throw new Error(analysis.error || "Analysis failed");
    }

    // If the analysis returns a complete scorecard object, use it directly
    if (analysis.data.id && analysis.data.brandName === brandName) {
      return {
        brandWebsite: analysis.data.brandWebsite || "",
        companySize: analysis.data.companySize || "Unknown",
        competitors: analysis.data.competitors || [],
        subreddits: analysis.data.subreddits || [],
        mentions: analysis.data.mentions || { brand: 0, competitors: {} },
        threads: analysis.data.threads || [],
        sentiment: analysis.data.sentiment || { brand: 0, competitors: {} },
        status: "completed" as const,
        generationProgress: [
          {
            step: "Brand Analysis Complete",
            status: "completed",
            message: `Successfully analyzed ${brandName} with comprehensive Reddit data`,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    // Fallback to old format if needed
    if (
      analysis.data.brandData &&
      analysis.data.sizingData &&
      analysis.data.searchMetadata
    ) {
      const { brandData, sizingData, searchMetadata } = analysis.data;

      return {
        brandWebsite:
          searchMetadata.sources.find((s) => s.confidenceScore >= 70)?.url ||
          "",
        companySize: sizingData.companySize,
        competitors: [], // Would need competitor analysis agent
        subreddits: [], // Would need Reddit analysis agent
        mentions: { brand: 0, competitors: {} }, // Would need Reddit analysis agent
        threads: [], // Would need Reddit analysis agent
        sentiment: { brand: 0, competitors: {} }, // Would need Reddit analysis agent
        status: "completed" as const,
        generationProgress: [
          {
            step: "Brand Discovery",
            status: "completed",
            message: `Successfully analyzed ${brandName}`,
            timestamp: new Date().toISOString(),
          },
          {
            step: "Company Sizing",
            status: "completed",
            message: `Classified as ${sizingData.companySize} (${sizingData.confidence} confidence)`,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    }

    // If no valid data structure found, return minimal scorecard
    return {
      brandWebsite: "",
      companySize: "Unknown",
      competitors: [],
      subreddits: [],
      mentions: { brand: 0, competitors: {} },
      threads: [],
      sentiment: { brand: 0, competitors: {} },
      status: "completed" as const,
      generationProgress: [
        {
          step: "Analysis Complete",
          status: "completed",
          message: `Analysis completed for ${brandName}`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }
}

export const apiService = new ApiService();
export default apiService;
