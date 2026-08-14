import "dotenv/config";
import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  }
});

const jobs = new Map();
const generatedDir = path.join(__dirname, "public", "generated");
await fs.mkdir(generatedDir, { recursive: true });

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/generate", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const prompt = String(req.body.prompt || "").trim();
    if (!prompt) return res.status(400).json({ error: "اكتب وصفًا للفيديو أولًا." });
    if (prompt.length > 5000) return res.status(400).json({ error: "الوصف طويل جدًا." });

    const aspectRatio = req.body.aspectRatio === "9:16" ? "9:16" : "16:9";
    const config = {
      aspectRatio,
      numberOfVideos: 1,
      resolution: "720p"
    };

    const options = {
      model: "veo-3.1-fast-generate-preview",
      prompt,
      config
    };

    if (req.file) {
      options.image = {
        imageBytes: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype
      };
    }

    const operation = await ai.models.generateVideos(options);
    const jobId = crypto.randomUUID();

    jobs.set(jobId, {
      operationName: operation.name,
      status: "processing",
      createdAt: Date.now(),
      videoUrl: null,
      error: null
    });

    return res.json({
      jobId,
      status: "processing",
      message: "بدأ إنشاء الفيديو."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error?.message || "حدث خطأ أثناء بدء إنشاء الفيديو."
    });
  }
});

app.get("/api/jobs/:jobId", async (req, res) => {
  try {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: "المهمة غير موجودة." });

    if (job.status === "processing") {
      const operation = await ai.operations.getVideosOperation({
        operation: { name: job.operationName }
      });

      if (!operation.done) {
        return res.json({ status: "processing" });
      }

      if (operation.error) {
        job.status = "error";
        job.error = operation.error.message || "فشل إنشاء الفيديو.";
        return res.json({ status: "error", error: job.error });
      }

      const generated = operation.response?.generatedVideos?.[0]?.video;
      if (!generated) {
        job.status = "error";
        job.error = "لم يتم العثور على الفيديو الناتج.";
        return res.json({ status: "error", error: job.error });
      }

      const filename = `${req.params.jobId}.mp4`;
      const outputPath = path.join(generatedDir, filename);

      await ai.files.download({
        file: generated,
        downloadPath: outputPath
      });

      job.status = "completed";
      job.videoUrl = `/generated/${filename}`;
    }

    return res.json({
      status: job.status,
      videoUrl: job.videoUrl,
      error: job.error
    });
  } catch (error) {
    console.error(error);
    const job = jobs.get(req.params.jobId);
    if (job) {
      job.status = "error";
      job.error = error?.message || "حدث خطأ أثناء متابعة الفيديو.";
    }
    res.status(500).json({ status: "error", error: error?.message || "حدث خطأ." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`AI Video site running at http://localhost:${PORT}`);
});