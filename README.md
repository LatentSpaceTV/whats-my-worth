# What's My Worth

A web application to calculate the worth of your salary as a civil servant compared to the private sector in Germany.

## Features

- Calculate salary equivalence between civil servant and private sector positions
- Compare different salary structures and benefits
- Visualize salary breakdowns and differences
- Responsive design for all devices

## Tech Stack

- React 19
- TypeScript
- Tailwind CSS
- Vite
- Lucide React icons
- Recharts for data visualization

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm (v8 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/LatentSpaceTV/whats-my-worth.git
```

2. Navigate to the project directory:
```bash
cd whats-my-worth
```

3. Install dependencies:
```bash
npm install
```

### Development

To start the development server:
```bash
npm run dev
```

To build for production:
```bash
npm run build
```

To preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── App.tsx              # Main application component
├── lib/                 # Library files
│   └── calculator/      # Salary calculation logic
├── components/          # Reusable UI components
├── assets/              # Static assets
└── styles/              # Global styles
```

## Deployment

The application is designed to be deployed to a web server. For deployment to a subdirectory, set the `base` path in `vite.config.ts` to match your deployment path.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.