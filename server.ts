import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import * as line from "@line/bot-sdk";
import Database from "better-sqlite3";
import Fuse from "fuse.js";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const model = "gemini-2.0-flash-exp"; // Using Flash for speed and accuracy

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SQLite Database
const db = new Database("kosodsai.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    userId TEXT PRIMARY KEY,
    displayName TEXT,
    pictureUrl TEXT,
    firstJoined DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLogin DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    type TEXT, -- income/expense
    category TEXT,
    amount REAL,
    note TEXT,
    cowName TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    rawText TEXT,
    status TEXT DEFAULT 'pending' -- pending/confirmed
  );

  CREATE TABLE IF NOT EXISTS cows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    name TEXT,
    UNIQUE(userId, name)
  );

  CREATE TABLE IF NOT EXISTS farm_info (
    userId TEXT PRIMARY KEY,
    farmName TEXT,
    ownerName TEXT,
    location TEXT,
    contact TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    title TEXT,
    content TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ai_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT,
    tokensPrompt INTEGER,
    tokensResponse INTEGER,
    tokensTotal INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// LINE config
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: lineConfig.channelAccessToken,
});

// Load Keywords
let masterData: any = { categories: [], cows: [], synonyms: {} };
try {
  const data = fs.readFileSync("./keywords.json", "utf-8");
  masterData = JSON.parse(data);
} catch (err) {
  console.error("Error loading keywords.json", err);
}

// Setup Fuse.js for fuzzy matching
const allKeywords = masterData.categories.flatMap((cat: any) => 
  cat.keywords.map((kw: string) => ({ word: kw, categoryId: cat.id, type: cat.type, label: cat.label }))
);
const fuse = new Fuse(allKeywords, { keys: ["word"], threshold: 0.4 });

async function parseWithAI(text: string, userId: string) {
  const userCows = db.prepare("SELECT name FROM cows WHERE userId = ?").all(userId) as { name: string }[];
  const cowList = userCows.map(c => c.name).join(", ") || "ไม่มีข้อมูล (ให้ใช้ 'โดยรวม')";
  
  const systemInstruction = `คุณคือผู้ช่วยจัดการฟาร์มวัว หน้าที่ของคุณคือตีความข้อความรายรับ-รายจ่าย
  ข้อมูลหมวดหมู่ที่มี: ${JSON.stringify(masterData.categories)}
  รายชื่อวัวของผู้ใช้คนนี้: ${cowList}
  
  กฎการทำงาน:
  1. แยกข้อความออกเป็นรายการย่อยๆ (ถ้ามีหลายรายการ)
  2. ระบุประเภท (income/expense), หมวดหมู่ (label), จำนวนเงิน (amount), ชื่อวัว (cowName), และบันทึก (note)
  3. ถ้าไม่ระบุชื่อวัว ให้ใช้ "โดยรวม"
  4. ตอบกลับเป็น JSON Array เท่านั้น ตามโครงสร้างนี้:
  [{"type": "income/expense", "category": "ชื่อหมวดหมู่", "amount": 100, "cowName": "ชื่อวัว", "note": "ข้อความต้นฉบับ"}]`;

  try {
    const result = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text }] }],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const transactions = JSON.parse(result.text || "[]");
    const usage = result.usageMetadata;

    if (usage) {
      db.prepare(`
        INSERT INTO ai_usage (userId, tokensPrompt, tokensResponse, tokensTotal)
        VALUES (?, ?, ?, ?)
      `).run(userId, usage.promptTokenCount, usage.candidatesTokenCount, usage.totalTokenCount);
    }

    return { transactions, usage: usage?.totalTokenCount || 0 };
  } catch (err) {
    console.error("AI Parsing Error:", err);
    return { transactions: [], usage: 0 };
  }
}

