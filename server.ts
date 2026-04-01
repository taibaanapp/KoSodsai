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

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: lineConfig.channelAccessToken,
});

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
