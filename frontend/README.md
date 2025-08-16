# Reddit Scorecard Frontend

A beautiful, modern React frontend for the Reddit Scorecard application that displays AI-powered brand research and analysis results.

## Features

- **Beautiful Landing Page**: Modern design with hero section and feature highlights
- **Scorecard Generation**: Form-based input for brand research requests
- **Real-time Progress**: Live streaming display of AI agent activities
- **Comprehensive Results**: Detailed scorecard with sentiment analysis, competitor comparison, and Reddit insights
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Interactive UI**: Smooth animations and hover effects for enhanced user experience

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

### Installation

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

### Building for Production

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

## API Integration

The frontend is configured to work with the backend API at `http://localhost:4111`. The proxy configuration in `package.json` handles CORS during development.

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

### Styling Guidelines

- Use Tailwind CSS utility classes for styling
- Create custom component classes in `index.css` for repeated patterns
- Maintain consistent spacing using Tailwind's spacing scale
- Use the established color palette (primary blues, secondary grays)

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

## License

This project is part of the JustBuild Hackathon Reddit Scorecard application.
