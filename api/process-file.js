// Vercel Serverless Function
// This function is triggered after a file is uploaded. It retrieves the file from storage,
// sends it to a transcription service, and then sends the transcript to a summarization service.

// IMPORTANT: You must set the following environment variables in your Vercel project settings:
// - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
// - TRANSCRIPTION_API_KEY, SUMMARIZATION_API_KEY (replace with your actual AI service keys)

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
// In a real implementation, you would use actual AI service SDKs/APIs.
// For this placeholder, we will simulate the AI processing.

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

// --- Placeholder AI Functions ---
// In a real app, you would replace these with actual API calls to services
// like AssemblyAI, Deepgram, OpenAI, Anthropic, etc.

async function transcribeAudio(fileBuffer) {
  console.log("Simulating transcription for a file of size:", fileBuffer.length);
  // Simulate network delay and processing time
  await new Promise(resolve => setTimeout(resolve, 3000)); 
  return "これは、アップロードされた音声ファイルの文字起こし結果のサンプルです。実際のアプリケーションでは、ここにAIサービスからの完全なトランスクリプトが入ります。";
}

async function summarizeText(transcript) {
  console.log("Simulating summarization for a transcript of length:", transcript.length);
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  return "これは要約結果のサンプルです。AIが文字起こし内容を分析し、主要なポイントをまとめています。";
}
// --------------------------------

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Missing file key in request body.' });
    }

    // 1. Get the file from R2
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const { Body } = await R2.send(command);
    
    // Helper function to convert stream to buffer
    const streamToBuffer = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
      });

    const fileBuffer = await streamToBuffer(Body);

    // 2. Transcribe the audio
    // Note: If the file is a video, you'd need a step here to extract audio first.
    // This would require a library like ffmpeg, which can be complex on serverless.
    // For now, we assume the uploaded file is audio.
    const transcription = await transcribeAudio(fileBuffer);

    // 3. Summarize the transcript
    const summary = await summarizeText(transcription);

    // 4. Return the results
    res.status(200).json({ transcription, summary });

  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Failed to process file." });
  }
};
