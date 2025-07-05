"use client";

import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";

import { useState, useEffect } from "react";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import SampleAddressAbiCard from "./sampleAddressAbiCard";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { ZodError } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useErc7730Store } from "~/store/erc7730Provider";
import useFunctionStore from "~/store/useOperationStore";
import generateFromERC7730 from "./generateFromERC7730";
import { convertOperationToSchema } from "~/lib/convertOperationToSchema";
import { type Operation } from "~/store/types";

const CHAIN_OPTIONS = [
  { value: "1", label: "Ethereum Mainnet" },
  { value: "11155111", label: "Sepolia" },
  // Baes and Testnet
  { value: "8453", label: "Base Mainnet" },
  { value: "84532", label: "Base Sepolia" },
  // Arbitrum
  { value: "42161", label: "Arbitrum One" },
  { value: "421614", label: "Arbitrum Sepolia" },
  // Optimism
  { value: "10", label: "Optimism Mainnet" },
  { value: "11155420", label: "Optimism Sepolia" },
  // Flow
  { value: "747", label: "Flow Mainnet" },
  { value: "545", label: "Flow Testnet" },
  // Polygon
  { value: "137", label: "Polygon Mainnet" },
  { value: "80001", label: "Polygon Mumbai" },
  // Gnosis
  { value: "100", label: "Gnosis Mainnet" },
  { value: "10200", label: "Gnosis Testnet" },
];

const AI_LOADING_MESSAGES = [
  "🤖 AI is reading the contract...",
  "🔍 Analyzing function signatures...",
  "🧠 Understanding parameter types...",
  "✨ Generating human-readable labels...",
  "🎨 Crafting beautiful display formats...",
  "🔗 Connecting to blockchain data...",
  "📝 Writing clear signing descriptions...",
  "🚀 Almost ready for review...",
];

