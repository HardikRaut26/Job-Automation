import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import pdfParse from "pdf-parse";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { AIService } from "./services/ai.service.js";
import { QueueService } from "./services/queue.service.js";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

// Set up resume uploads folder
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer disk storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resume_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

/**
 * Startup Seeding: Ensures global configuration row always exists
 */
async function seedDatabase() {
  const settings = await prisma.globalSettings.findUnique({ where: { id: "global_config" } });
  if (!settings) {
    await prisma.globalSettings.create({
      data: {
        id: "global_config",
        geminiApiKey: process.env.GEMINI_API_KEY || "",
        openaiApiKey: process.env.OPENAI_API_KEY || "",
        automationMode: "co-pilot",
        headlessMode: false,
        useActiveBrowser: false,
        scheduleInterval: "manual"
      }
    });
    console.log("Database initialized with default global settings.");
  }
}

// ==========================================
// 1. SETTINGS ENDPOINTS
// ==========================================

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await prisma.globalSettings.findUnique({ where: { id: "global_config" } });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { geminiApiKey, openaiApiKey, notificationType, notificationToken, notificationChatId, automationMode, headlessMode, useActiveBrowser, scheduleInterval } = req.body;
    const settings = await prisma.globalSettings.update({
      where: { id: "global_config" },
      data: {
        geminiApiKey,
        openaiApiKey,
        notificationType,
        notificationToken,
        notificationChatId,
        automationMode,
        headlessMode,
        useActiveBrowser,
        scheduleInterval
      }
    });
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// ==========================================
// 2. PROFILE ENDPOINTS
// ==========================================

app.get("/api/profile", async (req, res) => {
  try {
    // Single tenant application, select first user/profile
    const profile = await prisma.profile.findFirst();
    if (!profile) {
      return res.status(404).json({ error: "Profile not found. Please upload a resume first." });
    }
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.post("/api/profile", async (req, res) => {
  try {
    const { name, email, phone, address, noticePeriod, experienceYears, currentCtc, expectedCtc, skills, preferredRoles, locations, workPreferences, githubProfile, linkedinProfile, portfolioLinks, coverLetterTpl } = req.body;
    
    // Seed default user if none exists
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: "user@example.com",
          password: "password123"
        }
      });
    }

    const existingProfile = await prisma.profile.findFirst({ where: { userId: user.id } });

    let profile;
    if (existingProfile) {
      profile = await prisma.profile.update({
        where: { id: existingProfile.id },
        data: {
          name, email, phone, address, noticePeriod,
          experienceYears: parseFloat(experienceYears),
          currentCtc: parseFloat(currentCtc),
          expectedCtc: parseFloat(expectedCtc),
          skills, preferredRoles, locations, workPreferences,
          githubProfile, linkedinProfile, portfolioLinks, coverLetterTpl
        }
      });
    } else {
      profile = await prisma.profile.create({
        data: {
          userId: user.id,
          name, email, phone, address, noticePeriod,
          experienceYears: parseFloat(experienceYears),
          currentCtc: parseFloat(currentCtc),
          expectedCtc: parseFloat(expectedCtc),
          skills, preferredRoles, locations, workPreferences,
          githubProfile, linkedinProfile, portfolioLinks, coverLetterTpl
        }
      });
    }
    res.json(profile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update profile: " + (error as Error).message });
  }
});

/**
 * RESUME UPLOAD AND PARSING ENDPOINT
 */
app.post("/api/profile/resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    // 1. Extract text from PDF
    const fileBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(fileBuffer);
    const pdfText = pdfData.text;

    // 2. Fetch global API keys
    const settings = await prisma.globalSettings.findUnique({ where: { id: "global_config" } });
    if (!settings || (!settings.geminiApiKey && !settings.openaiApiKey)) {
      // Save raw parsed file details but do not parse with AI yet
      const resumeRecord = await prisma.resume.create({
        data: { fileName, filePath, extractedText: pdfText, isParsed: false }
      });
      return res.json({ 
        message: "Resume text uploaded successfully. Please configure your API key in Settings to complete parsing.",
        rawText: pdfText,
        resumeId: resumeRecord.id
      });
    }

    const apiKey = settings.geminiApiKey || settings.openaiApiKey || "";
    const apiType = settings.geminiApiKey ? "gemini" : "openai";

    // 3. Request LLM AI Service to parse details
    console.log(`Parsing resume with ${apiType} LLM...`);
    const parsedData = await AIService.parseResume(pdfText, apiKey, apiType);

    // Save resume record
    const resumeRecord = await prisma.resume.create({
      data: { fileName, filePath, extractedText: pdfText, isParsed: true }
    });

    // 4. Update Profile
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: "user@example.com", password: "password123" }
      });
    }

    const existingProfile = await prisma.profile.findFirst({ where: { userId: user.id } });
    let profile;
    const profilePayload = {
      name: parsedData.name || "Full Name",
      email: parsedData.email || "Email",
      phone: parsedData.phone || "Phone",
      address: parsedData.address || "Address",
      noticePeriod: "Immediate", // Default fallback
      experienceYears: parsedData.experienceYears || 0.0,
      currentCtc: 0.0,
      expectedCtc: 0.0,
      skills: parsedData.skills || [],
      preferredRoles: parsedData.skills.slice(0, 3) || [],
      locations: ["Remote"],
      workPreferences: ["Remote"],
      coverLetterTpl: ""
    };

    if (existingProfile) {
      profile = await prisma.profile.update({
        where: { id: existingProfile.id },
        data: profilePayload
      });
    } else {
      profile = await prisma.profile.create({
        data: { userId: user.id, ...profilePayload }
      });
    }

    res.json({ message: "Resume parsed successfully!", profile, resume: resumeRecord });

  } catch (error) {
    console.error("Resume processing error:", error);
    res.status(500).json({ error: "Failed to parse resume: " + (error as Error).message });
  }
});

