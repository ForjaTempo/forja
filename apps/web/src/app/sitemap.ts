import type { MetadataRoute } from "next";
import { APP_URL, hasLaunchpad } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
	const routes: MetadataRoute.Sitemap = [
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

	if (hasLaunchpad) {
		routes.push(
			{
				url: `${APP_URL}/launch`,
				lastModified: new Date(),
				changeFrequency: "hourly",
				priority: 0.9,
			},
			{
				url: `${APP_URL}/launch/create`,
				lastModified: new Date(),
				changeFrequency: "weekly",
				priority: 0.8,
			},
		);
	}

	return routes;
}
