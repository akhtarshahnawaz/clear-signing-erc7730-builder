import { NextRequest, NextResponse } from 'next/server';
import { Graph, Ipfs, getWalletClient } from '@graphprotocol/grc-20';
import { privateKeyToAccount } from 'viem/accounts';

interface PublishRequest {
  contractAddress: string;
  chainId: string;
  contractName: string;
  erc7730Data: Record<string, unknown>;
}

interface PublishResult {
  entityId: string;
  txHash: string;
}

const SPACE_ID = '10ea8392-1c7e-4866-8559-eeea7b4722ef';
const TESTNET_API_URL = 'https://hypergraph-v2-testnet.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PublishRequest;
    const { contractAddress, chainId, contractName, erc7730Data } = body;

    // Validate input
    if (!contractAddress || !chainId || !contractName || !erc7730Data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get private key from environment variable - exactly like hardhat plugin
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Private key required. Set PRIVATE_KEY environment variable.' },
        { status: 400 }
      );
    }

    // Ensure private key is properly formatted - exactly like hardhat plugin
    const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    if (!/^0x[a-fA-F0-9]{64}$/.test(formattedPrivateKey)) {
      return NextResponse.json(
        { error: 'Invalid private key format. Must be a 64-character hex string.' },
        { status: 400 }
      );
    }

    console.log('📋 Publishing Smart Contract Metadata to Knowledge Graph');
    console.log(`Contract: ${contractAddress}`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`Contract Name: ${contractName}`);
    console.log('Network: TESTNET');
    console.log(`Space ID: ${SPACE_ID}`);

    // Setup wallet - exactly like hardhat plugin
    const { address } = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
    console.log(`📱 Wallet address: ${address}`);

    // Use regular wallet client for testnet - exactly like hardhat plugin
    const walletClient = await getWalletClient({
      privateKey: formattedPrivateKey as `0x${string}`,
    });
    console.log('🔧 Using regular wallet client for testnet');

    // Create properties for our metadata - exactly like hardhat plugin
    const ops: any[] = [];

    // Contract Address property
    const { id: contractAddressPropertyId, ops: contractAddressOps } = Graph.createProperty({
      name: 'Contract Address',
      dataType: 'TEXT',
    });
    ops.push(...contractAddressOps);

    // Chain ID property
    const { id: chainIdPropertyId, ops: chainIdOps } = Graph.createProperty({
      name: 'Chain ID',
      dataType: 'TEXT',
    });
    ops.push(...chainIdOps);

    // Contract Name property
    const { id: contractNamePropertyId, ops: contractNameOps } = Graph.createProperty({
      name: 'Contract Name',
      dataType: 'TEXT',
    });
    ops.push(...contractNameOps);

    // ERC-7730 JSON property
    const { id: erc7730PropertyId, ops: erc7730Ops } = Graph.createProperty({
      name: 'ERC-7730 JSON',
      dataType: 'TEXT',
    });
    ops.push(...erc7730Ops);

    // Create Smart Contract Metadata type - exactly like hardhat plugin
    const { id: smartContractTypeId, ops: smartContractTypeOps } = Graph.createType({
      name: 'Smart Contract Metadata',
      properties: [
        contractAddressPropertyId,
        chainIdPropertyId,
        contractNamePropertyId,
        erc7730PropertyId,
      ],
    });
    ops.push(...smartContractTypeOps);

    // Create the entity for this specific contract - exactly like hardhat plugin
    const { id: contractEntityId, ops: contractEntityOps } = Graph.createEntity({
      name: `${contractName} (${chainId}:${contractAddress})`,
      description: `ERC-7730 metadata for ${contractName} contract on chain ${chainId}`,
      types: [smartContractTypeId],
      values: [
        {
          property: contractAddressPropertyId,
          value: contractAddress,
        },
        {
          property: chainIdPropertyId,
          value: chainId,
        },
        {
          property: contractNamePropertyId,
          value: contractName,
        },
        {
          property: erc7730PropertyId,
          value: JSON.stringify(erc7730Data, null, 2),
        },
      ],
    });
    ops.push(...contractEntityOps);

    console.log(`🔗 Created entity: ${contractEntityId}`);

    // Publish to IPFS - exactly like hardhat plugin
    console.log('📤 Publishing to IPFS...');
    const { cid } = await Ipfs.publishEdit({
      name: `Smart Contract Metadata: ${contractName}`,
      ops,
      author: address,
      network: 'TESTNET',
    });

    console.log(`📝 IPFS CID: ${cid}`);

    // Get calldata for transaction - exactly like hardhat plugin
    const result = await fetch(`${TESTNET_API_URL}/space/${SPACE_ID}/edit/calldata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cid }),
    });

    if (!result.ok) {
      throw new Error(`Failed to get calldata: ${result.status} ${result.statusText}`);
    }

    const responseData = (await result.json()) as { to: string; data: string };
    const { to, data } = responseData;
    console.log(`📨 Transaction target: ${to}`);

    // Send transaction - exactly like hardhat plugin
    console.log('🚀 Sending transaction...');
    const txResult = await walletClient.sendTransaction({
      account: walletClient.account,
      to: to as `0x${string}`,
      value: 0n,
      data: data as `0x${string}`,
    });

    console.log(`✅ Transaction sent: ${txResult}`);
    console.log('🎉 Smart Contract Metadata successfully published to Knowledge Graph!');
    console.log(`📍 Space ID: ${SPACE_ID}`);
    console.log(`🔗 Entity ID: ${contractEntityId}`);
    console.log(`📝 IPFS CID: ${cid}`);
    console.log(`💎 Transaction Hash: ${txResult}`);

    const publishResult: PublishResult = {
      entityId: contractEntityId,
      txHash: txResult,
    };

    return NextResponse.json(publishResult);
  } catch (error) {
    console.error('Error publishing to Knowledge Graph:', error);
    return NextResponse.json(
      { error: `Failed to publish to Knowledge Graph: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}