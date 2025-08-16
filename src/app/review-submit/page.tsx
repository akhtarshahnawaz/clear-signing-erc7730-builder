"use client";

import { Button } from "~/components/ui/button";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useErc7730Store } from "~/store/erc7730Provider";
import { useToast } from "~/hooks/use-toast";
import { publishToWalrus } from "~/lib/publish-walrus";
import { publishToBlockchain } from "~/lib/publish-blockchain";
import { ArrowLeft, Copy, Upload, Bitcoin, Network, Eye, Info, Link, Layers, Zap, ArrowRight, Minus, Plus } from "lucide-react";

interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
  group: number;
  details?: any;
  connections: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface KnowledgeGraphLink {
  source: string;
  target: string;
  label: string;
  strength: number;
  type: string;
}

interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
}

export default function ReviewSubmitPage() {
  const router = useRouter();
  const [isGeneratingGraph, setIsGeneratingGraph] = React.useState(false);
  const [isPublishingToWalrus, setIsPublishingToWalrus] = React.useState(false);
  const [isPublishingToBlockchain, setIsPublishingToBlockchain] = React.useState(false);
  const [knowledgeGraphData, setKnowledgeGraphData] = React.useState<KnowledgeGraphData | null>(null);
  const [selectedNode, setSelectedNode] = React.useState<KnowledgeGraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);
  const [graphScale, setGraphScale] = React.useState(1);
  const [walrusResult, setWalrusResult] = React.useState<{
    success: boolean;
    blobId?: string;
    registeredEpoch?: number;
    size?: number;
    cost?: number;
    alreadyCertified?: boolean;
    endEpoch?: number;
    txDigest?: string;
    error?: string;
  } | null>(null);
  const [blockchainResult, setBlockchainResult] = React.useState<{
    success: boolean;
    txHash?: string;
    error?: string;
  } | null>(null);
  
  const erc7730 = useErc7730Store((s) => s.finalErc7730);
  const { toast } = useToast();

  // Redirect if no ERC7730 data
  React.useEffect(() => {
    if (!erc7730) {
      router.push('/');
    }
  }, [erc7730, router]);

  if (!erc7730) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-gray-600">No ERC7730 data found</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleCopyToClipboard = () => {
    void navigator.clipboard.writeText(JSON.stringify(erc7730, null, 2));
    toast({
      title: "JSON copied to clipboard!",
    });
  };

  const generateKnowledgeGraph = () => {
    setIsGeneratingGraph(true);
    
    // Simulate processing time
    setTimeout(() => {
      try {
        const graphData = createKnowledgeGraphFromERC7730(erc7730);
        setKnowledgeGraphData(graphData);
        toast({
          title: "Success!",
          description: "Knowledge graph generated successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to generate knowledge graph",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingGraph(false);
      }
    }, 1500);
  };

  const createKnowledgeGraphFromERC7730 = (data: any): KnowledgeGraphData => {
    const nodes: KnowledgeGraphNode[] = [];
    const links: KnowledgeGraphLink[] = [];
    let nodeId = 0;

    // Add main contract node with flexible metadata extraction
    const contractName = data.metadata?.owner || 
                        data.metadata?.name || 
                        data.context?.contract?.name ||
                        data.name ||
                        "Contract";
    
    const contractNode = {
      id: `contract-${nodeId++}`,
      label: contractName,
      type: "contract",
      group: 1,
      details: {
        description: "Main smart contract entity",
        metadata: data.metadata,
        context: data.context,
        // Flexible metadata extraction
        owner: data.metadata?.owner,
        name: data.metadata?.name,
        legalName: data.metadata?.info?.legalName,
        url: data.metadata?.info?.url,
        version: data.metadata?.version,
        description: data.metadata?.description
      },
      connections: 0,
      fx: 0, // Center the contract
      fy: 0
    };
    nodes.push(contractNode);

    // Add operations from both ABI and display formats with flexible structure handling
    const operations = new Map();
    
    // First, collect ABI functions with flexible structure
    if (data.context?.contract?.abi) {
      data.context.contract.abi.forEach((abiFunction: any) => {
        if (abiFunction.type === 'function') {
          const functionName = abiFunction.name;
          const inputs = abiFunction.inputs || [];
          const outputs = abiFunction.outputs || [];
          const functionSignature = `${functionName}(${inputs.map((input: any) => input.type).join(',') || ''})`;
          
          operations.set(functionSignature, {
            name: functionName,
            abi: abiFunction,
            display: null,
            inputs: inputs,
            outputs: outputs
          });
        }
      });
    }
    
    // Then, merge with display formats (handle different possible structures)
    if (data.display?.formats) {
      Object.entries(data.display.formats).forEach(([formatName, format]: [string, any]) => {
        if (operations.has(formatName)) {
          operations.get(formatName).display = format;
        } else {
          // Handle different format naming conventions
          const functionName = formatName.includes('(') ? 
            formatName.split('(')[0] : 
            formatName;
          
          operations.set(formatName, {
            name: functionName,
            abi: null,
            display: format,
            inputs: [],
            outputs: []
          });
        }
      });
    }
    
    // Also check for operations in other possible locations
    if (data.operations) {
      Object.entries(data.operations).forEach(([opName, opData]: [string, any]) => {
        if (!operations.has(opName)) {
          operations.set(opName, {
            name: opName,
            abi: null,
            display: opData,
            inputs: [],
            outputs: []
          });
        }
      });
    }

    // Create operation nodes
    Array.from(operations.entries()).forEach(([signature, operation]: [string, any], index: number) => {
      const abi = operation.abi;
      const display = operation.display;
      
      // Extract function metadata from ABI with fallbacks
      const isPayable = abi?.stateMutability === 'payable' || abi?.payable === true;
      const isView = abi?.stateMutability === 'view' || abi?.constant === true;
      const isPure = abi?.stateMutability === 'pure';
      const isConstant = abi?.constant === true;
      const hasStateChange = abi?.stateMutability === 'nonpayable' || abi?.stateMutability === 'payable' || !isView;
      const isReadOnly = abi?.stateMutability === 'view' || abi?.stateMutability === 'pure' || isConstant;
      
      // Extract function signature and selector with fallbacks
      const functionSignature = signature;
      const functionSelector = abi?.signature || abi?.selector || '';
      
      // Extract gas and other metadata with fallbacks
      const gasEstimate = abi?.gas || abi?.gasEstimate || abi?.estimatedGas || null;
      const functionType = abi?.type || 'function';
      
      // Get field count from display format or ABI with fallbacks
      const fieldCount = display?.fields?.length || 
                        operation.inputs?.length || 
                        abi?.inputs?.length || 
                        0;
      
      // Get operation description/intent from multiple possible sources
      const operationDescription = display?.intent || 
                                 display?.description || 
                                 display?.purpose || 
                                 display?.summary ||
                                 "Contract operation";
      
      const operationNode = {
        id: `operation-${nodeId++}`,
        label: operation.name,
        type: "operation",
        group: 2,
        details: {
          description: operationDescription,
          format: display,
          abi: abi,
          fields: fieldCount,
          operationType: functionType,
          isPayable: isPayable,
          isView: isView,
          isPure: isPure,
          isConstant: isConstant,
          hasStateChange: hasStateChange,
          isReadOnly: isReadOnly,
          stateMutability: abi?.stateMutability,
          gasEstimate: gasEstimate,
          selector: functionSelector,
          signature: functionSignature,
          inputs: operation.inputs || abi?.inputs || [],
          outputs: operation.outputs || abi?.outputs || []
        },
        connections: 0,
        fx: Math.cos((index * 2 * Math.PI) / operations.size) * 200,
        fy: Math.sin((index * 2 * Math.PI) / operations.size) * 200
      };
      nodes.push(operationNode);
      
      // Link contract to operation
      links.push({
        source: contractNode.id,
        target: operationNode.id,
        label: "has operation",
        strength: 1,
        type: "operation"
      });
      contractNode.connections++;
      operationNode.connections++;

      // Add fields for each operation with flexible structure handling
      if (display?.fields) {
        display.fields.forEach((field: any, fieldIndex: number) => {
          // Extract field metadata from display format with multiple fallbacks
          const fieldType = field.format || field.type || field.dataType || field.fieldType || 'unknown';
          const fieldLabel = field.label || field.name || field.title || field.path?.split('.').pop() || 'Unknown Field';
          const fieldPath = field.path || field.jsonPath || '';
          const fieldParams = field.params || field.parameters || field.validation || {};
          
          // Determine if field is input or output based on multiple indicators
          const isInput = fieldPath.includes('#.') || 
                         fieldPath.includes('input') || 
                         field.input !== false || 
                         field.direction !== 'output';
          const isOutput = fieldPath.includes('output') || 
                          fieldPath.includes('return') || 
                          field.output === true || 
                          field.direction === 'output';
          
          // Extract field constraints and validation with fallbacks
          const hasValidation = fieldParams.types || 
                              fieldParams.encoding || 
                              fieldParams.sources || 
                              fieldParams.constraints ||
                              field.validation ||
                              field.constraints;
          const fieldDescription = field.description || 
                                 field.intent || 
                                 field.help || 
                                 field.tooltip || 
                                 field.summary || '';
          
          // Enhanced type detection based on format with fallbacks
          const isArray = fieldType.includes('array') || fieldType.includes('[]') || field.isArray;
          const isAddress = fieldType === 'addressName' || fieldType === 'address' || fieldType.includes('address');
          const isAmount = fieldType === 'amount' || fieldType === 'uint256' || fieldType === 'number' || fieldType.includes('uint');
          const isDate = fieldType === 'date' || fieldType === 'timestamp' || fieldType.includes('time');
          const isRaw = fieldType === 'raw' || fieldType === 'bytes' || fieldType === 'string';
          const isDuration = fieldType === 'duration' || fieldType === 'time' || fieldType.includes('duration');
          
          const fieldNode = {
            id: `field-${nodeId++}`,
            label: fieldLabel,
            type: "field",
            group: 3,
            details: {
              description: isInput ? "Input field parameter" : "Output field result",
              fieldType: fieldType,
              inputOutput: isInput ? "input" : "output",
              path: fieldPath,
              params: fieldParams,
              required: field.required !== false && field.optional !== true,
              validation: hasValidation,
              fieldDescription: fieldDescription,
              isArray: isArray,
              isAddress: isAddress,
              isAmount: isAmount,
              isDate: isDate,
              isRaw: isRaw,
              isDuration: isDuration,
              types: fieldParams.types,
              encoding: fieldParams.encoding,
              sources: fieldParams.sources,
              constraints: fieldParams.constraints
            },
            connections: 0,
            fx: operationNode.fx! + Math.cos((fieldIndex * 2 * Math.PI) / display.fields.length) * 150,
            fy: operationNode.fy! + Math.sin((fieldIndex * 2 * Math.PI) / display.fields.length) * 150
          };
          nodes.push(fieldNode);
          
          // Link operation to field
          links.push({
            source: operationNode.id,
            target: fieldNode.id,
            label: isInput ? "requires input" : "produces output",
            strength: 1,
            type: "field"
          });
          operationNode.connections++;
          fieldNode.connections++;
        });
      }
    });

    // Add context information with flexible structure handling
    if (data.context?.contract?.deployments) {
      data.context.contract.deployments.forEach((deployment: any, index: number) => {
        const deploymentNode = {
          id: `deployment-${nodeId++}`,
          label: `${deployment.chainId || 'Unknown'}:${(deployment.address || '0x...').slice(0, 8)}...`,
          type: "deployment",
          group: 4,
          details: {
            description: "Blockchain deployment",
            chainId: deployment.chainId,
            address: deployment.address,
            fullAddress: deployment.address,
            network: deployment.network || deployment.chainName,
            blockNumber: deployment.blockNumber,
            transactionHash: deployment.txHash || deployment.transactionHash
          },
          connections: 0,
          fx: Math.cos((index * 2 * Math.PI) / data.context.contract.deployments.length) * 300,
          fy: Math.sin((index * 2 * Math.PI) / data.context.contract.deployments.length) * 300
        };
        nodes.push(deploymentNode);
        
        // Link contract to deployment
        links.push({
          source: contractNode.id,
          target: deploymentNode.id,
          label: "deployed on",
          strength: 1,
          type: "deployment"
        });
        contractNode.connections++;
        deploymentNode.connections++;
      });
    }
    
    // Also check for deployments in other possible locations
    if (data.deployments) {
      data.deployments.forEach((deployment: any, index: number) => {
        if (!data.context?.contract?.deployments?.some((d: any) => d.address === deployment.address)) {
          const deploymentNode = {
            id: `deployment-${nodeId++}`,
            label: `${deployment.chainId || 'Unknown'}:${(deployment.address || '0x...').slice(0, 8)}...`,
            type: "deployment",
            group: 4,
            details: {
              description: "Blockchain deployment",
              chainId: deployment.chainId,
              address: deployment.address,
              fullAddress: deployment.address,
              network: deployment.network || deployment.chainName,
              blockNumber: deployment.blockNumber,
              transactionHash: deployment.txHash || deployment.transactionHash
            },
            connections: 0,
            fx: Math.cos((index * 2 * Math.PI) / data.deployments.length) * 300,
            fy: Math.sin((index * 2 * Math.PI) / data.deployments.length) * 300
          };
          nodes.push(deploymentNode);
          
          links.push({
            source: contractNode.id,
            target: deploymentNode.id,
            label: "deployed on",
            strength: 1,
            type: "deployment"
          });
          contractNode.connections++;
          deploymentNode.connections++;
        }
      });
    }

    return { nodes, links };
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'contract': return <Layers className="h-4 w-4" />;
      case 'operation': return <Zap className="h-4 w-4" />;
      case 'field': return <Info className="h-4 w-4" />;
      case 'deployment': return <Link className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getNodeColor = (group: number) => {
    switch (group) {
      case 1: return 'from-blue-500 to-blue-600';
      case 2: return 'from-green-500 to-green-600';
      case 3: return 'from-purple-500 to-purple-600';
      case 4: return 'from-orange-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getNodeBorderColor = (group: number) => {
    switch (group) {
      case 1: return 'border-blue-200';
      case 2: return 'border-green-200';
      case 3: return 'border-purple-200';
      case 4: return 'border-orange-200';
      default: return 'border-gray-200';
    }
  };

  const getRelatedNodes = (nodeId: string) => {
    if (!knowledgeGraphData) return { incoming: [], outgoing: [] };
    
    const incoming = knowledgeGraphData.links
      .filter(link => link.target === nodeId)
      .map(link => ({
        ...link,
        sourceNode: knowledgeGraphData.nodes.find(n => n.id === link.source)
      }));
    
    const outgoing = knowledgeGraphData.links
      .filter(link => link.source === nodeId)
      .map(link => ({
        ...link,
        targetNode: knowledgeGraphData.nodes.find(n => n.id === link.target)
      }));
    
    return { incoming, outgoing };
  };

  const handlePublishToWalrus = async () => {
    setIsPublishingToWalrus(true);
    setWalrusResult(null);

    try {
      const jsonData = JSON.stringify(erc7730, null, 2);
      const result = await publishToWalrus({
        data: jsonData,
      });

      setWalrusResult({
        success: true,
        blobId: result.blobId,
        registeredEpoch: result.registeredEpoch,
        size: result.size,
        cost: result.cost,
        alreadyCertified: result.alreadyCertified,
        endEpoch: result.endEpoch,
        txDigest: result.txDigest,
      });

      const message = result.alreadyCertified 
        ? `JSON already published to Walrus with blob ID: ${result.blobId}`
        : `JSON published to Walrus with blob ID: ${result.blobId}`;
      
      toast({
        title: result.alreadyCertified ? "Already Published!" : "Success!",
        description: message,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setWalrusResult({
        success: false,
        error: errorMessage,
      });

      toast({
        title: "Error",
        description: `Failed to publish to Walrus: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsPublishingToWalrus(false);
    }
  };

  const handlePublishToBlockchain = async () => {
    if (!walrusResult?.success || !walrusResult.blobId) {
      toast({
        title: "Error",
        description: "Please publish to Walrus first to get a blob ID",
        variant: "destructive",
      });
      return;
    }

    setIsPublishingToBlockchain(true);
    setBlockchainResult(null);

    try {
      const result = await publishToBlockchain({
        blobId: walrusResult.blobId,
      });

      setBlockchainResult({
        success: true,
        txHash: result.txHash,
      });

      toast({
        title: "Success!",
        description: "Metadata published to blockchain",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setBlockchainResult({
        success: false,
        error: errorMessage,
      });

      toast({
        title: "Error",
        description: `Failed to publish to blockchain: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsPublishingToBlockchain(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Review & Submit JSON
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* JSON Preview */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">JSON Preview</h3>
            </div>
            <div className="p-6">
              <pre className="max-h-96 overflow-auto rounded border bg-gray-100 p-4 text-sm dark:text-black">
                {JSON.stringify(erc7730, null, 2)}
              </pre>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                onClick={handleCopyToClipboard}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center space-y-2"
              >
                <Copy className="h-6 w-6" />
                <span>Copy to Clipboard</span>
              </Button>
              
              <Button 
                onClick={generateKnowledgeGraph} 
                disabled={isGeneratingGraph}
                variant="default"
                className="h-auto py-4 flex flex-col items-center space-y-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Network className="h-6 w-6" />
                <span>{isGeneratingGraph ? "Generating..." : "Generate Knowledge Graph"}</span>
              </Button>
              
              <Button 
                onClick={handlePublishToWalrus} 
                disabled={isPublishingToWalrus}
                variant="default"
                className={`h-auto py-4 flex flex-col items-center space-y-2 ${
                  walrusResult?.success 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-purple-600 hover:bg-purple-700"
                } text-white`}
              >
                <Upload className="h-6 w-6" />
                <span>
                  {isPublishingToWalrus ? "Publishing..." : 
                   walrusResult?.success ? "✅ Published to Walrus" : "Publish to Walrus"}
                </span>
              </Button>
              
              <Button 
                onClick={handlePublishToBlockchain} 
                disabled={isPublishingToBlockchain || !walrusResult?.success}
                variant="default"
                className={`h-auto py-4 flex flex-col items-center space-y-2 ${
                  blockchainResult?.success 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-orange-600 hover:bg-orange-700"
                } text-white`}
              >
                <Bitcoin className="h-6 w-6" />
                <span>
                  {isPublishingToBlockchain ? "Publishing..." : 
                   blockchainResult?.success ? "✅ Published to Blockchain" : "Publish to Blockchain"}
                </span>
              </Button>
            </div>
          </div>

          {/* Clean Hierarchical Knowledge Graph Visualization */}
          {knowledgeGraphData && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Knowledge Graph Structure</h3>
                <div className="flex items-center space-x-4">
                  {/* Graph Controls */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGraphScale(Math.max(0.5, graphScale - 0.1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600 w-16 text-center">
                      {Math.round(graphScale * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGraphScale(Math.min(2, graphScale + 0.1))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span>Contracts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Operations</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                      <span>Fields</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>Deployments</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Clean Hierarchical Graph Layout */}
                <div className="lg:col-span-2">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 min-h-96 relative overflow-auto">
                    <div className="relative" style={{ transform: `scale(${graphScale})`, transformOrigin: 'top left' }}>
                      
                      {/* Contract Level (Top Center) */}
                      <div className="mb-20">
                        <div className="text-center text-sm text-gray-500 mb-8 font-medium uppercase tracking-wide">Smart Contract</div>
                        <div className="flex justify-center items-start space-x-12">
                          {/* Main Contract Node */}
                          {knowledgeGraphData.nodes.filter(n => n.group === 1).map((node) => (
                            <div
                              key={node.id}
                              className={`
                                relative cursor-pointer transform transition-all duration-200 group
                                ${selectedNode?.id === node.id ? 'z-20' : 'z-10'}
                              `}
                              onClick={() => setSelectedNode(node)}
                              onMouseEnter={() => setHoveredNode(node.id)}
                              onMouseLeave={() => setHoveredNode(null)}
                            >
                              <div className={`
                                relative transform transition-all duration-200
                                ${hoveredNode === node.id ? 'scale-110' : 'scale-100'}
                                ${selectedNode?.id === node.id ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}
                              `}>
                                <div className={`
                                  bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-8 
                                  border-2 border-blue-300 shadow-xl
                                  ${hoveredNode === node.id ? 'shadow-2xl border-white' : ''}
                                  min-w-[220px] text-center
                                `}>
                                  {/* Node icon and label */}
                                  <div className="flex items-center justify-center space-x-3 mb-4">
                                    <div className="p-2 bg-white bg-opacity-20 rounded-full">
                                      {getNodeIcon(node.type)}
                                    </div>
                                    <span className="font-semibold text-sm uppercase tracking-wide">{node.type}</span>
                                  </div>
                                  
                                  <div className="text-xl font-bold mb-3 truncate">{node.label}</div>
                                  
                                  {/* Contract metadata */}
                                  {node.details?.legalName && (
                                    <div className="text-sm opacity-90 mb-2 bg-white bg-opacity-10 rounded-lg px-3 py-2">
                                      {node.details.legalName}
                                    </div>
                                  )}
                                  {node.details?.url && (
                                    <div className="text-sm opacity-90 flex items-center justify-center space-x-2">
                                      <span>📍</span>
                                      <span className="truncate">{node.details.url}</span>
                                    </div>
                                  )}
                                  
                                  {/* Hover effect */}
                                  <div className="absolute inset-0 bg-white bg-opacity-0 group-hover:bg-opacity-10 rounded-2xl transition-all duration-200"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Single Deployments Node */}
                          {(() => {
                            const deploymentNodes = knowledgeGraphData.nodes.filter(n => n.group === 4);
                            if (deploymentNodes.length === 0) return null;
                            
                            return (
                              <div className="relative cursor-pointer transform transition-all duration-200 group">
                                <div className="relative transform transition-all duration-200">
                                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 border-2 border-orange-300 shadow-xl min-w-[200px] text-center">
                                    {/* Node icon and label */}
                                    <div className="flex items-center justify-center space-x-3 mb-3">
                                      <div className="p-2 bg-white bg-opacity-20 rounded-full">
                                        {getNodeIcon('deployment')}
                                      </div>
                                      <span className="font-semibold text-sm uppercase tracking-wide">Deployments</span>
                                    </div>
                                    
                                    <div className="text-lg font-bold mb-3">Network Deployments</div>
                                    
                                    {/* Deployment details */}
                                    <div className="space-y-2">
                                      {deploymentNodes.map((deployment, idx) => (
                                        <div key={deployment.id} className="bg-white bg-opacity-10 rounded-lg px-3 py-2 text-sm">
                                          <div className="font-medium">
                                            {deployment.details?.network || `Chain ${deployment.details?.chainId || 'Unknown'}`}
                                          </div>
                                          <div className="text-xs opacity-80 font-mono">
                                            {deployment.details?.address?.slice(0, 8)}...{deployment.details?.address?.slice(-6)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Hover effect */}
                                    <div className="absolute inset-0 bg-white bg-opacity-0 group-hover:bg-opacity-10 rounded-2xl transition-all duration-200"></div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Operations Level (Below Contract) */}
                      <div className="mb-20">
                        <div className="text-center text-sm text-gray-500 mb-10 font-medium uppercase tracking-wide">Contract Operations</div>
                        <div className="flex flex-wrap justify-center gap-16">
                          {knowledgeGraphData.nodes.filter(n => n.group === 2).map((node, index) => {
                            // Get fields that belong to this operation
                            const operationFields = knowledgeGraphData.nodes.filter(n => 
                              n.group === 3 && knowledgeGraphData.links.some(link => 
                                link.source === node.id && link.target === n.id
                              )
                            );
                            
                            return (
                              <div key={node.id} className="relative">
                                {/* Operation Node */}
                                <div
                                  className={`
                                    relative cursor-pointer transform transition-all duration-200 group
                                    ${selectedNode?.id === node.id ? 'z-20' : 'z-10'}
                                  `}
                                  onClick={() => setSelectedNode(node)}
                                  onMouseEnter={() => setHoveredNode(node.id)}
                                  onMouseLeave={() => setHoveredNode(null)}
                                >
                                  <div className={`
                                    relative transform transition-all duration-200
                                    ${hoveredNode === node.id ? 'scale-110' : 'scale-100'}
                                    ${selectedNode?.id === node.id ? 'ring-4 ring-green-400 ring-opacity-50' : ''}
                                  `}>
                                    <div className={`
                                      bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl p-5 
                                      border-2 border-green-300 shadow-lg
                                      ${hoveredNode === node.id ? 'shadow-2xl border-white' : ''}
                                      min-w-[200px] text-center
                                    `}>
                                      {/* Function type indicators */}
                                      <div className="absolute -top-3 -left-3 flex flex-col space-y-1">
                                        {node.details?.isPayable && (
                                          <div className="bg-yellow-500 text-black text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                            💰
                                          </div>
                                        )}
                                        {node.details?.isView && (
                                          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                            👁️
                                          </div>
                                        )}
                                        {node.details?.isPure && (
                                          <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                            🌱
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Access modifiers */}
                                      <div className="absolute -top-3 -right-3 flex flex-col space-y-1">
                                        {node.details?.isExternal && (
                                          <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                            E
                                          </div>
                                        )}
                                        {node.details?.isPublic && (
                                          <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                            P
                                          </div>
                                        )}
                                        {node.details?.isPrivate && (
                                          <div className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                            P
                                          </div>
                                        )}
                                        {node.details?.isInternal && (
                                          <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                            I
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Node icon and label */}
                                      <div className="flex items-center justify-center space-x-2 mb-3">
                                        <div className="p-1.5 bg-white bg-opacity-20 rounded-full">
                                          {getNodeIcon(node.type)}
                                        </div>
                                        <span className="font-semibold text-xs uppercase tracking-wide">{node.type}</span>
                                      </div>
                                      
                                      <div className="text-base font-bold mb-3 truncate">{node.label}</div>
                                      
                                      {/* Function metadata */}
                                      <div className="text-xs opacity-90 space-y-2">
                                        {node.details?.stateMutability && (
                                          <div className="bg-white bg-opacity-20 rounded-lg px-3 py-2">
                                            <span className="font-medium">{node.details.stateMutability}</span>
                                            {node.details.isPayable && ' 💰'}
                                          </div>
                                        )}
                                        {node.details?.hasStateChange && (
                                          <div className="bg-orange-500 bg-opacity-80 rounded-lg px-2 py-1">
                                            State Change
                                          </div>
                                        )}
                                        {node.details?.isReadOnly && (
                                          <div className="bg-blue-500 bg-opacity-80 rounded-lg px-2 py-1">
                                            Read Only
                                          </div>
                                        )}
                                        {node.details?.inputs && node.details.inputs.length > 0 && (
                                          <div className="text-xs text-gray-300 bg-white bg-opacity-10 rounded px-2 py-1">
                                            Inputs: {node.details.inputs.length}
                                          </div>
                                        )}
                                        {node.details?.outputs && node.details.outputs.length > 0 && (
                                          <div className="text-xs text-gray-300 bg-white bg-opacity-10 rounded px-2 py-1">
                                            Outputs: {node.details.outputs.length}
                                          </div>
                                        )}
                                        {node.details?.signature && (
                                          <div className="text-xs text-gray-300 font-mono truncate bg-black bg-opacity-20 rounded px-2 py-1">
                                            {node.details.signature}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Hover effect */}
                                      <div className="absolute inset-0 bg-white bg-opacity-0 group-hover:bg-opacity-10 rounded-xl transition-all duration-200"></div>
                                    </div>
                                  </div>
                                </div>

                                {/* Fields Section - Clearly Connected to Operation */}
                                {operationFields.length > 0 && (
                                  <div className="mt-6 relative">
                                    {/* Visual connection line from operation to fields */}
                                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-green-400 to-purple-400"></div>
                                    
                                    {/* Fields container with visual grouping */}
                                    <div className="relative">
                                      {/* Fields section header */}
                                      <div className="text-center mb-4">
                                        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-100 to-purple-100 text-gray-700 px-4 py-2 rounded-full border border-green-200">
                                          <span className="text-green-600">📋</span>
                                          <span className="text-sm font-medium">Operation Fields</span>
                                          <span className="text-purple-600">({operationFields.length})</span>
                                        </div>
                                      </div>
                                      
                                      {/* Fields grid - organized by input/output */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                                        {/* Input Fields */}
                                        {(() => {
                                          const inputFields = operationFields.filter(field => 
                                            field.details?.inputOutput === 'input'
                                          );
                                          if (inputFields.length === 0) return null;
                                          
                                          return (
                                            <div className="space-y-3">
                                              <div className="text-center">
                                                <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                                  <span>📥</span>
                                                  <span>Input Fields</span>
                                                  <span className="bg-blue-200 px-2 py-0.5 rounded-full text-xs">
                                                    {inputFields.length}
                                                  </span>
                                                </div>
                                              </div>
                                              {inputFields.map((fieldNode) => (
                                                <div
                                                  key={fieldNode.id}
                                                  className={`
                                                    relative cursor-pointer transform transition-all duration-200 group
                                                    ${selectedNode?.id === fieldNode.id ? 'z-20' : 'z-10'}
                                                  `}
                                                  onClick={() => setSelectedNode(fieldNode)}
                                                  onMouseEnter={() => setHoveredNode(fieldNode.id)}
                                                  onMouseLeave={() => setHoveredNode(null)}
                                                >
                                                  <div className={`
                                                    relative transform transition-all duration-200
                                                    ${hoveredNode === fieldNode.id ? 'scale-105' : 'scale-100'}
                                                    ${selectedNode?.id === fieldNode.id ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
                                                  `}>
                                                    <div className={`
                                                      bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg p-3 
                                                      border-2 border-blue-300 shadow-md
                                                      ${hoveredNode === fieldNode.id ? 'shadow-lg border-white' : ''}
                                                      min-w-[160px] text-center
                                                    `}>
                                                      {/* Field type indicator */}
                                                      <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                                        IN
                                                      </div>
                                                      
                                                      {/* Field name - compact */}
                                                      <div className="text-sm font-bold mb-2 truncate px-1">{fieldNode.label}</div>
                                                      
                                                      {/* Field type - compact */}
                                                      <div className="text-xs opacity-90 mb-2 bg-white bg-opacity-10 rounded px-2 py-1">
                                                        {fieldNode.details?.fieldType}
                                                      </div>
                                                      
                                                      {/* Rich metadata in compact format */}
                                                      <div className="text-xs opacity-90 space-y-1">
                                                        {fieldNode.details?.isAddress && (
                                                          <div className="text-blue-200 bg-white bg-opacity-10 rounded px-2 py-1">
                                                            🏠 {fieldNode.details.types?.join(', ') || 'Address'}
                                                          </div>
                                                        )}
                                                        {fieldNode.details?.isAmount && (
                                                          <div className="text-green-200 bg-white bg-opacity-10 rounded px-2 py-1">💰 Amount</div>
                                                        )}
                                                        {fieldNode.details?.isDate && (
                                                          <div className="text-purple-200 bg-white bg-opacity-10 rounded px-2 py-1">
                                                            📅 {fieldNode.details.encoding || 'Date'}
                                                          </div>
                                                        )}
                                                        {fieldNode.details?.isRaw && (
                                                          <div className="text-orange-200 bg-white bg-opacity-10 rounded px-2 py-1">📝 Raw</div>
                                                        )}
                                                        {fieldNode.details?.isDuration && (
                                                          <div className="text-teal-200 bg-white bg-opacity-10 rounded px-2 py-1">⏱️ Duration</div>
                                                        )}
                                                        {fieldNode.details?.path && (
                                                          <div className="text-gray-300 text-xs font-mono truncate bg-black bg-opacity-20 rounded px-2 py-1">
                                                            {fieldNode.details.path}
                                                          </div>
                                                        )}
                                                        {fieldNode.details?.required !== undefined && (
                                                          <div className={`text-xs rounded px-2 py-1 ${
                                                            fieldNode.details.required 
                                                              ? 'bg-red-500 bg-opacity-80 text-red-100' 
                                                              : 'bg-yellow-500 bg-opacity-80 text-yellow-100'
                                                          }`}>
                                                            {fieldNode.details.required ? 'Required' : 'Optional'}
                                                          </div>
                                                        )}
                                                        {fieldNode.details?.validation && (
                                                          <div className="text-xs text-blue-200 bg-white bg-opacity-10 rounded px-2 py-1">✓ Validation</div>
                                                        )}
                                                      </div>
                                                      
                                                      {/* Hover effect */}
                                                      <div className="absolute inset-0 bg-white bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-200"></div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                        
                                        {/* Output Fields */}
                                        {(() => {
                                          const outputFields = operationFields.filter(field => 
                                            field.details?.inputOutput === 'output'
                                          );
                                          if (outputFields.length === 0) return null;
                                          
                                          return (
                                            <div className="space-y-3">
                                              <div className="text-center">
                                                <div className="inline-flex items-center space-x-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                                                  <span>📤</span>
                                                  <span>Output Fields</span>
                                                  <span className="bg-green-200 px-2 py-0.5 rounded-full text-xs">
                                                    {outputFields.length}
                                                  </span>
                                                </div>
                                              </div>
                                              {outputFields.map((fieldNode) => (
                                                <div
                                                  key={fieldNode.id}
                                                  className={`
                                                    relative cursor-pointer transform transition-all duration-200 group
                                                    ${selectedNode?.id === fieldNode.id ? 'z-20' : 'z-10'}
                                                  `}
                                                  onClick={() => setSelectedNode(fieldNode)}
                                                  onMouseEnter={() => setHoveredNode(fieldNode.id)}
                                                  onMouseLeave={() => setHoveredNode(null)}
                                                >
                                                  <div className={`
                                                    relative transform transition-all duration-200
                                                    ${hoveredNode === fieldNode.id ? 'scale-105' : 'scale-100'}
                                                    ${selectedNode?.id === fieldNode.id ? 'ring-2 ring-green-400 ring-opacity-50' : ''}
                                                  `}>
                                                    <div className={`
                                                      bg-gradient-to-br from-green-600 to-green-700 text-white rounded-lg p-3 
                                                      border-2 border-green-300 shadow-md
                                                      ${hoveredNode === fieldNode.id ? 'shadow-lg border-white' : ''}
                                                      min-w-[160px] text-center
                                                    `}>
                                                      {/* Field type indicator */}
                                                      <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                                                        OUT
                                                      </div>
                                                      
                                                      {/* Field name - compact */}
                                                      <div className="text-sm font-bold mb-2 truncate px-1">{fieldNode.label}</div>
                                                      
                                                      {/* Field type - compact */}
                                                      <div className="text-xs opacity-90 mb-2 bg-white bg-opacity-10 rounded px-2 py-1">
                                                        {fieldNode.details?.fieldType}
                                                      </div>
                                                      
                                                      {/* Rich metadata in compact format */}
                                                      <div className="text-xs opacity-90 space-y-1">
                                                        {fieldNode.details?.isAddress && (
                                                          <div className="text-green-200 bg-white bg-opacity-10 rounded px-2 py-1">
                                                            🏠 {fieldNode.details.types?.join(', ') || 'Address'}
                                                          </div>
                                                        )}
                                                        {fieldNode.details?.isAmount && (
                                                          <div className="text-green-200 bg-white bg-opacity-10 rounded px-2 py-1">💰 Amount</div>
                                                        )}
                                                        {fieldNode.details?.isDate && (
                                                          <div className="text-purple-200 bg-white bg-opacity-10 rounded px-2 py-1">
                                                            📅 {fieldNode.details.encoding || 'Date'}
                                                          </div>
                                                        )}
                                                        {fieldNode.details?.isRaw && (
                                                          <div className="text-orange-200 bg-white bg-opacity-10 rounded px-2 py-1">📝 Raw</div>
                                                        )}
                                                        {fieldNode.details?.isDuration && (
                                                          <div className="text-teal-200 bg-white bg-opacity-10 rounded px-2 py-1">⏱️ Duration</div>
                                                        )}
                                                        {fieldNode.details?.path && (
                                                          <div className="text-gray-300 text-xs font-mono truncate bg-black bg-opacity-20 rounded px-2 py-1">
                                                            {fieldNode.details.path}
                                                          </div>
                                                        )}
                                                        {fieldNode.details?.required !== undefined && (
                                                          <div className={`text-xs rounded px-2 py-1 ${
                                                            fieldNode.details.required 
                                                              ? 'bg-red-500 bg-opacity-80 text-red-100' 
                                                              : 'bg-yellow-500 bg-opacity-80 text-yellow-100'
                                                          }`}>
                                                            {fieldNode.details.required ? 'Required' : 'Optional'}
                                                          </div>
                                                        )}
                                                        {fieldNode.details?.validation && (
                                                          <div className="text-xs text-green-200 bg-white bg-opacity-10 rounded px-2 py-1">✓ Validation</div>
                                                        )}
                                                      </div>
                                                      
                                                      {/* Hover effect */}
                                                      <div className="absolute inset-0 bg-white bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-200"></div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Node Details Panel */}
                <div className="lg:col-span-1">
                  {/* Right Sidebar - Node Details */}
                  <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
                    <div className="sticky top-0 bg-white pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Node Details</h3>
                      <p className="text-sm text-gray-600">Click on any node to see its details</p>
                    </div>
                    
                    {selectedNode ? (
                      <div className="mt-4 space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            {getNodeIcon(selectedNode.type)}
                            <span className="font-semibold text-gray-900">{selectedNode.type}</span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">{selectedNode.group}</span>
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mb-2 break-words">{selectedNode.label}</h4>
                          
                          {selectedNode.details?.description && (
                            <p className="text-sm text-gray-600 mb-3 break-words">
                              {selectedNode.details.description}
                            </p>
                          )}
                          
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Connections:</span> {selectedNode.connections}
                          </div>
                        </div>
                        
                        {/* Dynamic details based on node type */}
                        {selectedNode.type === 'operation' && selectedNode.details && (
                          <div className="space-y-3">
                            <h5 className="font-medium text-gray-900">Operation Details</h5>
                            
                            {selectedNode.details.description && (
                              <div className="p-2 bg-blue-50 rounded">
                                <span className="text-sm font-medium text-blue-900 block mb-1">Intent:</span>
                                <span className="text-sm text-blue-700">{selectedNode.details.description}</span>
                              </div>
                            )}
                            
                            {selectedNode.details.stateMutability && (
                              <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                <span className="text-sm font-medium text-blue-900">State Mutability:</span>
                                <span className="text-sm text-blue-700 px-2 py-1 bg-blue-100 rounded">
                                  {selectedNode.details.stateMutability}
                                </span>
                              </div>
                            )}
                            
                            {selectedNode.details.isPayable && (
                              <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded">
                                <span className="text-yellow-600">💰</span>
                                <span className="text-sm text-yellow-800">Payable Function</span>
                              </div>
                            )}
                            
                            {selectedNode.details.isView && (
                              <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                                <span className="text-blue-600">👁️</span>
                                <span className="text-sm text-blue-800">View Function</span>
                              </div>
                            )}
                            
                            {selectedNode.details.isPure && (
                              <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                                <span className="text-green-600">🌱</span>
                                <span className="text-sm text-green-800">Pure Function</span>
                              </div>
                            )}
                            
                            {selectedNode.details.fields > 0 && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Fields:</span> {selectedNode.details.fields}
                              </div>
                            )}
                            
                            {selectedNode.details.inputs && selectedNode.details.inputs.length > 0 && (
                              <div className="p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium text-gray-700 block mb-1">ABI Inputs:</span>
                                <div className="space-y-1">
                                  {selectedNode.details.inputs.map((input: any, idx: number) => (
                                    <div key={idx} className="text-xs text-gray-600">
                                      <span className="font-mono">{input.type}</span>
                                      <span className="text-gray-400"> {input.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {selectedNode.details.outputs && selectedNode.details.outputs.length > 0 && (
                              <div className="p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium text-gray-700 block mb-1">ABI Outputs:</span>
                                <div className="space-y-1">
                                  {selectedNode.details.outputs.map((output: any, idx: number) => (
                                    <div key={idx} className="text-xs text-gray-600">
                                      <span className="font-mono">{output.type}</span>
                                      <span className="text-gray-400"> {output.name || 'return'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {selectedNode.details.signature && (
                              <div className="p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium text-gray-700 block mb-1">Function Signature:</span>
                                <span className="text-sm text-gray-600 font-mono break-all">
                                  {selectedNode.details.signature}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {selectedNode.type === 'field' && selectedNode.details && (
                          <div className="space-y-3">
                            <h5 className="font-medium text-gray-900">Field Details</h5>
                            
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-700">Format:</span>
                              <span className="text-sm text-gray-600 px-2 py-1 bg-gray-100 rounded break-all">
                                {selectedNode.details.fieldType}
                              </span>
                            </div>
                            
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-700">Direction:</span>
                              <span className={`text-sm px-2 py-1 rounded ${
                                selectedNode.details.inputOutput === 'input' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {selectedNode.details.inputOutput === 'input' ? 'Input' : 'Output'}
                              </span>
                            </div>
                            
                            {selectedNode.details.path && (
                              <div className="p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium text-gray-700 block mb-1">Path:</span>
                                <span className="text-sm text-gray-600 font-mono break-all">
                                  {selectedNode.details.path}
                                </span>
                              </div>
                            )}
                            
                            {selectedNode.details.types && selectedNode.details.types.length > 0 && (
                              <div className="p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium text-gray-700 block mb-1">Address Types:</span>
                                <div className="flex flex-wrap gap-1">
                                  {selectedNode.details.types.map((type: string, idx: number) => (
                                    <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                      {type}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {selectedNode.details.encoding && (
                              <div className="p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium text-gray-700 block mb-1">Encoding:</span>
                                <span className="text-sm text-gray-600">
                                  {selectedNode.details.encoding}
                                </span>
                              </div>
                            )}
                            
                            {selectedNode.details.sources && (
                              <div className="p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium text-gray-700 block mb-1">Sources:</span>
                                <span className="text-sm text-gray-600">
                                  {JSON.stringify(selectedNode.details.sources)}
                                </span>
                              </div>
                            )}
                            
                            {selectedNode.details.fieldDescription && (
                              <div className="p-2 bg-gray-50 rounded">
                                <span className="text-sm font-medium text-gray-700 block mb-1">Description:</span>
                                <span className="text-sm text-gray-600 break-words">
                                  {selectedNode.details.fieldDescription}
                                </span>
                              </div>
                            )}
                            
                            {selectedNode.details.validation && (
                              <div className="p-2 bg-blue-50 rounded">
                                <span className="text-sm font-medium text-blue-700 block mb-1">Has Validation Rules</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {selectedNode.type === 'deployment' && selectedNode.details && (
                          <div className="space-y-3">
                            <h5 className="font-medium text-gray-900">Deployment Details</h5>
                            
                            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-700">Chain ID:</span>
                              <span className="text-sm text-gray-600 px-2 py-1 bg-gray-100 rounded">
                                {selectedNode.details.chainId}
                              </span>
                            </div>
                            
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-700 block mb-1">Address:</span>
                              <span className="text-sm text-gray-600 break-all font-mono">
                                {selectedNode.details.fullAddress}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4 text-center text-gray-500">
                        <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>Select a node to view its details</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Graph Analytics */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-4">Graph Analytics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Contracts', count: knowledgeGraphData.nodes.filter(n => n.group === 1).length, color: 'blue', icon: Layers },
                    { label: 'Operations', count: knowledgeGraphData.nodes.filter(n => n.group === 2).length, color: 'green', icon: Zap },
                    { label: 'Fields', count: knowledgeGraphData.nodes.filter(n => n.group === 3).length, color: 'purple', icon: Info },
                    { label: 'Deployments', count: knowledgeGraphData.nodes.filter(n => n.group === 4).length, color: 'orange', icon: Link }
                  ].map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                      <div key={index} className="text-center">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-${stat.color}-100 mb-3`}>
                          <IconComponent className={`h-8 w-8 text-${stat.color}-600`} />
                        </div>
                        <div className={`text-3xl font-bold text-${stat.color}-600 mb-1`}>{stat.count}</div>
                        <div className="text-sm text-gray-500">{stat.label}</div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Relationship Summary */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-blue-900">Total Relationships</h5>
                      <p className="text-sm text-blue-700">Discover how your contract components interact</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{knowledgeGraphData.links.length}</div>
                      <div className="text-sm text-blue-600">Connections</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Walrus Results */}
          {walrusResult && (
            <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${
              walrusResult.success ? "border-green-400" : "border-red-400"
            }`}>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Walrus Results</h3>
              {walrusResult.success ? (
                <div className="space-y-3">
                  <p className="text-green-800 font-medium">
                    {walrusResult.alreadyCertified ? "✅ Already published to Walrus!" : "✅ Successfully published to Walrus!"}
                  </p>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Blob ID:</span> {walrusResult.blobId}</p>
                    {walrusResult.alreadyCertified ? (
                      <>
                        <p><span className="font-medium">End Epoch:</span> {walrusResult.endEpoch}</p>
                        <p><span className="text-red-800 font-medium">Transaction Digest:</span> {walrusResult.txDigest}</p>
                      </>
                    ) : (
                      <>
                        <p><span className="font-medium">Registered Epoch:</span> {walrusResult.registeredEpoch}</p>
                        <p><span className="font-medium">Size:</span> {walrusResult.size} bytes</p>
                        <p><span className="font-medium">Cost:</span> {walrusResult.cost}</p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-red-800 font-medium">❌ Failed to publish to Walrus</p>
                  <p className="text-red-700 text-sm mt-1">{walrusResult.error}</p>
                </div>
              )}
            </div>
          )}

          {/* Blockchain Results */}
          {blockchainResult && (
            <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${
              blockchainResult.success ? "border-green-400" : "border-red-400"
            }`}>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Blockchain Results</h3>
              {blockchainResult.success ? (
                <div className="space-y-3">
                  <p className="text-green-800 font-medium">✅ Successfully published to Blockchain!</p>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Transaction Hash:</span>{" "}
                      <span className="font-mono text-xs">{blockchainResult.txHash}</span>
                    </p>
                    <p>
                      <span className="font-medium">Blob ID:</span> {walrusResult?.blobId}
                    </p>
                    <p>
                      <span className="font-medium">Contract ID:</span> placeholder-contract-id-123
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-red-800 font-medium">❌ Failed to publish to Blockchain</p>
                  <p className="text-red-700 text-sm mt-1">{blockchainResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
