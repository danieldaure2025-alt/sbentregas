import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";

const s3Client = createS3Client();

/**
 * Generate a presigned URL for uploading a file
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic: boolean = false
): Promise<{ uploadUrl: string; cloud_storage_path: string }> {
  const { bucketName, folderPrefix } = getBucketConfig();
  
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${timestamp}-${safeName}`
    : `${folderPrefix}uploads/${timestamp}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
    ContentDisposition: isPublic ? "attachment" : undefined,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { uploadUrl, cloud_storage_path };
}

/**
 * Get a URL to access a file
 */
export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean = false
): Promise<string> {
  const { bucketName, region } = getBucketConfig();

  if (isPublic) {
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: "attachment",
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

/**
 * Delete a file from S3
 */
export async function deleteFile(cloud_storage_path: string): Promise<void> {
  const { bucketName } = getBucketConfig();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
  });

  await s3Client.send(command);
}
