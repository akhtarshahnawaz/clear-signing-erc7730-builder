# Environment Variables Setup

This document describes the environment variables required for the new publishing functionality.

## Required Environment Variables

### Walrus Configuration
```bash
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://walrus-testnet-publisher.starduststaking.com
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://agg.test.walrus.eosusa.io
```
- **Description**: 
  - `NEXT_PUBLIC_WALRUS_PUBLISHER_URL`: The URL of the Walrus publisher node
  - `NEXT_PUBLIC_WALRUS_AGGREGATOR_URL`: The URL of the Walrus aggregator node for retrieving data
- **Default Values**: 
  - Publisher: `https://walrus-testnet-publisher.starduststaking.com`
  - Aggregator: `https://agg.test.walrus.eosusa.io`
- **Required**: No (has fallback defaults)

### Blockchain Configuration
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
NEXT_PUBLIC_CHAIN_ID=1
```
- **Description**: 
  - `NEXT_PUBLIC_CONTRACT_ADDRESS`: The smart contract address for publishing metadata
  - `NEXT_PUBLIC_CHAIN_ID`: The blockchain network ID (1 for Ethereum mainnet, 5 for Goerli, etc.)
- **Examples**: 
  - Mainnet: `1`
  - Goerli: `5`
  - Sepolia: `11155111`
  - Polygon: `137`
  - Arbitrum: `42161`
  - Optimism: `10`
- **Required**: Yes

## Setup Instructions

1. Create a `.env.local` file in your project root
2. Add the required environment variables with your actual values
3. Restart your development server

## Example .env.local file
```bash
# Walrus Configuration (optional - has defaults)
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://walrus-testnet-publisher.starduststaking.com
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://agg.test.walrus.eosusa.io

# Blockchain Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourActualContractAddress
NEXT_PUBLIC_CHAIN_ID=1

# Other existing variables...
# NEXT_PUBLIC_GTM=your-gtm-id
# NEXT_PUBLIC_ONETRUST=your-onetrust-id
# PRIVATE_KEY=your-private-key
```

## Notes

- All environment variables prefixed with `NEXT_PUBLIC_` are exposed to the client-side code
- The Walrus URLs have fallback defaults, so they're optional to set
- The contract address and chain ID are used for blockchain publishing functionality
- The Walrus publisher URL is used for file storage publishing
- The Walrus aggregator URL can be used for retrieving published data
- Make sure to use the correct network and contract address for your deployment
