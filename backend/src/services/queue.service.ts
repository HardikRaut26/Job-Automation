import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { PlaywrightService } from "./automation/playwright.service.js";
import { AIService } from "./ai.service.js";

const prisma = new PrismaClient();

// Get Redis config from environment
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);

let redisConnection: Redis | null = null;
let discoveryQueue: Queue | null = null;
let applicationQueue: Queue | null = null;

let discoveryWorker: Worker | null = null;
let applicationWorker: Worker | null = null;

export class QueueService {
  static init() {
    console.log(`Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
    
    // Create Redis connection with reconnection strategy
    redisConnection = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      maxRetriesPerRequest: null, // BullMQ requirement
      retryStrategy(times) {
        // Retry every 5 seconds, don't crash
        return Math.min(times * 100, 5000);
      }
    });

    redisConnection.on("error", (err) => {
      console.warn("Redis Connection Error: Background workers will be paused until Redis is started. Error:", err.message);
    });

    redisConnection.on("connect", () => {
      console.log("Successfully connected to Redis database!");
    });

    // 1. Initialize Queues
    discoveryQueue = new Queue("job-discovery", { connection: redisConnection });
    applicationQueue = new Queue("job-applications", { connection: redisConnection });

    // 2. Initialize Workers
    this.startWorkers();
  }

  private static startWorkers() {
    if (!redisConnection) return;

    // Discovery Worker: searches job boards for new listings based on user profile preferences
    discoveryWorker = new Worker(
      "job-discovery",
      async (job: Job) => {
        console.log(`[Queue] Starting Job Discovery task: ${job.id}`);
        const { userId } = job.data;
        
        // Fetch user profile settings
        const settings = await prisma.globalSettings.findUnique({ where: { id: "global_config" } });
        const profile = await prisma.profile.findFirst({ where: { userId } });
        
        if (!profile || !settings || !settings.geminiApiKey) {
          throw new Error("Missing profile settings or AI API Key. Job Discovery skipped.");
        }

        // Mock job boards crawler / feed aggregator
        // In a real application, we would scrape or fetch RSS feeds. Here we simulate job discovery
        console.log(`[Queue] Simulating job boards crawler for roles: ${profile.preferredRoles.join(", ")}`);
        
        const mockJobs = [
          {
            title: "Frontend Engineer (React / TS)",
            company: "TechFlow Solutions",
            location: profile.locations[0] || "Remote",
            portal: "Indeed",
            jobUrl: "https://example.com/jobs/techflow-frontend-" + Math.floor(Math.random() * 10000),
            description: "We are looking for a Frontend developer skilled in React, Tailwind CSS, TypeScript, and modern state management. 3+ years experience required.",
            salary: "12,000,000 - 18,000,000 INR",
          },
          {
            title: "Full Stack Developer",
            company: "InnoCloud Systems",
            location: "Pune",
            portal: "LinkedIn",
            jobUrl: "https://example.com/jobs/innocloud-fullstack-" + Math.floor(Math.random() * 10000),
            description: "Full Stack Node.js and React developer. Strong knowledge of databases, Docker, and RESTful APIs is required.",
            salary: "15,000,000 INR",
          },
          {
            title: "MERN Stack Developer",
            company: "Apex Global Solutions",
            location: "Mumbai",
            portal: "Naukri",
            jobUrl: "https://example.com/jobs/apex-naukri-" + Math.floor(Math.random() * 10000),
            description: "MERN developer with strong expertise in Express, React, Node.js, and MongoDB/PostgreSQL database management. Minimum 2 years experience.",
            salary: "10,00,000 - 14,00,000 INR",
          },
          {
            title: "Software Engineer Intern",
            company: "Antigravity Corp",
            location: "Bangalore",
            portal: "Internshala",
            jobUrl: "https://example.com/jobs/antigravity-intern-" + Math.floor(Math.random() * 10000),
            description: "Looking for entry-level React developers to work on building complex AI platforms. Excellent HTML/CSS and JS skills.",
            salary: "50,000 INR / month",
          }
        ];

        // Process found jobs, score them, and store
        let addedCount = 0;
        const apiKey = settings.geminiApiKey || settings.openaiApiKey || "";
        const apiType = settings.geminiApiKey ? 'gemini' : 'openai';

        for (const mJob of mockJobs) {
          // Check if already exists
          const existing = await prisma.job.findUnique({ where: { jobUrl: mJob.jobUrl } });
          if (existing) continue;

          // Calculate AI scores
          const scores = await AIService.calculateMatchScore(
            mJob.title,
            mJob.description,
            profile,
            apiKey,
            apiType
          );

          // Only keep jobs that have > 60% compatibility
          if (scores.overallScore >= 60) {
            await prisma.job.create({
              data: {
                title: mJob.title,
                company: mJob.company,
                location: mJob.location,
                portal: mJob.portal,
                jobUrl: mJob.jobUrl,
                description: mJob.description,
                salary: mJob.salary,
                skillScore: scores.skillScore,
                experienceScore: scores.experienceScore,
                locationScore: scores.locationScore,
                salaryScore: scores.salaryScore,
                overallScore: scores.overallScore,
                status: "DISCOVERED"
              }
            });
            addedCount++;
          }
        }

        console.log(`[Queue] Job Discovery complete! Found ${addedCount} matching jobs.`);
        return { addedCount };
      },
      { connection: redisConnection }
    );

    // Application Worker: Automates submitting a job application using Playwright
    applicationWorker = new Worker(
      "job-applications",
      async (job: Job) => {
        const { jobId, userId } = job.data;
        console.log(`[Queue] Starting Job Application automation for job ID: ${jobId}`);

        // Update job status to active
        const jobRecord = await prisma.job.findUnique({ where: { id: jobId } });
        if (!jobRecord) throw new Error("Job record not found");

        const settings = await prisma.globalSettings.findUnique({ where: { id: "global_config" } });
        const profile = await prisma.profile.findFirst({ where: { userId } });
        const latestResume = await prisma.resume.findFirst({ orderBy: { createdAt: "desc" } });

        if (!profile || !settings || !settings.geminiApiKey) {
          throw new Error("Incomplete configuration or missing API keys");
        }

        const apiKey = settings.geminiApiKey || settings.openaiApiKey || "";
        const apiType = settings.geminiApiKey ? 'gemini' : 'openai';

        // 1. Log beginning of automation
        await prisma.appLog.create({
          data: {
            jobId,
            level: "info",
            message: `Starting automated application for ${jobRecord.title} at ${jobRecord.company} via ${jobRecord.portal}`
          }
        });

        // 2. Generate cover letter
        await prisma.appLog.create({
          data: { jobId, level: "info", message: "Generating tailored cover letter..." }
        });
        const coverLetter = await AIService.generateCoverLetter(
          jobRecord.title,
          jobRecord.company,
          jobRecord.description,
          profile,
          apiKey,
          apiType
        );

        // Update job with the generated cover letter
        await prisma.job.update({
          where: { id: jobId },
          data: { coverLetterUsed: coverLetter }
        });

        // 3. Trigger Playwright automation (non-blocking run)
        await prisma.appLog.create({
          data: { jobId, level: "info", message: "Initializing Playwright browser context..." }
        });

        try {
          const result = await PlaywrightService.runApplication(
            jobRecord,
            profile,
            latestResume,
            settings,
            async (msg: string, isError = false) => {
              await prisma.appLog.create({
                data: {
                  jobId,
                  level: isError ? "error" : "info",
                  message: msg
                }
              });
            }
          );

          if (result.success) {
            await prisma.job.update({
              where: { id: jobId },
              data: {
                status: settings.automationMode === "co-pilot" ? "DISCOVERED" : "APPLIED",
                appliedAt: settings.automationMode === "co-pilot" ? null : new Date(),
                resumeUsedId: latestResume?.id || null
              }
            });
            
            await prisma.appLog.create({
              data: {
                jobId,
                level: "info",
                message: settings.automationMode === "co-pilot" 
                  ? "Co-Pilot completed form filling. Browser remains open for review and submission."
                  : "Application submitted successfully!"
              }
            });
          } else {
            throw new Error(result.error || "Unknown error during automation");
          }

        } catch (err) {
          console.error("Playwright application failed:", err);
          await prisma.appLog.create({
            data: {
              jobId,
              level: "error",
              message: `Application automation failed: ${(err as Error).message}`
            }
          });
          throw err;
        }
      },
      { connection: redisConnection }
    );

    discoveryWorker.on("failed", (job, err) => {
      console.error(`[Queue] Job Discovery ${job?.id} failed:`, err.message);
    });

    applicationWorker.on("failed", (job, err) => {
      console.error(`[Queue] Job Application ${job?.id} failed:`, err.message);
    });
  }

  static async scheduleDiscovery(userId: string) {
    if (!discoveryQueue) throw new Error("Queue not initialized or Redis offline");
    await discoveryQueue.add("discover-jobs", { userId });
    console.log("[Queue] Job discovery task added to queue.");
  }

  static async queueApplication(jobId: string, userId: string) {
    if (!applicationQueue) throw new Error("Queue not initialized or Redis offline");
    await applicationQueue.add("apply-job", { jobId, userId });
    console.log(`[Queue] Job application task for Job ${jobId} added to queue.`);
  }
}