function parseMessageLocal(text: string, userId: string) {
  const result: any = {
    type: "unknown",
    category: "ทั่วไป",
    amount: 0,
    cowName: "โดยรวม",
    note: text,
  };

  const amountMatch = text.match(/(\d+([.,]\d+)?)/);
  if (amountMatch) result.amount = parseFloat(amountMatch[0].replace(",", ""));

  const words = text.split(/\s+|ให้|กับ|ค่า|ของ/);
  
  for (const word of words) {
    if (!word || word.length < 2) continue;
    const matches = fuse.search(word);
    if (matches.length > 0) {
      const bestMatch = matches[0].item as any;
      result.type = bestMatch.type;
      result.category = bestMatch.label;
      break;
    }
  }

  const userCows = db.prepare("SELECT name FROM cows WHERE userId = ?").all(userId) as { name: string }[];
  if (userCows.length > 0) {
    const userCowFuse = new Fuse(userCows.map(c => c.name), { threshold: 0.3 });
    for (const word of words) {
      const matches = userCowFuse.search(word);
      if (matches.length > 0) {
        result.cowName = matches[0].item;
        break;
      }
    }
  }

  return result;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080;

  app.use(cors());

  // LINE Webhook (MUST be before express.json())
  app.post("/api/webhook", line.middleware(lineConfig), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
      .then((result) => res.json(result))
      .catch((err) => {
        console.error("Webhook Error:", err);
        res.status(500).end();
      });
  });

  app.use(express.json());

  // Auth/User API
  app.post("/api/user/sync", (req, res) => {
    const { userId, displayName, pictureUrl } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const user = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId) as any;
    
    if (user) {
      db.prepare("UPDATE users SET lastLogin = CURRENT_TIMESTAMP, displayName = ?, pictureUrl = ? WHERE userId = ?")
        .run(displayName, pictureUrl, userId);
    } else {
      db.prepare("INSERT INTO users (userId, displayName, pictureUrl) VALUES (?, ?, ?)")
        .run(userId, displayName, pictureUrl);
    }

    const updatedUser = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId);
    res.json(updatedUser);
  });

  // Transactions API
  app.get("/api/transactions", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const transactions = db.prepare("SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC").all(userId);
    res.json(transactions);
  });

  app.delete("/api/transactions/:id", (req, res) => {
    const { id } = req.params;
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const result = db.prepare("DELETE FROM transactions WHERE id = ? AND userId = ?").run(id, userId);
    if (result.changes === 0) {
      return res.status(403).json({ error: "Unauthorized or transaction not found" });
    }
    res.json({ success: true });
  });

  app.post("/api/transactions/update", (req, res) => {
    const { id, userId, category, amount, cowName, note } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const result = db.prepare(`
      UPDATE transactions 
      SET category = ?, amount = ?, cowName = ?, note = ?
      WHERE id = ? AND userId = ?
    `).run(category, amount, cowName, note, id, userId);
    
    if (result.changes === 0) {
      return res.status(403).json({ error: "Unauthorized or transaction not found" });
    }
    res.json({ success: true });
  });

  // Cow Management API
  app.get("/api/cows", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const cows = db.prepare("SELECT * FROM cows WHERE userId = ?").all(userId);
    res.json(cows);
  });

  app.post("/api/cows", (req, res) => {
    const { userId, name } = req.body;
    if (!userId || !name) return res.status(400).json({ error: "userId and name are required" });
    try {
      db.prepare("INSERT INTO cows (userId, name) VALUES (?, ?)").run(userId, name);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: "Cow already exists or database error" });
    }
  });

  app.delete("/api/cows/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM cows WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Farm Info API
  app.get("/api/farm", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const farm = db.prepare("SELECT * FROM farm_info WHERE userId = ?").get(userId);
    res.json(farm || { farmName: "", ownerName: "", location: "", contact: "" });
  });

  app.post("/api/farm", (req, res) => {
    const { userId, farmName, ownerName, location, contact } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    
    const existing = db.prepare("SELECT userId FROM farm_info WHERE userId = ?").get(userId);
    if (existing) {
      db.prepare("UPDATE farm_info SET farmName = ?, ownerName = ?, location = ?, contact = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?")
        .run(farmName, ownerName, location, contact, userId);
    } else {
      db.prepare("INSERT INTO farm_info (userId, farmName, ownerName, location, contact) VALUES (?, ?, ?, ?, ?)")
        .run(userId, farmName, ownerName, location, contact);
    }
    res.json({ success: true });
  });

  // Notes API
  app.get("/api/notes", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const notes = db.prepare("SELECT * FROM notes WHERE userId = ? ORDER BY date DESC").all(userId);
    res.json(notes);
  });

  app.post("/api/notes", (req, res) => {
    const { userId, title, content } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    db.prepare("INSERT INTO notes (userId, title, content) VALUES (?, ?, ?)").run(userId, title, content);
    res.json({ success: true });
  });

  app.delete("/api/notes/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // AI Usage API
  app.get("/api/ai-usage", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const usage = db.prepare("SELECT SUM(tokensTotal) as total FROM ai_usage WHERE userId = ?").get(userId) as { total: number };
    res.json({ total: usage.total || 0 });
  });

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

  const userId = event.source.userId;
  const userMessage = event.message.text;

  let transactions: any[] = [];
  let aiTokens = 0;
  let usedAI = false;

  // Stage 1 & 2: Try Local first
  const localParsed = parseMessageLocal(userMessage, userId);
  
  // If local parsing is too simple or message looks complex (contains multiple numbers or long text)
  const isComplex = (userMessage.match(/\d+/g) || []).length > 1 || userMessage.length > 20;

  if (isComplex || localParsed.type === "unknown") {
    // Stage 3: AI Inference
    const aiResult = await parseWithAI(userMessage, userId);
    transactions = aiResult.transactions;
    aiTokens = aiResult.usage;
    usedAI = true;
  } else {
    transactions = [localParsed];
  }

  // Save all transactions
  const savedIds: number[] = [];
  for (const t of transactions) {
    try {
      const result = db.prepare(`
        INSERT INTO transactions (userId, type, category, amount, note, cowName, rawText)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, t.type, t.category, t.amount, t.note || userMessage, t.cowName, userMessage);
      savedIds.push(result.lastInsertRowid as number);
    } catch (err) {
      console.error("Error saving transaction", err);
    }
  }

  // Sync user profile
  try {
    const profile = await client.getProfile(userId);
    const user = db.prepare("SELECT * FROM users WHERE userId = ?").get(userId) as any;
    if (user) {
      db.prepare("UPDATE users SET lastLogin = CURRENT_TIMESTAMP, displayName = ? WHERE userId = ?")
        .run(profile.displayName, userId);
    } else {
      db.prepare("INSERT INTO users (userId, displayName, pictureUrl) VALUES (?, ?, ?)")
        .run(userId, profile.displayName, profile.pictureUrl);
    }
  } catch (err) {
    console.error("Error fetching profile during webhook", err);
  }

  if (transactions.length === 0) {
    return client.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: "text", text: "ขออภัยครับ ผมไม่เข้าใจรายการนี้ รบกวนระบุรายละเอียดอีกครั้งครับ" } as any],
    });
  }

  const summary = transactions.map((t, i) => {
    const typeLabel = t.type === "income" ? "🟢 รับ" : "🔴 จ่าย";
    return `${i + 1}. ${t.category} (${t.cowName}): ${typeLabel} ฿${t.amount.toLocaleString()}`;
  }).join("\n");

  const liffId = process.env.VITE_LIFF_ID;
  const baseUrl = liffId ? `https://liff.line.me/${liffId}` : "";
  
  const editUrl = savedIds.length === 1 
    ? `${baseUrl}?tid=${savedIds[0]}`
    : `${baseUrl}?tab=transactions`;

  const flexMessage: any = {
    type: "flex",
    altText: "บันทึกรายการเรียบร้อยครับ",
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#F97316",
        contents: [
          {
            type: "text",
            text: "บันทึกเรียบร้อยครับ! 📝",
            weight: "bold",
            color: "#ffffff",
            size: "lg"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: summary,
            wrap: true,
            size: "sm",
            color: "#374151"
          },
          {
            type: "separator",
            margin: "lg"
          },
          {
            type: "text",
            text: usedAI ? `✨ ตีความโดย Gemini AI (${aiTokens} tokens)` : "",
            size: "xxs",
            color: "#9CA3AF",
            margin: "md"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#F97316",
            action: {
              type: "uri",
              label: savedIds.length === 1 ? "แก้ไขรายการนี้" : "ดูรายการทั้งหมด",
              uri: editUrl
            }
          }
        ]
      }
    }
  };

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [flexMessage],
  });
}

startServer();
