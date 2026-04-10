import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { type Address, getAddress, isAddress } from "viem";

export interface MerkleRecipient {
	address: Address;
	amount: bigint;
}

export interface MerkleLeaf {
	index: number;
	address: Address;
	amount: bigint;
	proof: `0x${string}`[];
}

export interface MerkleResult {
	root: `0x${string}`;
	total: bigint;
	leaves: MerkleLeaf[];
}

/**
 * Slug rules: 3-40 chars, lowercase a-z 0-9, hyphens allowed in the middle.
 * Must start and end with a letter or digit.
 */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
	return typeof slug === "string" && SLUG_RE.test(slug);
}

export function normalizeSlug(slug: string): string {
	return slug.trim().toLowerCase();
}

/**
 * Build a StandardMerkleTree compatible with OpenZeppelin's `MerkleProof.verify`
 * for ABI-encoded `(address, uint256)` leaves with the double-keccak256 leaf hash.
 *
 * Recipients are deduped by lowercase address (amounts are summed) before tree construction.
 * Throws if the resulting recipient list is empty or if any address is invalid.
 */
export function buildMerkleTree(recipients: readonly MerkleRecipient[]): MerkleResult {
	if (!Array.isArray(recipients) || recipients.length === 0) {
		throw new Error("buildMerkleTree: recipients must be a non-empty array");
	}

	const dedupe = new Map<string, bigint>();
	for (const r of recipients) {
		if (!r || typeof r.address !== "string" || !isAddress(r.address)) {
			throw new Error(`buildMerkleTree: invalid address: ${r?.address}`);
		}
		if (typeof r.amount !== "bigint" || r.amount <= 0n) {
			throw new Error(`buildMerkleTree: invalid amount for ${r.address}`);
		}
		const key = r.address.toLowerCase();
		dedupe.set(key, (dedupe.get(key) ?? 0n) + r.amount);
	}

	// Stable order: by lowercase address ascending
	const ordered = Array.from(dedupe.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

	const values: [string, string][] = ordered.map(([addr, amt]) => [
		getAddress(addr),
		amt.toString(),
	]);

	const tree = StandardMerkleTree.of(values, ["address", "uint256"]);

	const leaves: MerkleLeaf[] = [];
	let total = 0n;
	for (const [i, value] of tree.entries()) {
		const [addrStr, amtStr] = value as [string, string];
		const proof = tree.getProof(i) as `0x${string}`[];
		const amount = BigInt(amtStr);
		total += amount;
		leaves.push({
			index: i,
			address: getAddress(addrStr),
			amount,
			proof,
		});
	}

	return {
		root: tree.root as `0x${string}`,
		total,
		leaves,
	};
}
