# ClearSignKit - Visual ERC-7730 Builder

**AI-powered web interface for creating and publishing ERC-7730 clear signing schemas**

This project provides a user-friendly web interface for building ERC-7730 JSON schemas with automated AI generation and decentralized publishing to The Graph's Knowledge Graph. Forked from Ledger's official builder tool with significant enhancements.

## 🚀 Key Features

### AI-Powered Schema Generation

- **Automatic Mode**: Toggle AI generation to automatically create schemas from contract addresses
- **Smart Analysis**: Integrates with our python-erc7730 AI engine for intelligent schema creation
- **Real-time Validation**: Automatic validation of AI-generated schemas against ERC-7730 standard
- **Multi-chain Support**: Built-in support for Ethereum, Polygon, Arbitrum, and other popular networks

### Visual Builder Interface

- **Interactive Editor**: Visual interface for creating and editing ERC-7730 schemas
- **Device Preview**: Real-time preview of how transactions will appear on Ledger devices
- **Field Management**: Easy-to-use forms for configuring display fields and parameters
- **Schema Validation**: Built-in validation to ensure compliance with ERC-7730 standard

### Knowledge Graph Integration

- **Decentralized Publishing**: Publish schemas to The Graph's GRC-20 Knowledge Graph
- **Public Repository**: Create an open repository of verified clear signing schemas
- **Cross-chain Discovery**: Allow wallets and dApps to discover schemas across multiple networks
- **Community Collaboration**: Enable community contributions and improvements to schemas

## 🔧 Installation & Setup

```bash
# Clone the repository
git clone https://github.com/0xAkuti/clear-signing-erc7730-builder.git
cd clear-signing-erc7730-builder

# Install dependencies
npm install

# Install Python dependencies
pip3 install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

## 🌐 Environment Configuration

Create a `.env` file with the following variables:

```env
# AI Configuration (for automatic schema generation)
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional
OPENAI_MODEL=gpt-4o-mini  # Optional

# Knowledge Graph Configuration (for publishing schemas)
GRC20_PRIVATE_KEY=your_wallet_private_key  # For publishing to The Graph
```

## 🚀 Development

```bash
# Start both Next.js and FastAPI servers
npm run dev

# Or start individually
npm run next-dev    # Next.js frontend on http://localhost:3000
npm run fastapi-dev # FastAPI backend on http://localhost:8000
```

## 📖 Usage

### Creating Schemas Manually

1. Open the web interface at `http://localhost:3000`
2. Enter contract address and select chain
3. Use the visual builder to create display fields
4. Preview on Ledger device simulators
5. Validate and export your schema

### AI-Powered Generation

1. Toggle "Auto Mode" in the interface
2. Enter contract address and chain ID
3. Click "Generate" to let AI analyze the contract
4. Review and adjust the generated schema
5. Publish to Knowledge Graph or export JSON

### Publishing to Knowledge Graph

1. Configure your wallet private key in environment
2. Generate or create your schema
3. Click "Publish to Knowledge Graph"
4. Schema becomes available for wallet integration

## 🏗️ Architecture

### Frontend (Next.js 15)

- **TypeScript**: Full type safety across the application
- **Tailwind CSS**: Modern styling with responsive design
- **Zustand**: Lightweight state management
- **tRPC**: Type-safe API communication
- **Shadcn/UI**: Modern component library

### Backend (FastAPI)

- **Python Integration**: Calls our enhanced python-erc7730 library
- **AI Processing**: Handles OpenAI API calls for schema generation
- **Validation**: Server-side schema validation
- **API Routes**: RESTful endpoints for frontend communication

### Knowledge Graph Integration

- **GRC-20-ts Library**: Integration with The Graph's TypeScript library
- **Entity Creation**: Creates structured entities for contracts and schemas
- **Decentralized Storage**: Schemas stored on The Graph for public access
- **Cross-chain Support**: Unified storage across multiple blockchain networks

## 🔗 Integration with ClearSignKit

This web interface is part of the larger ClearSignKit ecosystem:

- **[python-erc7730](https://github.com/0xAkuti/python-erc7730)**: AI-powered schema generation engine
- **clear-signing-erc7730-builder** (this repo): Visual web interface
- **[hardhat-clearsign](https://github.com/0xAkuti/hardhat-clearsign)**: Hardhat 3 plugin for development workflows

## 🔄 API Architecture

The Python/FastAPI server is mapped into the Next.js app under `/api/py/`:

- **Development**: Requests to `/api/py/*` are proxied to `localhost:8000`
- **Production**: FastAPI runs as serverless functions on Vercel
- **Type Safety**: tRPC ensures type safety between frontend and backend
- **Hybrid Routes**: Both Next.js API routes and FastAPI endpoints available

## 💻 Core Technologies

- **[Next.js 15](https://nextjs.org)**: React framework with App Router
- **[TypeScript](https://typescriptlang.org)**: Type-safe development
- **[Tailwind CSS](https://tailwindcss.com)**: Utility-first CSS framework
- **[tRPC](https://trpc.io)**: End-to-end type safety
- **[Shadcn/UI](https://ui.shadcn.com/)**: Modern component library
- **[Zustand](https://zustand-demo.pmnd.rs/)**: Lightweight state management
- **[FastAPI](https://fastapi.tiangolo.com/)**: Python backend framework
- **[The Graph GRC-20](https://thegraph.com/)**: Decentralized knowledge storage

# Copyright and license

This code is Copyright LEDGER SAS 2024 and published under the Apache-2.0 license.
