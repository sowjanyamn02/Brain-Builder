import { Router } from "express";
import { db } from "@workspace/db";
import { memoriesTable, uploadedFilesTable, conversationsTable } from "@workspace/db";
import { eq, desc, gte } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

router.get("/stats/dashboard", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const memories = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId));

  const files = await db
    .select()
    .from(uploadedFilesTable)
    .where(eq(uploadedFilesTable.userId, userId));

  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, userId));

  const memoriesByType: Record<string, number> = {};
  const memoriesByCategory: Record<string, number> = {};
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let recentMemoriesCount = 0;

  for (const m of memories) {
    memoriesByType[m.type] = (memoriesByType[m.type] ?? 0) + 1;
    memoriesByCategory[m.category] = (memoriesByCategory[m.category] ?? 0) + 1;
    if (m.createdAt > sevenDaysAgo) recentMemoriesCount++;
  }

  res.json({
    totalMemories: memories.length,
    totalFiles: files.length,
    totalConversations: conversations.length,
    memoriesByType,
    memoriesByCategory,
    recentMemoriesCount,
  });
});

router.get("/stats/activity", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const recentMemories = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId))
    .orderBy(desc(memoriesTable.createdAt))
    .limit(5);

  const recentFiles = await db
    .select()
    .from(uploadedFilesTable)
    .where(eq(uploadedFilesTable.userId, userId))
    .orderBy(desc(uploadedFilesTable.createdAt))
    .limit(3);

  const recentConversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, userId))
    .orderBy(desc(conversationsTable.createdAt))
    .limit(3);

  const activity = [
    ...recentMemories.map((m) => ({
      id: `memory-${m.id}`,
      type: "memory_created" as const,
      title: m.title,
      description: `Added a new ${m.type} in ${m.category}`,
      createdAt: m.createdAt.toISOString(),
    })),
    ...recentFiles.map((f) => ({
      id: `file-${f.id}`,
      type: "file_uploaded" as const,
      title: f.originalName,
      description: `Uploaded ${f.mimeType.split("/")[1]?.toUpperCase() ?? "file"}`,
      createdAt: f.createdAt.toISOString(),
    })),
    ...recentConversations.map((c) => ({
      id: `chat-${c.id}`,
      type: "chat_started" as const,
      title: c.title,
      description: "Started a new chat session",
      createdAt: c.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(activity);
});

export default router;
