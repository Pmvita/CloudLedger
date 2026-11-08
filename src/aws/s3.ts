import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Client } from "@aws-sdk/client-s3";

const RECEIPTS_PREFIX = "receipts/";

export const receiptObjectKey = (expenseId: string, fileName: string): string => {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${RECEIPTS_PREFIX}${expenseId}/${safeName}`;
};

export const putReceiptObject = async (
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> => {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
};

export const getReceiptObject = async (
  client: S3Client,
  bucket: string,
  key: string,
): Promise<void> => {
  await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
};


export const getReceiptDownloadUrl = async (
  client: S3Client,
  bucket: string,
  key: string,
  expiresInSeconds = 300,
): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
};

export const deleteReceiptObject = async (
  client: S3Client,
  bucket: string,
  key: string,
): Promise<void> => {
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
};