// ==========================================
// 3. JOBS & APPLICATIONS ENDPOINTS
// ==========================================

app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      orderBy: { overallScore: "desc" }
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Create application manual tracking entry or create custom job
app.post("/api/jobs", async (req, res) => {
  try {
    const { title, company, location, portal, jobUrl, description, salary, status } = req.body;
    const job = await prisma.job.create({
      data: {
        title, company, location, portal, jobUrl, description, salary, status
      }
    });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: "Failed to create manual job entry" });
  }
});

app.patch("/api/jobs/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedJob = await prisma.job.update({
      where: { id },
      data: { status, appliedAt: status === "APPLIED" ? new Date() : undefined }
    });
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: "Failed to update job status" });
  }
});

app.patch("/api/jobs/:id/notes", async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const updatedJob = await prisma.job.update({
      where: { id },
      data: { notes }
    });
    res.json(updatedJob);
  } catch (error) {
    res.status(500).json({ error: "Failed to update job notes" });
  }
});

app.get("/api/jobs/:id/logs", async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await prisma.appLog.findMany({
      where: { jobId: id },
      orderBy: { timestamp: "asc" }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch job logs" });
  }
});

/**
 * BACKGROUND ACTIONS DISPATCH
 */
app.post("/api/jobs/discover", async (req, res) => {
  try {
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({ data: { email: "user@example.com", password: "password123" } });
    }
    
    // Add job discovery task to BullMQ queue
    await QueueService.scheduleDiscovery(user.id);
    res.json({ message: "Job discovery task added to queue." });
  } catch (error) {
    res.status(500).json({ error: "Failed to queue job discovery: " + (error as Error).message });
  }
});

app.post("/api/jobs/apply/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({ data: { email: "user@example.com", password: "password123" } });
    }

    // Set job status to Discovered while task processes
    await prisma.job.update({
      where: { id },
      data: { status: "DISCOVERED" }
    });

    // Add automation apply task to BullMQ queue
    await QueueService.queueApplication(id, user.id);
    res.json({ message: "Application job scheduled." });
  } catch (error) {
    res.status(500).json({ error: "Failed to queue application: " + (error as Error).message });
  }
});

// ==========================================
// 4. STATS & ANALYTICS ENDPOINT
// ==========================================

app.get("/api/stats", async (req, res) => {
  try {
    const allJobs = await prisma.job.findMany();
    
    const countByStatus = {
      DISCOVERED: 0,
      APPLIED: 0,
      UNDER_REVIEW: 0,
      INTERVIEW_SCHEDULED: 0,
      REJECTED: 0,
      OFFER_RECEIVED: 0
    };

    const countByPortal: Record<string, number> = {};
    const countByLocation: Record<string, number> = {};
    const skillsDemandMap: Record<string, number> = {};

    allJobs.forEach(job => {
      // 1. Status counter
      if (countByStatus[job.status] !== undefined) {
        countByStatus[job.status]++;
      }
      
      // 2. Portal counter
      countByPortal[job.portal] = (countByPortal[job.portal] || 0) + 1;
      
      // 3. Location counter
      const normalizedLoc = job.location.split(",")[0] || job.location;
      countByLocation[normalizedLoc] = (countByLocation[normalizedLoc] || 0) + 1;

      // 4. Extract skills from description (simple heuristics based on common skills)
      const commonSkills = ["React", "TypeScript", "Node.js", "Express", "Python", "Docker", "PostgreSQL", "MongoDB", "Redux", "RESTful", "AWS"];
      commonSkills.forEach(skill => {
        if (job.description.toLowerCase().includes(skill.toLowerCase())) {
          skillsDemandMap[skill] = (skillsDemandMap[skill] || 0) + 1;
        }
      });
    });

    const totalFound = allJobs.length;
    const totalApplied = allJobs.filter(j => j.status !== "DISCOVERED").length;
    const interviews = countByStatus.INTERVIEW_SCHEDULED;
    const rejections = countByStatus.REJECTED;
    const offers = countByStatus.OFFER_RECEIVED;
    const successRate = totalApplied > 0 ? Math.round((offers / totalApplied) * 100) : 0;

    res.json({
      totalFound,
      totalApplied,
      interviews,
      rejections,
      offers,
      successRate,
      statusBreakdown: countByStatus,
      portalsData: countByPortal,
      locationsData: countByLocation,
      skillsDemand: skillsDemandMap
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load dashboard statistics" });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Backend server started on http://localhost:${PORT}`);
  try {
    await seedDatabase();
    QueueService.init(); // Starts BullMQ and connects to Redis
  } catch (e) {
    console.error("Initialization warning during startup:", e);
  }
});
