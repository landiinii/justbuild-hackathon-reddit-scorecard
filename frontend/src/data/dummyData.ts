import { Scorecard } from "../types/scorecard";

export const dummyScorecards: Scorecard[] = [
  {
    id: "1",
    brandName: "Tesla",
    brandWebsite: "https://tesla.com",
    companySize: "Large (50,000+ employees)",
    competitors: ["Ford", "GM", "Toyota", "Volkswagen"],
    subreddits: [
      "r/teslamotors",
      "r/electricvehicles",
      "r/cars",
      "r/investing",
    ],
    mentions: {
      brand: 1250,
      competitors: {
        Ford: 890,
        GM: 756,
        Toyota: 1120,
        Volkswagen: 634,
      },
    },
    threads: [
      {
        title: "Tesla Model 3 Performance Review - Still the King?",
        url: "https://reddit.com/r/teslamotors/comments/example1",
        subreddit: "r/teslamotors",
        score: 1247,
        comments: 89,
        sentiment: "positive",
        excerpt:
          "After 6 months with my Model 3 Performance, I can confidently say it's still the best EV in its class...",
      },
      {
        title: "Tesla Service Experience - Mixed Feelings",
        url: "https://reddit.com/r/teslamotors/comments/example2",
        subreddit: "r/teslamotors",
        score: 892,
        comments: 156,
        sentiment: "neutral",
        excerpt:
          "Had my first service appointment today. The technician was great but the wait time was longer than expected...",
      },
    ],
    sentiment: {
      brand: 7.2,
      competitors: {
        Ford: 6.8,
        GM: 6.5,
        Toyota: 7.0,
        Volkswagen: 6.2,
      },
    },
    createdAt: "2024-01-15T10:30:00Z",
    status: "completed",
  },
  {
    id: "2",
    brandName: "Starbucks",
    brandWebsite: "https://starbucks.com",
    companySize: "Large (350,000+ employees)",
    competitors: ["Dunkin", "Peet's Coffee", "Caribou Coffee", "Local Cafes"],
    subreddits: ["r/starbucks", "r/coffee", "r/food", "r/antiwork"],
    mentions: {
      brand: 2100,
      competitors: {
        Dunkin: 1450,
        "Peet's Coffee": 320,
        "Caribou Coffee": 180,
        "Local Cafes": 890,
      },
    },
    threads: [
      {
        title: "Starbucks Unionization Efforts - What's Next?",
        url: "https://reddit.com/r/starbucks/comments/example3",
        subreddit: "r/starbucks",
        score: 2156,
        comments: 423,
        sentiment: "positive",
        excerpt:
          "Great to see more stores joining the union movement. Workers deserve better pay and conditions...",
      },
      {
        title: "Starbucks vs Local Coffee Shops - Price Comparison",
        url: "https://reddit.com/r/coffee/comments/example4",
        subreddit: "r/coffee",
        score: 1342,
        comments: 267,
        sentiment: "negative",
        excerpt:
          "I used to love Starbucks but the prices are getting ridiculous. My local shop charges half as much...",
      },
    ],
    sentiment: {
      brand: 6.8,
      competitors: {
        Dunkin: 6.5,
        "Peet's Coffee": 7.1,
        "Caribou Coffee": 7.3,
        "Local Cafes": 7.8,
      },
    },
    createdAt: "2024-01-10T14:20:00Z",
    status: "completed",
  },
  {
    id: "3",
    brandName: "Nike",
    brandWebsite: "https://nike.com",
    companySize: "Large (75,000+ employees)",
    competitors: ["Adidas", "Under Armour", "Puma", "New Balance"],
    subreddits: ["r/nike", "r/sneakers", "r/running", "r/fitness"],
    mentions: {
      brand: 1800,
      competitors: {
        Adidas: 1650,
        "Under Armour": 890,
        Puma: 720,
        "New Balance": 980,
      },
    },
    threads: [
      {
        title: "Nike Air Max 270 Review - Comfort vs Style",
        url: "https://reddit.com/r/sneakers/comments/example5",
        subreddit: "r/sneakers",
        score: 1890,
        comments: 234,
        sentiment: "positive",
        excerpt:
          "Just got my Air Max 270s and they're incredibly comfortable. Perfect for both casual wear and light workouts...",
      },
      {
        title: "Nike Sustainability Claims - Greenwashing or Genuine?",
        url: "https://reddit.com/r/fitness/comments/example6",
        subreddit: "r/fitness",
        score: 1120,
        comments: 189,
        sentiment: "neutral",
        excerpt:
          "I appreciate Nike's efforts but I'm skeptical about some of their sustainability claims. What do you think?",
      },
    ],
    sentiment: {
      brand: 7.5,
      competitors: {
        Adidas: 7.2,
        "Under Armour": 6.8,
        Puma: 7.0,
        "New Balance": 7.6,
      },
    },
    createdAt: "2024-01-08T09:15:00Z",
    status: "completed",
  },
];
