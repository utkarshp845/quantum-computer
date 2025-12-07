# Quantum Lens

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A quantum computing visualization and AI-powered reality computation engine. Create quantum nodes, apply gates, create entanglements, and let AI analyze your quantum reality.

## Features

- 🎯 **Quantum Node Creation** - Create nodes representing people, passions, interests, and dreams
- ⚛️ **Quantum Gates** - Apply H, X, Y, Z gates to manipulate quantum states
- 🔗 **Entanglements** - Create and visualize connections between nodes
- 🤖 **AI Analysis** - Get AI-powered insights about your quantum reality configuration
- 💰 **Cost-Effective** - Uses OpenRouter with free and low-cost AI models
- 🛡️ **Rate Limiting** - Built-in rate limiting and error handling
- ✅ **Fully Tested** - 44 unit and integration tests

## Quick Start

### Prerequisites

**Option 1: Local Development**
- Node.js (v18 or higher)
- npm or yarn

**Option 2: Docker (Recommended)**
- Docker and Docker Compose

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the root directory:
   ```
   VITE_OPENROUTER_API_KEY=your_api_key_here
   VITE_AI_MODEL=google/gemini-flash-1.5
   ```
   
   **Note:** You can also use `OPENROUTER_API_KEY` and `AI_MODEL` (without `VITE_` prefix) - both formats are supported.
   
   Get your API key: https://openrouter.ai/keys

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Docker Deployment

### Quick Start with Docker

1. **Set up environment variables:**
   Create a `.env.local` file:
   ```
   VITE_OPENROUTER_API_KEY=your_api_key_here
   VITE_AI_MODEL=google/gemini-flash-1.5
   ```
   
   **Note:** Both `VITE_OPENROUTER_API_KEY` and `OPENROUTER_API_KEY` formats work. The `VITE_` prefix is recommended.

2. **Development mode (with hot reload):**
   ```bash
   docker-compose up dev
   ```
   Access at `http://localhost:3000`

3. **Production mode:**
   ```bash
   docker-compose up prod
   ```
   Access at `http://localhost:8080`

### Docker Commands

```bash
# Build and run development container
docker-compose up dev

# Build and run production container
docker-compose up prod

# Run in background
docker-compose up -d prod

# View logs
docker-compose logs -f dev

# Stop containers
docker-compose down

# Rebuild after changes
docker-compose build --no-cache prod
```

### Manual Docker Build

**Development:**
```bash
docker build -f Dockerfile.dev -t quantum-lens:dev .
docker run -p 3000:3000 --env-file .env.local quantum-lens:dev
```

**Production:**
```bash
docker build -t quantum-lens:prod .
docker run -p 8080:80 --env-file .env.local quantum-lens:prod
```

### Docker Features

- ✅ **Multi-stage builds** for optimized production images
- ✅ **Hot reload** in development mode
- ✅ **Nginx** for production serving with SPA routing
- ✅ **Environment variable** support via `.env.local`
- ✅ **Health check** endpoint at `/health`
- ✅ **Gzip compression** and caching for performance

## Usage

### Creating Nodes

1. Click anywhere on the canvas to open the node creation modal
2. Enter a name (max 20 characters)
3. Select a type: person, passion, interest, or dream
4. Click "INITIALIZE" to create the node

### Quantum Operations

1. Click on a node to select it
2. Use the quantum gates (H, X, Y, Z) to manipulate the node's state:
   - **H (Hadamard)**: Creates superposition (50/50 probability)
   - **X**: Bit flip (NOT gate)
   - **Y**: Bit and phase flip
   - **Z**: Phase flip
3. Click "OBSERVE / COLLAPSE" to measure and collapse the quantum state

### Creating Entanglements

1. Click on a node to select it
2. Click on another node to create an entanglement link
3. Click on the link to adjust its strength (0.1 to 1.0)
4. Stronger entanglements appear brighter and more intense

### AI Analysis

1. Create at least 2 nodes and optionally link them
2. Click "COMPUTE REALITY" to get AI-powered analysis
3. The AI will analyze your quantum configuration and provide insights

## AI Models & Cost Optimization

### Why OpenRouter?

OpenRouter provides:
- **Cost Efficiency**: Access to free and low-cost models
- **Flexibility**: Switch between 100+ models without code changes
- **Unified API**: OpenAI-compatible, easy integration
- **Transparent Pricing**: Pay only for what you use

### Recommended Models

| Model | Cost | Best For |
|-------|------|----------|
| `google/gemini-flash-1.5` | ~$0.075/1M tokens | **Default** - Fast & cheap |
| `google/gemini-flash-1.5` | ~$0.075/1M tokens | Production, fast responses |
| `anthropic/claude-3-haiku` | ~$0.25/1M tokens | High quality, balanced |
| `meta-llama/llama-3.1-70b-instruct` | ~$0.59/1M tokens | Premium quality |

