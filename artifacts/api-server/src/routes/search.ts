import { Router } from "express";
import { db } from "@workspace/db";
import { memoriesTable } from "@workspace/db";
import { eq, or, ilike, desc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { GoogleGenAI } from "@google/genai";
import { SearchMemoriesBody } from "@workspace/api-zod";

const router = Router();

router.post("/search", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const parsed = SearchMemoriesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { query, limit = 10 } = parsed.data;

  const allMemories = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId))
    .orderBy(desc(memoriesTable.updatedAt));

  if (allMemories.length === 0) {
    res.json({ results: [], query });
    return;
  }

  // Use Gemini to rank memories by relevance to the query
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const memorySummaries = allMemories
      .map((m, i) => `[${i}] ${m.title}: ${m.content.slice(0, 200)}`)
      .join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Given the query: "${query}"\n\nReturn a JSON array of the most relevant memory indices (0-based) sorted by relevance, max ${limit} items. Only return the JSON array, nothing else.\n\nMemories:\n${memorySummaries}`,
            },
          ],
        },
      ],
      config: { maxOutputTokens: 1024 },
    });

    const text = response.text ?? "[]";
    const jsonMatch = text.match(/\[[\d,\s]*\]/);
    const indices: number[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    const results = indices
      .slice(0, limit)
      .filter((i) => i >= 0 && i < allMemories.length)
      .map((i, rank) => ({
        memory: allMemories[i],
        score: 1 - rank / (indices.length || 1),
      }));

    res.json({ results, query });
  } catch {
    // Fallback: simple text search
    const lowerQuery = query.toLowerCase();
    const results = allMemories
      .filter(
        (m) =>
          m.title.toLowerCase().includes(lowerQuery) ||
          m.content.toLowerCase().includes(lowerQuery),
      )
      .slice(0, limit)
      .map((m, i, arr) => ({ memory: m, score: 1 - i / arr.length }));
    res.json({ results, query });
  }
});

export default router;
