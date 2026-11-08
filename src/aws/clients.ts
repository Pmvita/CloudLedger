import { S3Client } from "@aws-sdk/client-s3";
import type { Env } from "../config/env";

export const createS3Client = (env: Env): S3Client => {
  return new S3Client({
    region: env.AWS_REGION,
    ...(env.S3_ENDPOINT
      ? {
          endpoint: env.S3_ENDPOINT,
          forcePathStyle: env.S3_FORCE_PATH_STYLE ?? true,
        }
      : {}),
    ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });
};
