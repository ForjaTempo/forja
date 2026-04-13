import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getPublicUrl, uploadFile } from "@/lib/s3";
import { getAuthenticatedAddress } from "@/lib/session";
import { checkRateLimit, MAX_FILE_SIZE, validateImageFile } from "@/lib/upload-validation";

type ImageType = "token" | "launch" | "avatar" | "banner";

const TYPE_CONFIG: Record<ImageType, { width: number; height: number; quality: number }> = {
	token: { width: 512, height: 512, quality: 85 },
	launch: { width: 512, height: 512, quality: 85 },
	avatar: { width: 256, height: 256, quality: 85 },
	banner: { width: 1500, height: 500, quality: 80 },
};

const TYPE_FOLDERS: Record<ImageType, string> = {
	token: "tokens",
	launch: "launches",
	avatar: "avatars",
	banner: "banners",
};

const VALID_TYPES = new Set<string>(["token", "launch", "avatar", "banner"]);

export async function POST(request: Request) {
	// 1. Auth check
	const address = await getAuthenticatedAddress();
	if (!address) {
		return Response.json({ ok: false, error: "auth_required" }, { status: 401 });
	}

	// 2. Rate limit
	const rateCheck = checkRateLimit(address);
	if (!rateCheck.allowed) {
		return Response.json({ ok: false, error: rateCheck.error }, { status: 429 });
	}

	// 3. Parse form data
	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return Response.json({ ok: false, error: "Invalid form data" }, { status: 400 });
	}

	const file = formData.get("file");
	const type = formData.get("type") as string;

	if (!file || !(file instanceof File)) {
		return Response.json({ ok: false, error: "No file provided" }, { status: 400 });
	}

	if (!type || !VALID_TYPES.has(type)) {
		return Response.json(
			{ ok: false, error: "Invalid type. Must be: token, launch, avatar, banner" },
			{ status: 400 },
		);
	}

	// 4. Size check before reading full buffer
	if (file.size > MAX_FILE_SIZE) {
		return Response.json({ ok: false, error: "File too large (max 5MB)" }, { status: 400 });
	}

	// 5. Read and validate
	const arrayBuffer = await file.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	const validation = validateImageFile(buffer);

	if (!validation.valid) {
		return Response.json({ ok: false, error: validation.error }, { status: 400 });
	}

	// 6. Process with sharp
	const imageType = type as ImageType;
	const config = TYPE_CONFIG[imageType];

	let processed: Buffer;
	try {
		processed = await sharp(buffer)
			.resize(config.width, config.height, { fit: "cover", position: "center" })
			.webp({ quality: config.quality })
			.toBuffer();
	} catch {
		return Response.json({ ok: false, error: "Failed to process image" }, { status: 400 });
	}

	// 7. Upload to MinIO
	const uuid = randomUUID();
	const key = `${TYPE_FOLDERS[imageType]}/${uuid}.webp`;

	try {
		await uploadFile(key, processed, "image/webp");
	} catch (err) {
		console.error("[upload] MinIO upload failed:", err);
		return Response.json({ ok: false, error: "Upload failed" }, { status: 500 });
	}

	// 8. Return URL
	const url = getPublicUrl(key);
	return Response.json({ ok: true, url });
}
