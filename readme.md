# Just Build AI Agents Hackathon: Reddit Scorecard

This is the brainchild of Landen Bailey and Jeremy Mumford.

We wanted to see if we could create an AI agent that could analyze a brand's presence on Reddit and provide a scorecard of the brand's performance.

## How to run locally

First, navigate to the `deep-research` directory.

Add your OpenAI API key and Exa API key to your `.env` file in the `deep-research` directory.

```
OPENAI_API_KEY=your-openai-api-key
EXA_API_KEY=your-exa-api-key
```

Make sure to sync the env file into your current shell:

```
source .env
```

Run:

```
npm install
```

Then, run:

```
npm run dev
```

You should see your terminal provide with a link to the playground at:

```
http://localhost:4111
```