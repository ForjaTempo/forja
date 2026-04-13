import "server-only";
import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";

function createS3Client() {
	const endpoint = process.env.MINIO_ENDPOINT;
	const accessKey = process.env.MINIO_ACCESS_KEY;
	const secretKey = process.env.MINIO_SECRET_KEY;

	if (!endpoint || !accessKey || !secretKey) {
		throw new Error("MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY are required");
	}

	return new S3Client({
		endpoint,
		region: "us-east-1",
		credentials: {
			accessKeyId: accessKey,
			secretAccessKey: secretKey,
		},
		forcePathStyle: true,
	});
}

const globalForS3 = globalThis as unknown as { _forjaS3?: S3Client };

function getS3() {
	if (!globalForS3._forjaS3) {
		globalForS3._forjaS3 = createS3Client();
	}
	return globalForS3._forjaS3;
}

function getBucket(): string {
	return process.env.MINIO_BUCKET || "images";
}

export async function uploadFile(key: string, buffer: Buffer, contentType: string): Promise<void> {
	await getS3().send(
		new PutObjectCommand({
			Bucket: getBucket(),
			Key: key,
			Body: buffer,
			ContentType: contentType,
		}),
	);
}

export async function deleteFile(key: string): Promise<void> {
	await getS3().send(
		new DeleteObjectCommand({
			Bucket: getBucket(),
			Key: key,
		}),
	);
}

export async function getFile(
	key: string,
): Promise<{ body: ReadableStream; contentType: string } | null> {
	try {
		const response = await getS3().send(
			new GetObjectCommand({
				Bucket: getBucket(),
				Key: key,
			}),
		);

		if (!response.Body) return null;

		return {
			body: response.Body.transformToWebStream(),
			contentType: response.ContentType || "image/webp",
		};
	} catch (err: unknown) {
		if (err && typeof err === "object" && "name" in err && err.name === "NoSuchKey") {
			return null;
		}
		throw err;
	}
}

export function getPublicUrl(key: string): string {
	return `/api/images/${key}`;
}
