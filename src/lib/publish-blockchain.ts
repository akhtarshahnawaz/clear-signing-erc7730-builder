import { env } from "~/env.js";

interface BlockchainPublishParams {
  blobId: string;
}

interface BlockchainPublishResult {
  txHash: string;
  success: boolean;
}

// Placeholder contract ABI - this will be replaced by the user in the future
const PLACEHOLDER_ABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "blobId",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "contractId",
        "type": "string"
      }
    ],
    "name": "publishMetadata",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export async function publishToBlockchain(params: BlockchainPublishParams): Promise<BlockchainPublishResult> {
  const { blobId } = params;

  // Get configuration from environment variables
  const contractAddress = env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const chainId = env.NEXT_PUBLIC_CHAIN_ID;
  
  if (!contractAddress) {
    throw new Error('Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS environment variable.');
  }
  
  if (!chainId) {
    throw new Error('Chain ID not configured. Set NEXT_PUBLIC_CHAIN_ID environment variable.');
  }

  const chainIdNum = parseInt(chainId, 10);
  if (isNaN(chainIdNum)) {
    throw new Error('Invalid chain ID in environment variable.');
  }

  // Use placeholder contract ID for now
  const contractId = "placeholder-contract-id-123";

  try {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    // Request account access
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please connect MetaMask.');
    }

    const account = accounts[0];

    // Check if we're on the correct network
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (currentChainId !== `0x${chainIdNum.toString(16)}`) {
      // Request network switch
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainIdNum.toString(16)}` }],
        });
      } catch (switchError: any) {
        // If the network doesn't exist, add it (this is a placeholder - user will configure)
        if (switchError.code === 4902) {
          throw new Error(`Network with chainId ${chainIdNum} is not configured. Please add it to MetaMask.`);
        }
        throw switchError;
      }
    }

    // Create contract instance
    const web3 = new (window as any).Web3(window.ethereum);
    const contract = new web3.eth.Contract(PLACEHOLDER_ABI, contractAddress);

    // Prepare transaction data
    const data = contract.methods.publishMetadata(blobId, contractId).encodeABI();

    // Send transaction
    const tx = await web3.eth.sendTransaction({
      from: account,
      to: contractAddress,
      data: data,
      gas: '300000', // Placeholder gas limit
    });

    return {
      txHash: tx.transactionHash,
      success: true,
    };
  } catch (error) {
    console.error('Error publishing to blockchain:', error);
    throw new Error(`Failed to publish to blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
    Web3?: any;
  }
}
