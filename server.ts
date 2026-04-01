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

// Initialize Firebase Admin
const firebaseConfigFile = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(firebaseConfigFile)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
}
const db = admin.firestore();

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
  const PORT = 3000;

  app.use(cors());

  // LINE Webhook (must be before express.json() for signature verification)
  app.post("/api/webhook", line.middleware(lineConfig), (req, res) => {
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
  const lineUserId = event.source.userId;
  let replyText = "";

  // Simple command parsing or AI processing
  if (userMessage.includes("บันทึก")) {
    try {
      const prompt = `
        คุณคือผู้ช่วยจัดการฟาร์มวัว "โคสดใส" 
        ผู้ใช้ส่งข้อความมาว่า: "${userMessage}"
        ช่วยสกัดข้อมูลออกมาเป็น JSON เท่านั้น โดยมีฟิลด์ดังนี้:
        {
          "type": "income" หรือ "expense",
          "category": "หมวดหมู่สั้นๆ",
          "amount": ตัวเลขเท่านั้น,
          "description": "คำอธิบายเพิ่มเติม"
        }
        ถ้าสกัดไม่ได้ ให้ตอบเป็น JSON ที่มีฟิลด์ "error": "ข้อความแนะนำการใช้งาน"
      `;
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
      });
      const aiResponse = response.text;
      
      try {
        // Find JSON in response (Gemini might wrap it in markdown)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          
          if (data.error) {
            replyText = data.error;
          } else {
            // Save to Firestore
            await db.collection('transactions').add({
              userId: lineUserId, // Use LINE ID as userId for now
              type: data.type,
              category: data.category,
              amount: data.amount,
              description: data.description,
              date: new Date().toISOString().split('T')[0],
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            replyText = `✅ บันทึกสำเร็จ!\n- ประเภท: ${data.type === 'income' ? 'รายรับ' : 'รายจ่าย'}\n- หมวดหมู่: ${data.category}\n- จำนวน: ฿${data.amount.toLocaleString()}\n- รายละเอียด: ${data.description}`;
          }
        } else {
          replyText = "ขออภัยครับ ผมไม่เข้าใจคำสั่งบันทึกนี้ ลองพิมพ์ใหม่ เช่น 'บันทึกรายจ่าย ค่าอาหาร 500'";
        }
      } catch (e) {
        replyText = "ขออภัยครับ ระบบประมวลผลข้อมูลผิดพลาด ลองใหม่อีกครั้งนะครับ";
      }
    } catch (error) {
      replyText = "ขออภัยครับ ระบบ AI ขัดข้อง ลองใหม่อีกครั้งนะครับ";
    }
  } else if (userMessage === "สรุป") {
    try {
      const snapshot = await db.collection('transactions')
        .where('userId', '==', lineUserId)
        .get();
      
      let income = 0;
      let expense = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type === 'income') income += data.amount;
        else expense += data.amount;
      });
      
      replyText = `📊 สรุปภาพรวมฟาร์มของคุณ\n------------------\n💰 รายรับรวม: ฿${income.toLocaleString()}\n💸 รายจ่ายรวม: ฿${expense.toLocaleString()}\n⚖️ คงเหลือสุทธิ: ฿${(income - expense).toLocaleString()}`;
    } catch (error) {
      replyText = "ขออภัยครับ ไม่สามารถดึงข้อมูลสรุปได้ในขณะนี้";
    }
  } else {
    replyText = `สวัสดีครับ ผมคือผู้ช่วย "โคสดใส" 🐮\nคุณสามารถพิมพ์สั่งงานได้เลย เช่น:\n- "บันทึกรายจ่าย ค่าอาหาร 500"\n- "บันทึกรายรับ ขายวัว 35000"\n- "สรุป"`;
  }

  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [{ type: "text", text: replyText } as any],
  });
}

startServer();
