export const LAUNCH_TAGS = ["DeFi", "Gaming", "Meme", "Utility", "Social", "NFT"] as const;
export type LaunchTag = (typeof LAUNCH_TAGS)[number];
export const LAUNCH_TAG_SET: ReadonlySet<string> = new Set(LAUNCH_TAGS);
export const MAX_LAUNCH_TAGS = 3;
