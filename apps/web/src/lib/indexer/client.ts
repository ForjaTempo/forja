import "server-only";
import { createPublicClient, http } from "viem";

const rpcUrl = process.env.INDEXER_RPC_URL || "https://rpc.moderato.tempo.xyz";

export const indexerClient = createPublicClient({
	transport: http(rpcUrl),
});
