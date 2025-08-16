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
    brandData: {
      description: string;
      topics: string[];
      categories: string[];
      additionalContext: Record<string, any>;
    };
    sizingData: {
      companySize: string;
      confidence: string;
      keyIndicators: Record<string, any>;
      sources: string[];
      reasoning: string;
    };
    searchMetadata: {
      confidence: number;
      sources: Array<{ url: string; confidenceScore: number }>;
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

class ApiService {
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

      const data = await response.json();
      console.log(`Response data:`, data);
      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Test the connection to the backend
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
      return { success: false, message: `Cannot connect to backend: ${error}` };
    }
  }

  // Get available agents
  async getAgents(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents`);
      if (response.ok) {
        const data = await response.json();
        return data.agents || [];
      }
      return [];
    } catch (error) {
      console.warn("Could not fetch agents:", error);
      return [];
    }
  }

  // Get available workflows
  async getWorkflows(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/workflows`);
      if (response.ok) {
        const data = await response.json();
        return data.workflows || [];
      }
      return [];
    } catch (error) {
      console.warn("Could not fetch workflows:", error);
      return [];
    }
  }

  // Call the brandDiscoveryAgent directly
  async callBrandDiscoveryAgent(
    request: BrandAnalysisRequest
  ): Promise<BrandAnalysisResponse> {
    const endpoint = "/api/agents/brandDiscoveryAgent/generate";

    try {
      const response = await this.makeRequest<any>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Research the brand "${request.brandName}" ${
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
        }),
      });

      // Handle different response formats
      if (response.text) {
        // Try to parse the text response
        try {
          const parsed = JSON.parse(response.text);
          return { success: true, data: parsed };
        } catch {
          // If it's not JSON, treat as success with text data
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
      console.error("Brand discovery agent call failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Stream the brand discovery agent for real-time progress
  async streamBrandDiscoveryAgent(
    request: BrandAnalysisRequest
  ): Promise<ReadableStream<Uint8Array> | null> {
    try {
      console.log("Attempting to stream from brand discovery agent...");
      const response = await fetch(
        `${API_BASE_URL}/api/agents/brandDiscoveryAgent/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Research the brand "${request.brandName}" ${
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

    const { brandData, sizingData, searchMetadata } = analysis.data;

    return {
      brandWebsite:
        searchMetadata.sources.find((s) => s.confidenceScore >= 70)?.url || "",
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
}

export const apiService = new ApiService();
export default apiService;
