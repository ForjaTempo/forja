import { getFile } from "@/lib/s3";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
	const { path } = await params;
	const key = path.join("/");

	// Basic path validation — only allow expected patterns
	if (!key.match(/^(tokens|launches|avatars|banners)\/[a-f0-9-]+\.webp$/)) {
		return new Response("Not Found", { status: 404 });
	}

	const file = await getFile(key);
	if (!file) {
		return new Response("Not Found", { status: 404 });
	}

	return new Response(file.body, {
		headers: {
			"Content-Type": file.contentType,
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
