import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import * as line from "@line/bot-sdk";
import { GoogleGenAI } from "@google/genai";
import * as admin from "firebase-admin";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin (Optional)
const firebaseConfigFile = path.join(process.cwd(), 'firebase-applet-config.json');
let db: any = null;

if (fs.existsSync(firebaseConfigFile)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    db = admin.firestore();
    console.log("Firebase Admin initialized successfully");
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err);
  }
} else {
  console.log("Firebase config not found, skipping Firestore initialization");
}

// LINE config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: lineConfig.channelAccessToken,
});

// Gemini AI config
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());

  // LINE Webhook (must be before express.json() for signature verification)
  app.get("/api/webhook", (req, res) => {
    res.send("LINE Webhook endpoint is active. Please use POST for actual webhooks.");
  });

  app.post("/api/webhook", (req, res, next) => {
    // Log for debugging
    console.log("Incoming POST request to /api/webhook");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    next();
  }, line.middleware(lineConfig), (req, res) => {
    console.log("Webhook signature verified, processing events...");
    console.log("Body:", JSON.stringify(req.body, null, 2));
    Promise.all(req.body.events.map(handleEvent))
      .then((result) => res.json(result))
      .catch((err) => {
        console.error(err);
        res.status(500).end();
      });
  });

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "KoSodsai API is running" });
  });

  // AI processing endpoint
  app.post("/api/ai/process", async (req, res) => {
    const { message } = req.body;
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: message }] }],
      });
      res.json({ result: response.text });
    } catch (error) {
      res.status(500).json({ error: "AI processing failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

async function handleEvent(event: any) {
  if (event.type !== "message" || event.message.type !== "text") {
    return Promise.resolve(null);
  }

  const userMessage = event.message.text;
  const replyText = `คุณส่งข้อความว่า: "${userMessage}"`;

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: "text", text: replyText } as any],
  });
}

startServer();
