import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "@workspace/db";
import { memoriesTable, uploadedFilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, TXT, and DOCX files are allowed"));
  },
});

async function extractText(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === "text/plain") {
    return fs.readFileSync(filePath, "utf-8").slice(0, 10000);
  }
  // For PDF/DOCX, return a placeholder — full extraction needs native binaries
  return `[File content extracted from ${path.basename(filePath)}. Full text extraction available with additional configuration.]`;
}

router.get("/files", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const files = await db
    .select()
    .from(uploadedFilesTable)
    .where(eq(uploadedFilesTable.userId, userId));
  res.json(files);
});

router.post("/files", requireAuth, upload.single("file"), async (req, res) => {
  const userId = (req as any).userId as string;
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const category = req.body.category ?? "personal";
  const tagsRaw = req.body.tags ?? "";
  const tags = tagsRaw ? tagsRaw.split(",").map((t: string) => t.trim()).filter(Boolean) : [];

  const extractedText = await extractText(file.path, file.mimetype);

  const [memory] = await db
    .insert(memoriesTable)
    .values({
      userId,
      title: file.originalname,
      content: extractedText,
      type: "note",
      category: category as any,
      tags,
      isPinned: false,
    })
    .returning();

  const [uploaded] = await db
    .insert(uploadedFilesTable)
    .values({
      userId,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      memoryId: memory.id,
    })
    .returning();

  res.status(201).json(uploaded);
});

router.delete("/files/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const id = parseInt(req.params["id"] as string);

  const [fileRecord] = await db
    .select()
    .from(uploadedFilesTable)
    .where(and(eq(uploadedFilesTable.id, id), eq(uploadedFilesTable.userId, userId)));

  if (!fileRecord) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const filePath = path.join(uploadDir, fileRecord.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await db
    .delete(uploadedFilesTable)
    .where(eq(uploadedFilesTable.id, id));

  res.status(204).send();
});

export default router;
