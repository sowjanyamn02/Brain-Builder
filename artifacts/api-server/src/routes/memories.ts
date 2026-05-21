import { Router } from "express";
import { db } from "@workspace/db";
import { memoriesTable } from "@workspace/db";
import { eq, and, desc, arrayContains, ilike, or } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import {
  CreateMemoryBody,
  UpdateMemoryBody,
  ListMemoriesQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/memories", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = ListMemoriesQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  let query = db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId))
    .orderBy(desc(memoriesTable.updatedAt))
    .$dynamic();

  const conditions = [eq(memoriesTable.userId, userId)];

  if (params.type) {
    conditions.push(eq(memoriesTable.type, params.type as any));
  }
  if (params.category) {
    conditions.push(eq(memoriesTable.category, params.category as any));
  }
  if (params.q) {
    conditions.push(
      or(
        ilike(memoriesTable.title, `%${params.q}%`),
        ilike(memoriesTable.content, `%${params.q}%`),
      )!,
    );
  }

  const memories = await db
    .select()
    .from(memoriesTable)
    .where(and(...conditions))
    .orderBy(desc(memoriesTable.updatedAt));

  res.json(memories);
});

router.post("/memories", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = CreateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { title, content, type, category, tags, isPinned } = parsed.data;
  const [memory] = await db
    .insert(memoriesTable)
    .values({
      userId,
      title,
      content,
      type: type as any,
      category: category as any,
      tags: tags ?? [],
      isPinned: isPinned ?? false,
    })
    .returning();
  res.status(201).json(memory);
});

router.get("/memories/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params["id"] as string);
  const [memory] = await db
    .select()
    .from(memoriesTable)
    .where(and(eq(memoriesTable.id, id), eq(memoriesTable.userId, userId)));
  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }
  res.json(memory);
});

router.patch("/memories/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params["id"] as string);
  const parsed = UpdateMemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const updates: any = { ...parsed.data, updatedAt: new Date() };
  const [memory] = await db
    .update(memoriesTable)
    .set(updates)
    .where(and(eq(memoriesTable.id, id), eq(memoriesTable.userId, userId)))
    .returning();
  if (!memory) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }
  res.json(memory);
});

router.delete("/memories/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params["id"] as string);
  const [deleted] = await db
    .delete(memoriesTable)
    .where(and(eq(memoriesTable.id, id), eq(memoriesTable.userId, userId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Memory not found" });
    return;
  }
  res.status(204).send();
});

export default router;
