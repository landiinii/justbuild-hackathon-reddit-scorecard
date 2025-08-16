export interface Scorecard {
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
  threads: Thread[];
  sentiment: {
    brand: number;
    competitors: { [key: string]: number };
  };
  createdAt: string;
  status: "generating" | "completed" | "failed";
  generationProgress?: GenerationStep[];
}

export interface Thread {
  title: string;
  url: string;
  subreddit: string;
  score: number;
  comments: number;
  sentiment: "positive" | "negative" | "neutral";
  excerpt: string;
}

export interface GenerationStep {
  step: string;
  status: "pending" | "in-progress" | "completed" | "failed";
  message: string;
  timestamp: string;
}
