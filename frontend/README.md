# Reddit Scorecard Frontend

A beautiful, modern React frontend for the Reddit Scorecard application that displays AI-powered brand research and analysis results.

## Features

- **Beautiful Landing Page**: Modern design with hero section and feature highlights
- **Scorecard Generation**: Form-based input for brand research requests
- **Real-time Progress**: Live streaming display of AI agent activities
- **Comprehensive Results**: Detailed scorecard with sentiment analysis, competitor comparison, and Reddit insights
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Interactive UI**: Smooth animations and hover effects for enhanced user experience
- **Backend Integration**: Connects to Mastra AI backend for real brand analysis

## Tech Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for beautiful icons
- **Framer Motion** for animations

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- **Mastra Backend**: Must be running at `http://localhost:4111`

### Backend Setup

1. Navigate to the `deep-research` directory:
```bash
cd deep-research
```

2. Set up environment variables in `.env`:
```bash
OPENAI_API_KEY=your-openai-api-key
EXA_API_KEY=your-exa-api-key
```

3. Install dependencies and start the backend:
```bash
npm install
npm run dev
```

4. Verify the backend is running at `http://localhost:4111`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

### Testing the Connection

Before generating scorecards, the frontend will automatically test the connection to your Mastra backend:

1. **Connection Status**: Look for the connection indicator at the top of the Generate Scorecard page
2. **Test Connection**: Click the "Test Connection" button to manually verify connectivity
3. **Error Handling**: If disconnected, ensure your backend is running and accessible

## API Integration

The frontend connects to your Mastra backend at `http://localhost:4111` and provides:

- **Real-time Streaming**: Live updates from AI agents during analysis
- **Agent Integration**: Direct calls to `brandDiscoveryAgent` for brand research
- **Error Handling**: Graceful fallbacks when streaming isn't available
- **Progress Tracking**: Step-by-step updates during scorecard generation

### Available Endpoints

- `/api/agents/brandDiscoveryAgent/generate` - Generate brand analysis
- `/api/agents/brandDiscoveryAgent/stream` - Stream brand analysis progress
- `/api/agents` - List available agents
- `/api/workflows` - List available workflows

## Building for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Page components
│   ├── HomePage.tsx    # Landing page with scorecard list
│   ├── GenerateScorecardPage.tsx  # Scorecard generation form
│   └── ScorecardDetailPage.tsx    # Detailed scorecard view
├── services/           # API integration
│   └── api.ts         # Mastra backend API service
├── types/              # TypeScript type definitions
│   └── scorecard.ts    # Scorecard data structure
├── data/               # Sample data and mock data
│   └── dummyData.ts    # Dummy scorecards for development
├── App.tsx             # Main application component
└── index.tsx           # Application entry point
```

## Data Structure

The application uses a comprehensive scorecard data structure that includes:

- **Brand Information**: Name, website, company size
- **Competitor Analysis**: List of competitors with sentiment scores
- **Reddit Insights**: Subreddit mentions, thread analysis
- **Sentiment Analysis**: Brand vs competitor sentiment comparison
- **Mention Statistics**: Reddit mention counts and trends

## Styling

The application uses Tailwind CSS with custom component classes for consistent styling:

- `.btn-primary`: Primary action buttons
- `.btn-secondary`: Secondary action buttons  
- `.card`: Card containers
- `.input-field`: Form input fields

## Development

### Adding New Features

1. Create new components in the `components/` directory
2. Add new pages in the `pages/` directory
3. Update types in `types/` directory as needed
4. Add routing in `App.tsx`
5. Extend API service in `services/api.ts` for new backend features

### Styling Guidelines

- Use Tailwind CSS utility classes for styling
- Create custom component classes in `index.css` for repeated patterns
- Maintain consistent spacing using Tailwind's spacing scale
- Use the established color palette (primary blues, secondary grays)

### Backend Integration

- Test new API endpoints using the connection test feature
- Add proper error handling for API failures
- Use streaming when available for real-time updates
- Fall back to regular API calls when streaming isn't supported

## Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Ensure Mastra backend is running (`npm run dev` in `deep-research` directory)
   - Check that port 4111 is not blocked by firewall
   - Verify environment variables are set correctly

2. **API Calls Failing**
   - Check browser console for detailed error messages
   - Verify the backend has the required agents and tools
   - Ensure API keys are valid and have sufficient credits

3. **Streaming Not Working**
   - The frontend will automatically fall back to regular API calls
   - Check backend logs for streaming-related errors
   - Verify Mastra version supports streaming endpoints

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript for all new code
3. Maintain responsive design principles
4. Test on multiple screen sizes
5. Follow the established naming conventions
6. Test backend integration before submitting changes

## License

This project is part of the JustBuild Hackathon Reddit Scorecard application.
