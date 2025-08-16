import { env } from "~/env.js";

interface WalrusPublishParams {
  data: string;
}

interface WalrusPublishResult {
  blobId: string;
  registeredEpoch?: number;
  size?: number;
  cost?: number;
  alreadyCertified?: boolean;
  endEpoch?: number;
  txDigest?: string;
}

export async function publishToWalrus(params: WalrusPublishParams): Promise<WalrusPublishResult> {
  const { data } = params;
  
  // Get publisher URL from environment variable, with fallback to testnet URL
  const publisherUrl = env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL || "https://walrus-testnet-publisher.starduststaking.com";

  console.log(`Publishing to Walrus at: ${publisherUrl}`);
  console.log(`Data size: ${data.length} characters`);

  try {
    const response = await fetch(`${publisherUrl}/v1/blobs`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: data,
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        // If we can't parse the error response, use the status text
        console.warn('Could not parse error response:', parseError);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Walrus response:', result);
    
    // Handle both response types: newlyCreated and alreadyCertified
    if (result.newlyCreated?.blobObject) {
      // New blob was created
      const blobObject = result.newlyCreated.blobObject;
      return {
        blobId: blobObject.blobId,
        registeredEpoch: blobObject.registeredEpoch,
        size: blobObject.size,
        cost: result.newlyCreated.cost,
        alreadyCertified: false,
      };
    } else if (result.alreadyCertified) {
      // Blob was already published
      return {
        blobId: result.alreadyCertified.blobId,
        endEpoch: result.alreadyCertified.endEpoch,
        txDigest: result.alreadyCertified.event.txDigest,
        alreadyCertified: true,
      };
    } else {
      throw new Error('Invalid response format from Walrus: unexpected response structure');
    }
  } catch (error) {
    console.error('Error publishing to Walrus:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Network error: Unable to connect to Walrus publisher. Please check the URL: ${publisherUrl}`);
    }
    throw new Error(`Failed to publish to Walrus: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
