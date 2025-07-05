"use client";

import { Button } from "~/components/ui/button";
import * as React from "react";

import { ResponsiveDialog } from "~/components/ui/responsiveDialog";
import { useErc7730Store } from "~/store/erc7730Provider";
import { useToast } from "~/hooks/use-toast";
import { publishToKnowledgeGraph } from "~/lib/publish-kg";

export function ReviewJson() {
  const [open, setOpen] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [publishResult, setPublishResult] = React.useState<{
    success: boolean;
    entityId?: string;
    txHash?: string;
    error?: string;
  } | null>(null);
  const erc7730 = useErc7730Store((s) => s.finalErc7730);
  const { toast } = useToast();

  const handleCopyToClipboard = () => {
    void navigator.clipboard.writeText(JSON.stringify(erc7730, null, 2));
    toast({
      title: "JSON copied to clipboard!",
    });
  };

  const handlePublishToKnowledgeGraph = async () => {
    // Check if context has contract property (InputContractContext)
    if (!erc7730?.context || !('contract' in erc7730.context) || !erc7730.context.contract?.deployments?.[0]) {
      toast({
        title: "Error",
        description: "Contract deployment information is missing",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const deployment = erc7730.context.contract.deployments[0];
      const result = await publishToKnowledgeGraph({
        contractAddress: deployment.address,
        chainId: deployment.chainId.toString(),
        contractName: erc7730.metadata?.owner ?? `Contract ${deployment.address.slice(0, 8)}...`,
        erc7730Data: erc7730,
      });

      setPublishResult({
        success: true,
        entityId: result.entityId,
        txHash: result.txHash,
      });

      toast({
        title: "Success!",
        description: "Contract published to Knowledge Graph",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setPublishResult({
        success: false,
        error: errorMessage,
      });

      toast({
        title: "Error",
        description: `Failed to publish: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <ResponsiveDialog
      dialogTrigger={<Button variant="outline">Submit</Button>}
      dialogTitle="Submit your JSON"
      open={open}
      setOpen={setOpen}
    >
      <div className="space-y-4 p-4 md:p-0">
        <p className="text-sm text-gray-600">
          Before submitting, please review your JSON. If everything looks good,
          copy it to your clipboard and create a pull request in the following
          repository:
          <a
            href="https://github.com/LedgerHQ/clear-signing-erc7730-registry"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            LedgerHQ Clear Signing ERC7730 Registry
          </a>
          .
        </p>
        <pre className="max-h-64 overflow-auto rounded border bg-gray-100 p-4 text-sm dark:text-black">
          {JSON.stringify(erc7730, null, 2)}
        </pre>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleCopyToClipboard}>Copy JSON to Clipboard</Button>
          <Button 
            onClick={handlePublishToKnowledgeGraph} 
            disabled={isPublishing}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isPublishing ? "Publishing..." : "Publish to Knowledge Graph"}
          </Button>
        </div>
        
        {publishResult && (
          <div className={`mt-4 p-4 rounded border ${
            publishResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}>
            {publishResult.success ? (
              <div className="space-y-2">
                <p className="text-green-800 font-medium">✅ Successfully published to Knowledge Graph!</p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Published file:</span>{" "}
                    <a
                      href={`https://testnet.geobrowser.io/space/10ea8392-1c7e-4866-8559-eeea7b4722ef/${publishResult.entityId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View on GeoBrowser
                    </a>
                  </p>
                  <p>
                    <span className="font-medium">Transaction:</span>{" "}
                    <a
                      href={`https://explorer-geo-test-zc16z3tcvf.t.conduit.xyz/tx/${publishResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View on Explorer
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-red-800 font-medium">❌ Failed to publish</p>
                <p className="text-red-700 text-sm mt-1">{publishResult.error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}

export default ReviewJson;
