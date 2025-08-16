import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import { researchWorkflow } from './workflows/researchWorkflow';
import { learningExtractionAgent } from './agents/learningExtractionAgent';
import { evaluationAgent } from './agents/evaluationAgent';
import { reportAgent } from './agents/reportAgent';
import { researchAgent } from './agents/researchAgent';
import { webSummarizationAgent } from './agents/webSummarizationAgent';
import { brandDiscoveryAgent } from './agents/brand_discovery_agent';
import { brandRelevancyAgent } from './agents/brand_relevancy_agent';
import { brandContentExtractionAgent } from './agents/brand_content_extraction_agent';
import { companySizingAgent } from './agents/company_sizing_agent';
import { brandAnalysisAgent } from './agents/brand_analysis_agent';
import { generateReportWorkflow } from './workflows/generateReportWorkflow';

export const mastra = new Mastra({
  storage: new LibSQLStore({
    url: 'file:../mastra.db',
  }),
  agents: {
    researchAgent,
    reportAgent,
    evaluationAgent,
    learningExtractionAgent,
    webSummarizationAgent,
    brandDiscoveryAgent,
    brandRelevancyAgent,
    brandContentExtractionAgent,
    companySizingAgent,
    brandAnalysisAgent,
  },
  workflows: { generateReportWorkflow, researchWorkflow },
});
