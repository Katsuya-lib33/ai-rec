// Vercel Serverless Function
// This function generates a presigned URL for uploading a file to an S3-compatible object storage.

// IMPORTANT: You must set the following environment variables in your Vercel project settings:
// - R2_ACCOUNT_ID
// - R2_ACCESS_KEY_ID
// - R2_SECRET_ACCESS_KEY
// - R2_BUCKET_NAME

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { filename, contentType } = req.query;
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'Missing filename or contentType query parameters.' });
    }

    // Generate a unique key for the file
    const randomBytes = crypto.randomBytes(16).toString("hex");
    const key = `${randomBytes}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(R2, command, { expiresIn: 3600 }); // URL expires in 1 hour

    res.status(200).json({ url, key });

  } catch (error) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL." });
  }
};
