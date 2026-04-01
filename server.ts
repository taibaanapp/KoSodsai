import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import * as line from "@line/bot-sdk";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// LINE config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

// Validate config before creating client
if (!lineConfig.channelAccessToken) {
  console.warn("WARNING: LINE_CHANNEL_ACCESS_TOKEN is missing. Messaging API will not work.");
}
if (!lineConfig.channelSecret) {
  console.warn("WARNING: LINE_CHANNEL_SECRET is missing. Webhook signature verification will fail.");
}

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: lineConfig.channelAccessToken,
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080; // Changed to 8080 for Railway default

  app.use(cors());

  // Root route for health check
  app.get("/", (req, res) => {
    res.send("<h1>KoSodsai Server is Online!</h1><p>Webhook is at /api/webhook</p>");
  });

  // LINE Webhook (must be before express.json() for signature verification)
  app.get("/api/webhook", (req, res) => {
    res.send("LINE Webhook endpoint is active. Please use POST for actual webhooks.");
  });

  // Safe Webhook Handler
  app.post("/api/webhook", (req, res, next) => {
    console.log("Incoming POST request to /api/webhook");
    if (!lineConfig.channelSecret) {
      console.error("CRITICAL: LINE_CHANNEL_SECRET is missing. Cannot process webhook.");
      return res.status(500).send("Server Configuration Error");
    }
    next();
  }, (req, res, next) => {
    // Only apply line.middleware if secret is present to avoid crash
    return line.middleware(lineConfig)(req, res, next);
  }, (req, res) => {
    console.log("Webhook signature verified, processing events...");
    console.log("Body:", JSON.stringify(req.body, null, 2));
    Promise.all(req.body.events.map(handleEvent))
      .then((result) => res.json(result))
      .catch((err) => {
        console.error("Webhook Error:", err);
        res.status(500).end();
      });
  });

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "KoSodsai API is running" });
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

  console.log(`Replying to ${event.replyToken} with: ${replyText}`);

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: "text", text: replyText } as any],
  });
}

startServer();