**Cost Comparison** (per ~500 token request):
- Llama 3.1 8B (Free): **$0.00**
- Gemini Flash: ~$0.00004
- Claude Haiku: ~$0.00013
- Google Gemini API: ~$0.00015

View all models: https://openrouter.ai/models

### Alternative Providers

- **Groq**: Fastest & very cheap (~$0.10/1M tokens)
- **Together AI**: Open-source focus, competitive pricing
- **Hugging Face**: Free tier available
- **Ollama**: Free, runs locally

## Rate Limiting

The application includes built-in rate limiting to prevent API abuse:

- **Minimum time between calls**: 1 second
- **Maximum calls per minute**: 20
- **First call exception**: New users can make their first call immediately
- **Cooldown timer**: Automatically displayed when rate limit is reached
- **Error handling**: Automatic retry with exponential backoff

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Coverage

**44 tests passing** across 4 test suites:

- ✅ **Quantum Engine** (25 tests): Complex numbers, gates, probabilities, measurements
- ✅ **Rate Limiting** (6 tests): Time windows, call limits, cooldowns
- ✅ **Error Handling** (8 tests): API errors, retries, timeouts
- ✅ **Integration** (5 tests): End-to-end workflows, state transitions

### Manual Testing Checklist

- [ ] Node creation works correctly
- [ ] Quantum gates update node states
- [ ] Entanglements can be created and adjusted
- [ ] AI integration responds correctly
- [ ] Rate limiting prevents rapid calls
- [ ] Error messages display properly
- [ ] UI is responsive and accessible

## Project Structure

```
quantum-computer/
├── index.html          # Main HTML file
├── index.tsx           # React application
├── types.ts            # TypeScript type definitions
├── utils/
│   └── quantumEngine.ts  # Quantum computing logic
├── tests/              # Test files
│   ├── quantumEngine.test.ts
│   ├── rateLimiting.test.ts
│   ├── errorHandling.test.ts
│   └── integration.test.ts
├── vite.config.ts      # Vite configuration
├── vitest.config.ts    # Vitest configuration
└── package.json        # Dependencies and scripts
```

## Documentation

- **AWS_DEPLOYMENT.md** - Complete AWS deployment guide (S3, CloudFront, Route 53, ACM)
- **RELIABILITY_PLAN.md** - Reliability and scalability plan for 10+ users
- **RELIABILITY_SUMMARY.md** - Summary of reliability features implemented
- **MONITORING_SETUP.md** - Step-by-step guide for setting up Sentry, GA4, and CloudWatch

## Troubleshooting

### Port Already in Use
Change the port in `vite.config.ts` or kill the process using port 3000:
```bash
lsof -ti:3000 | xargs kill
```

### API Key Issues
- Ensure `.env.local` contains `VITE_OPENROUTER_API_KEY=your_key` (or `OPENROUTER_API_KEY=your_key`)
- Get your key from https://openrouter.ai/keys
- Free model requires an API key but no credits
- **For Docker:** Make sure `.env.local` exists and contains the API key before running `docker-compose up`

### Module Not Found Errors
```bash
npm install
```

### AI Not Responding
- Check browser console for error messages
- Verify API key is correct
- Free model may have rate limits
- Check network connectivity

### Black Screen
- Ensure the script tag is present in `index.html`
- Check browser console for JavaScript errors
- Verify React is loading correctly

## Development

### Using WSL (Windows Subsystem for Linux)

1. **Install Node.js in WSL:**
   ```bash
   sudo apt update
   sudo apt install nodejs npm -y
   ```

2. **Navigate to project directory:**
   ```bash
   cd /mnt/c/path/to/your/project
   ```

3. **Follow normal setup steps**

4. **Access from Windows:**
   The app will be accessible at `http://localhost:3000` from your Windows browser

### Build for Production

```bash
npm run build
npm run preview
```

## AWS Deployment

The application is deployed to AWS using S3, CloudFront, Route 53, and ACM.

**Live Site:** https://quantumlens.pandeylabs.com

### Quick Deploy

```bash
npm run deploy
```

This will:
1. Build your application
2. Upload to S3
3. Invalidate CloudFront cache

### Verify Deployment

```bash
npm run verify
npm run test:deploy
```

### Full Deployment Guide

See [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md) for complete setup instructions including:
- S3 bucket configuration
- CloudFront distribution setup
- SSL certificate (ACM) configuration
- Route 53 DNS setup
- Troubleshooting guide

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request

## License

This project is part of the Quantum Lens AI Studio collection.

## Support

- View in AI Studio: https://ai.studio/apps/drive/1yXwfMSge5cKryvn-93kkYuzQrVDG384R
- OpenRouter Dashboard: https://openrouter.ai/activity
- Report Issues: Create an issue in the repository

---

**Built with React, TypeScript, Vite, and OpenRouter AI**
