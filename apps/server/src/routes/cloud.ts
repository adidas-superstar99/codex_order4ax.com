import { Router } from "express";
import type { Request, Response } from "express";
import {
  createCloudFile,
  createCloudNote,
  deleteCloudFile,
  deleteCloudNote,
  getCloudFileDownload,
  getMaxCloudFileSize,
  listCloudFiles,
  listCloudNotes,
  updateCloudNote
} from "../services/cloudService.js";

export const cloudRouter = Router();

cloudRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const [notes, files] = await Promise.all([listCloudNotes(), listCloudFiles()]);
    res.json({ notes, files, limits: { maxFileSizeBytes: getMaxCloudFileSize() } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

cloudRouter.post("/notes", async (req: Request, res: Response) => {
  try {
    const note = await createCloudNote(req.body);
    res.status(201).json(note);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ message });
  }
});

cloudRouter.patch("/notes/:id", async (req: Request, res: Response) => {
  try {
    const note = await updateCloudNote(req.params.id, req.body);
    if (!note) {
      res.status(404).json({ message: "CLOUD_NOTE_NOT_FOUND" });
      return;
    }
    res.json(note);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ message });
  }
});

cloudRouter.delete("/notes/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteCloudNote(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: "CLOUD_NOTE_NOT_FOUND" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

cloudRouter.post("/files", async (req: Request, res: Response) => {
  try {
    const file = await createCloudFile(req.body);
    res.status(201).json(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(400).json({ message });
  }
});

cloudRouter.get("/files/:id/download", async (req: Request, res: Response) => {
  try {
    const file = await getCloudFileDownload(req.params.id);
    if (!file) {
      res.status(404).json({ message: "CLOUD_FILE_NOT_FOUND" });
      return;
    }

    res.header("Content-Type", file.metadata.mimeType);
    res.header("Content-Length", String(file.metadata.sizeBytes));
    res.header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.metadata.originalName)}`);
    res.send(file.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});

cloudRouter.delete("/files/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteCloudFile(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: "CLOUD_FILE_NOT_FOUND" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    res.status(500).json({ message });
  }
});