const CardErc7730 = () => {
  const [input, setInput] = useState("");
  const [inputType, setInputType] = useState<"address" | "abi">("address");
  const [autoMode, setAutoMode] = useState(false);
  const [chainId, setChainId] = useState("1");
  const [aiLoadingMessage, setAiLoadingMessage] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const { setErc7730, setMetadata, setOperationData } = useErc7730Store((state) => state);
  const { setValidateOperation } = useFunctionStore();
  const router = useRouter();

  // Helper function to check if an operation should be auto-validated in AI mode
  const isOperationComplete = (operation: Operation) => {
    if (!operation || !operation.fields) {
      console.log("❌ Operation missing or has no fields:", operation);
      return false;
    }
    
    // Check if intent is filled - this is the minimum requirement
    if (!operation.intent || (typeof operation.intent === "string" && operation.intent.trim() === "")) {
      console.log("❌ Operation missing intent:", operation.intent);
      return false;
    }
    
    // In AI mode, if we have an intent and fields, assume the AI has done its job
    // We'll be more liberal with auto-validation since the user explicitly requested AI processing
    
    // Check if the operation has any fields at all
    if (operation.fields.length === 0) {
      console.log("❌ Operation has no fields");
      return false;
    }
    
    // Check if there's evidence of AI processing:
    // 1. Any non-raw format
    // 2. Any meaningful label (different from path)
    // 3. Any params configuration
    // 4. Or just assume complete if AI mode is on and basic structure exists
    
    const hasAnyProcessing = operation.fields.some(field => {
      const hasNonRawFormat = "format" in field && field.format && field.format !== "raw";
      const hasMeaningfulLabel = "label" in field && field.label && field.label.trim() !== "" && field.label !== field.path;
      const hasParams = "params" in field && field.params !== null;
      
      return hasNonRawFormat || hasMeaningfulLabel || hasParams;
    });
    
    // If no clear AI processing is detected, but we're in AI mode with intent and fields,
    // still auto-validate (maybe AI kept things simple)
    const shouldAutoValidate = hasAnyProcessing || operation.fields.length > 0;
    
    console.log(`Operation "${operation.intent}" auto-validation decision:`, {
      hasIntent: true,
      fieldCount: operation.fields.length,
      hasAnyProcessing,
      shouldAutoValidate,
      operation
    });
    
    return shouldAutoValidate;
  };

  const {
    mutateAsync: fetchERC7730Metadata,
    isPending: loading,
    error,
  } = useMutation({
    mutationFn: (input: string) =>
      generateFromERC7730({
        input,
        inputType,
        autoMode,
        chainId: parseInt(chainId),
      }),
  });

  // AI loading message cycling effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading && autoMode) {
      setAiLoadingMessage(AI_LOADING_MESSAGES[0]);
      setMessageIndex(0);
      
      interval = setInterval(() => {
        setMessageIndex((prev) => {
          const nextIndex = (prev + 1) % AI_LOADING_MESSAGES.length;
          setAiLoadingMessage(AI_LOADING_MESSAGES[nextIndex]);
          return nextIndex;
        });
      }, 2000); // Change message every 2 seconds
    } else {
      setAiLoadingMessage("");
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading, autoMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const erc7730 = await fetchERC7730Metadata(input);

    if (erc7730) {
      console.log(erc7730);
      useFunctionStore.persist.clearStorage();

      setErc7730(erc7730);

      // Auto-validate operations when AI mode is enabled and all required fields are filled
      if (autoMode && erc7730.display?.formats) {
        // Initialize the final store with metadata to avoid null errors
        // This ensures the final store is ready for auto-validated operations
        if (erc7730.metadata) {
          setMetadata(erc7730.metadata);
        }

        const operationNames = Object.keys(erc7730.display.formats);
        console.log("Processing operations for auto-validation:", operationNames);
        
        operationNames.forEach((operationName) => {
          const operation = erc7730.display!.formats[operationName];
          console.log(`Checking operation "${operationName}":`, operation);
          
          if (isOperationComplete(operation)) {
            console.log(`✅ Auto-validating operation: ${operationName}`);
            // Mark operation as validated - this will make it appear green in the UI
            setValidateOperation(operationName);
            // Now that finalErc7730 is initialized, we can safely save the operation data
            setOperationData(operationName, operation, operation);
          } else {
            console.log(`❌ Operation not complete: ${operationName}`);
          }
        });
      }

      router.push("/metadata");
    }
  };

  const onTabChange = (value: string) => {
    setInputType(value as "address" | "abi");
    setInput("");
  };

  return (
    <div className="w-full lg:w-[580px]">
      <form onSubmit={handleSubmit} className="mb-4 flex w-full flex-col gap-4">
        <Tabs defaultValue="address" onValueChange={onTabChange}>
          <TabsList className="mb-10 grid w-full grid-cols-2">
            <TabsTrigger value="address">Contract Address</TabsTrigger>
            <TabsTrigger value="abi">ABI</TabsTrigger>
          </TabsList>
          <TabsContent value="address">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eth-address">Contract Address</Label>
                <Input
                  id="contract-address"
                  placeholder="0x..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="abi">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="abi">ABI</Label>
                <Textarea
                  id="abi"
                  placeholder="Paste your ABI here..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chain-select">Chain</Label>
            <Select value={chainId} onValueChange={setChainId}>
              <SelectTrigger id="chain-select">
                <SelectValue placeholder="Select a chain" />
              </SelectTrigger>
              <SelectContent>
                {CHAIN_OPTIONS.map((chain) => (
                  <SelectItem key={chain.value} value={chain.value}>
                    {chain.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-mode"
              checked={autoMode}
              onCheckedChange={setAutoMode}
            />
            <Label htmlFor="auto-mode">Auto Mode (AI-powered)</Label>
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {loading && autoMode ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span>AI Working...</span>
            </div>
          ) : loading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span>Loading...</span>
            </div>
          ) : (
            "Submit"
          )}
        </Button>

        {/* AI Loading Messages */}
        {loading && autoMode && aiLoadingMessage && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 rounded-lg animate-in fade-in duration-300">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-blue-700 dark:text-blue-300 font-medium transition-all duration-500">
                {aiLoadingMessage}
              </span>
            </div>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              This might take a moment while the AI analyzes your contract...
            </div>
          </div>
        )}
      </form>

      <SampleAddressAbiCard setInput={setInput} inputType={inputType} />

      {error && (
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            {error instanceof ZodError
              ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                JSON.parse(error.message)[0].message
              : error.message}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CardErc7730;
