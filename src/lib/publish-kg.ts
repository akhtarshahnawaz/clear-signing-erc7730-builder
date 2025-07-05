interface PublishParams {
  contractAddress: string;
  chainId: string;
  contractName: string;
  erc7730Data: Record<string, unknown>;
}

interface PublishResult {
  entityId: string;
  txHash: string;
}

export async function publishToKnowledgeGraph(params: PublishParams): Promise<PublishResult> {
  const { contractAddress, chainId, contractName, erc7730Data } = params;

  try {
    const response = await fetch('/api/publish-kg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contractAddress,
        chainId,
        contractName,
        erc7730Data,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to publish to Knowledge Graph');
    }

    const result = await response.json() as PublishResult;
    return result;
  } catch (error) {
    console.error('Error publishing to Knowledge Graph:', error);
    throw new Error(`Failed to publish to Knowledge Graph: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

