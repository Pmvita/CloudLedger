process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgres://cloudledger:cloudledger@localhost:5432/cloudledger";
process.env.JWT_SECRET ??= "test-jwt-secret-16";
process.env.AWS_REGION ??= "us-east-1";
process.env.S3_BUCKET_NAME ??= "cloudledger-receipts-test";
process.env.PORT ??= "4000";
