import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, memoriesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { GoogleGenAI } from "@google/genai";
import {
  CreateConversationBody,
  SendMessageBody,
} from "@workspace/api-zod";

const router = Router();

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

router.get("/chat/conversations", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, userId))
    .orderBy(desc(conversationsTable.createdAt));
  res.json(conversations);
});

router.post("/chat/conversations", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [conversation] = await db
    .insert(conversationsTable)
    .values({ userId, title: parsed.data.title })
    .returning();
  res.status(201).json(conversation);
});

router.get("/chat/conversations/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params["id"] as string);
  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);
  res.json({ ...conversation, messages: msgs });
});

router.delete("/chat/conversations/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params["id"] as string);
  await db.delete(messagesTable).where(eq(messagesTable.conversationId, id));
  const [deleted] = await db
    .delete(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.status(204).send();
});

router.post("/chat/conversations/:id/messages", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params["id"] as string);
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.userId, userId)));
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messagesTable).values({
    conversationId: id,
    role: "user",
    content: parsed.data.content,
  });

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, id))
    .orderBy(messagesTable.createdAt);

  const userMemories = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId))
    .orderBy(desc(memoriesTable.updatedAt))
    .limit(20);

  const memoryContext = userMemories.length > 0
    ? `\n\nHere are the user's stored memories to help answer:\n${userMemories
        .map((m) => `[${m.type.toUpperCase()} - ${m.category}] ${m.title}: ${m.content}`)
        .join("\n")}`
    : "";

  const systemPrompt = `You are a personal AI memory assistant. Your job is to help the user recall, summarize, and reflect on their stored memories, notes, ideas, and learnings. Always refer to their memories to give relevant, personalized answers. Be warm, insightful, and concise.${memoryContext}`;

  const chatMessages = history.map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";
  try {
    const ai = getAI();
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: chatMessages,
      config: {
        maxOutputTokens: 8192,
        systemInstruction: systemPrompt,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    await db.insert(messagesTable).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI error occurred" })}\n\n`);
    res.end();
  }
});

export default router;
