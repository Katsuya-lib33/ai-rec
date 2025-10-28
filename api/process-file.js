// Vercel Serverless Function
// This function is triggered after a file is uploaded. It retrieves the file from storage,
// sends it to OpenAI Whisper for transcription, and then sends the transcript to GPT for summarization.

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { OpenAI } = require("openai");
const { toFile } = require("openai/uploads");

// Initialize S3 Client for Cloudflare R2
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

// Initialize OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.SUMMARIZATION_API_KEY, // Using one key for both
});

// --- Real AI Functions ---

async function transcribeAudio(fileBuffer, originalFilename) {
  console.log("Sending to OpenAI Whisper for transcription...");
  
  // Convert buffer to a file-like object for the OpenAI SDK
  const file = await toFile(fileBuffer, originalFilename);

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: "whisper-1",
  });

  console.log("Transcription received from Whisper.");
  return transcription.text;
}

async function summarizeText(transcript) {
  console.log("Sending transcript to GPT-4o for summarization...");
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a highly skilled assistant that summarizes texts. Please provide a concise summary of the following transcript, highlighting the key points and any action items. Format the output in Japanese."
      },
      {
        role: "user",
        content: transcript
      }
    ],
    temperature: 0.5,
  });
  console.log("Summary received from GPT-4o.");
  return response.choices[0].message.content;
}

// --------------------------------

// Helper function to convert a readable stream to a buffer
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });

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
    console.log(`Retrieving file from R2 with key: ${key}`);
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const { Body, Metadata } = await R2.send(command);
    const fileBuffer = await streamToBuffer(Body);
    
    // Extract original filename from the key (e.g., "randombytes-original-filename.mp3")
    const originalFilename = key.split('-').slice(1).join('-');
    console.log(`Original filename extracted: ${originalFilename}`);

    // Note: If the file is a video, you'd need a step here to extract audio first.
    // This would require a library like ffmpeg, which can be complex on serverless.
    // For now, we assume the uploaded file is a compatible audio format.
    
    // 2. Transcribe the audio
    const transcription = await transcribeAudio(fileBuffer, originalFilename);

    // 3. Summarize the transcript
    const summary = await summarizeText(transcription);

    // 4. Return the results
    res.status(200).json({ transcription, summary });

  } catch (error) {
    console.error("Error processing file:", error);
    // Provide more detailed error information in the response for debugging
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    res.status(500).json({ error: "Failed to process file.", details: errorMessage });
  }
};
