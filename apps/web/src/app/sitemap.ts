import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: APP_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
		{
			url: `${APP_URL}/create`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.9,
		},
		{
			url: `${APP_URL}/multisend`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.9,
		},
		{
			url: `${APP_URL}/lock`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.9,
		},
		{
			url: `${APP_URL}/claim/create`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.9,
		},
		{
			url: `${APP_URL}/tokens`,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.9,
		},
		{
			url: `${APP_URL}/dashboard`,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.8,
		},
	];
}
