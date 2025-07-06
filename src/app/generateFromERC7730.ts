import { type paths } from "~/generate/api-types";

type GenerateBody =
  paths["/api/py/generateERC7730"]["post"]["requestBody"]["content"]["application/json"];
export type GenerateResponse =
  paths["/api/py/generateERC7730"]["post"]["responses"]["200"]["content"]["application/json"];

export default async function generateERC7730({
  input,
  inputType,
  autoMode,
  chainId,
}: {
  inputType: "address" | "abi";
  input: string;
  autoMode: boolean;
  chainId: number;
}): Promise<GenerateResponse | null> {
  const body = {
    address: inputType === "address" ? input : undefined,
    abi: inputType === "abi" ? input : undefined,
    auto: autoMode,
    chain_id: chainId,
  } as GenerateBody & { auto: boolean };

  const response = await fetch("/api/py/generateERC7730", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = (await response.json()) as {
      message: string;
    };
    throw new Error(`API Error: ${data.message}`);
  }

  const data = (await response.json()) as GenerateResponse;

  return data;
}
