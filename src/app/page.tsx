import { HydrateClient } from "~/trpc/server";
import CardErc7730 from "./address-abi-form";
import { ModeToggle } from "~/components/ui/theme-switcher";

export default async function Home() {
  return (
    <HydrateClient>
      <div className="container m-auto flex h-screen max-w-2xl items-center justify-center p-4">
        <div>
          <div className="mb-4 text-center">
            <h1 className="mb-6 items-center text-2xl font-bold">
              ERC7730 Json builder <span className="text-red-500">Alpha</span>
          </h1>
            <div className="mb-2 text-sm text-muted-foreground">
              Built for <strong>EthGlobal Newyork</strong> by <strong>0xshahnawaz</strong>
            </div>
          </div>
          
          <h1 className="mb-6 flex items-center justify-between text-2xl font-bold">
            <span></span>
            <ModeToggle />
          </h1>

          <CardErc7730 />
        </div>
      </div>
    </HydrateClient>
  );
}
