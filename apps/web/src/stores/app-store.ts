import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Transaction {
	hash: string;
	type: "create" | "multisend" | "lock";
	description: string;
	timestamp: number;
}

interface AppState {
	recentTransactions: Transaction[];
	addTransaction: (tx: Transaction) => void;
	clearTransactions: () => void;
}

export const useAppStore = create<AppState>()(
	persist(
		(set) => ({
			recentTransactions: [],
			addTransaction: (tx) =>
				set((state) => ({
					recentTransactions: [tx, ...state.recentTransactions].slice(0, 50),
				})),
			clearTransactions: () => set({ recentTransactions: [] }),
		}),
		{
			name: "forja-app",
		},
	),
);
