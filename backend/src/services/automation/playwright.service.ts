import { chromium, BrowserContext, Page } from "playwright";
import path from "path";
import fs from "fs";
import { AIService } from "../ai.service.js";

export interface PlaywrightRunResult {
  success: boolean;
  error?: string;
}

type LogCallback = (msg: string, isError?: boolean) => Promise<void>;

export class PlaywrightService {
  /**
   * Automates the job application form filling process
   */
  static async runApplication(
    job: any,
    profile: any,
    resume: any,
    settings: any,
    log: LogCallback
  ): Promise<PlaywrightRunResult> {
    const isCoPilot = settings.automationMode === "co-pilot";
    const headless = settings.headlessMode;

    // Determine path for persistent user session cookies
    const portalName = job.portal.toLowerCase().replace(/\s+/g, "");
    const userDataDir = path.join(process.cwd(), "userdata", portalName);

    // Ensure the userdata folder exists
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    log(`Launching browser in ${isCoPilot ? "Co-Pilot (Visual)" : "Autonomous"} mode (Headless: ${headless})...`);

    let context: BrowserContext | null = null;
    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        headless: headless,
        viewport: { width: 1280, height: 800 },
        args: [
          "--disable-blink-features=AutomationControlled", // Evades simple bot checks
          "--start-maximized"
        ]
      });

      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();

      // Set human-like navigator properties
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      log(`Navigating to job page: ${job.jobUrl}`);
      await page.goto(job.jobUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

      // Check if page needs login (e.g. if we see sign-in forms on LinkedIn/Indeed)
      const hasLogin = await this.detectLoginRequired(page);
      if (hasLogin) {
        log("Portal authentication needed. Please log in or complete the verification check in the browser window...");
        if (headless) {
          throw new Error("Login required but browser is running in headless mode. Please toggle headful mode in Settings.");
        }
        
        // Wait up to 5 minutes for user to login
        await page.waitForFunction(() => {
          // Check if login forms disappeared or we see user profile / main dashboard
          const bodyText = document.body.innerText;
          return !bodyText.includes("Sign in") && !bodyText.includes("Log in") && !document.querySelector("form[action*='login']");
        }, { timeout: 300000 }).catch(() => {
          throw new Error("Authentication timeout: User did not log in within 5 minutes.");
        });
        log("Logged in successfully. Continuing application...");
      }

      log("Analyzing application form elements...");
      await page.waitForTimeout(2000); // Wait for animations to settle

      // Run Form Filling automation
      const fillResult = await this.fillApplicationForm(page, profile, resume, job, settings, log);
      
      if (!fillResult.success) {
        throw new Error(fillResult.error || "Failed to fill form fields");
      }

      if (isCoPilot) {
        log("Co-Pilot finished filling the form! Review the browser window to confirm, solve any captchas, and submit.");
        
        // Wait for the browser context to close (the user finishes and closes the tab)
        return new Promise<PlaywrightRunResult>((resolve) => {
          context?.on("close", () => {
            log("Co-Pilot browser window closed.");
            resolve({ success: true });
          });
          
          // Fallback resolve if tab is closed or navigation happens
          page.on("close", () => {
            log("Application page tab closed.");
            resolve({ success: true });
          });
        });
      } else {
        // Autonomous Mode: Try to submit the form
        log("Autonomous Mode: Submitting the application...");
        const submitBtn = await page.locator("button[type='submit'], input[type='submit'], button:has-text('Submit'), button:has-text('Apply')").first();
        if (await submitBtn.count() > 0 && await submitBtn.isVisible()) {
          await page.waitForTimeout(1000);
          await submitBtn.click();
          log("Submit clicked. Waiting for confirmation page...");
          await page.waitForTimeout(5000); // Wait for submission
          await context.close();
          return { success: true };
        } else {
          log("Could not find submit button automatically. Browser kept open for review.", true);
          await context.close();
          return { success: false, error: "Submit button not found." };
        }
      }

    } catch (err) {
      log(`Automation Error: ${(err as Error).message}`, true);
      if (context) {
        await context.close().catch(() => {});
      }
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Scrapes the page to check if authentication is requested
   */
  private static async detectLoginRequired(page: Page): Promise<boolean> {
    const text = await page.innerText("body");
    const containsSignIn = text.includes("Sign in to apply") || text.includes("Please log in") || text.includes("Log in to your account");
    const loginForm = await page.locator("form[id*='login'], form[action*='login'], input[type='password']").count() > 0;
    return containsSignIn || loginForm;
  }

  /**
   * Form filling engine: detects fields and populates with profile info
   */
  private static async fillApplicationForm(
    page: Page,
    profile: any,
    resume: any,
    job: any,
    settings: any,
    log: LogCallback
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find all input, textarea, and select fields
      const inputs = await page.locator("input, textarea, select").all();
      log(`Detected ${inputs.length} form inputs.`);

      const customQuestionsToAnswer: { elementIdx: number; label: string; question: string }[] = [];

      for (let i = 0; i < inputs.length; i++) {
        const el = inputs[i];
        
        // Skip invisible or disabled elements
        if (!(await el.isVisible()) || await el.isDisabled()) continue;

        const name = (await el.getAttribute("name") || "").toLowerCase();
        const id = (await el.getAttribute("id") || "").toLowerCase();
        const placeholder = (await el.getAttribute("placeholder") || "").toLowerCase();
        const type = (await el.getAttribute("type") || "").toLowerCase();
        const tagName = await el.evaluate(e => e.tagName.toLowerCase());

        // Find label text associated with this input
        const labelText = await el.evaluate(e => {
          let label = "";
          // 1. Check if enclosed in a label tag
          const parentLabel = e.closest("label");
          if (parentLabel) return parentLabel.innerText;
          
          // 2. Check for labeled-by
          const id = e.getAttribute("id");
          if (id) {
            const lEl = document.querySelector(`label[for="${id}"]`);
            if (lEl) return (lEl as HTMLElement).innerText;
          }
          
          // 3. Search siblings
          const prevSibling = e.previousElementSibling;
          if (prevSibling && prevSibling.tagName.toLowerCase() === "label") {
            return (prevSibling as HTMLElement).innerText;
          }

          // 4. Return placeholder as label
          return e.getAttribute("placeholder") || "";
        });

        const label = labelText.trim().toLowerCase();
        
        // --- 1. FILE UPLOAD (RESUME) ---
        if (type === "file" || label.includes("resume") || label.includes("cv") || name.includes("resume") || name.includes("cv")) {
          if (resume && resume.filePath && fs.existsSync(resume.filePath)) {
            log(`Uploading resume: ${resume.fileName}`);
            await el.setInputFiles(resume.filePath);
            await page.waitForTimeout(1000);
          } else {
            log("No resume file path found or file doesn't exist. Skipping upload.", true);
          }
          continue;
        }

        // --- 2. SELECT FIELDS ---
        if (tagName === "select") {
          // Dropdown matches
          if (label.includes("notice") || name.includes("notice")) {
            await this.selectDropdownOption(el, profile.noticePeriod);
          } else if (label.includes("experience") || name.includes("experience")) {
            await this.selectDropdownOption(el, String(Math.floor(profile.experienceYears)));
          } else if (label.includes("work authorization") || label.includes("visa")) {
            await this.selectDropdownOption(el, "Yes");
          }
          continue;
        }

        // --- 3. RADIO / CHECKBOX FIELDS ---
        if (type === "checkbox") {
          // Check standard checkboxes like consent or email opt-in
          if (label.includes("agree") || label.includes("consent") || label.includes("accept") || label.includes("terms")) {
            await el.check();
          }
          continue;
        }
        if (type === "radio") {
          // Check standard radio buttons (e.g. Yes/No to work eligibility)
          if (label.includes("authorized to work") || label.includes("visa sponsorship")) {
            const value = await el.getAttribute("value");
            if (label.includes("authorized") && value?.toLowerCase() === "yes") await el.check();
            if (label.includes("sponsorship") && value?.toLowerCase() === "no") await el.check();
          }
          continue;
        }

        // --- 4. TEXT INPUTS ---
        if (tagName === "input" && (type === "text" || type === "email" || type === "tel" || type === "")) {
          // Match standard fields
          if (label.includes("first name") || name === "firstname") {
            const firstName = profile.name.split(" ")[0] || profile.name;
            await this.humanType(el, firstName);
          } else if (label.includes("last name") || name === "lastname") {
            const lastName = profile.name.split(" ").slice(1).join(" ") || profile.name;
            await this.humanType(el, lastName);
          } else if (label.includes("full name") || label.includes("name") || name.includes("name")) {
            await this.humanType(el, profile.name);
          } else if (label.includes("email") || name.includes("email") || type === "email") {
            await this.humanType(el, profile.email);
          } else if (label.includes("phone") || label.includes("mobile") || label.includes("contact") || name.includes("phone") || type === "tel") {
            await this.humanType(el, profile.phone);
          } else if (label.includes("linkedin") || name.includes("linkedin")) {
            await this.humanType(el, profile.linkedinProfile || "");
          } else if (label.includes("github") || name.includes("github")) {
            await this.humanType(el, profile.githubProfile || "");
          } else if (label.includes("portfolio") || label.includes("website") || name.includes("portfolio") || name.includes("website")) {
            await this.humanType(el, profile.portfolioLinks[0] || "");
          } else if (label.includes("salary") || label.includes("compensation") || name.includes("salary") || label.includes("expected ctc")) {
            await this.humanType(el, String(profile.expectedCtc));
          } else if (label.includes("current ctc")) {
            await this.humanType(el, String(profile.currentCtc));
          } else if (label.includes("notice period")) {
            await this.humanType(el, profile.noticePeriod);
          } else if (label.includes("city") || label.includes("location") || name.includes("location") || name.includes("city")) {
            await this.humanType(el, profile.address.split(",")[0] || profile.address);
          }
          continue;
        }

        // --- 5. TEXTAREAS & CUSTOM QUESTIONS ---
        if (tagName === "textarea" || (tagName === "input" && type === "text")) {
          // If label represents an open-ended question
          if (labelText && labelText.length > 15) {
            customQuestionsToAnswer.push({
              elementIdx: i,
              label: labelText,
              question: labelText
            });
          } else if (label.includes("cover letter") || name.includes("coverletter") || placeholder.includes("cover letter")) {
            if (job.coverLetterUsed) {
              await this.humanType(el, job.coverLetterUsed);
            }
          }
        }
      }

      // Solve custom questions using AI if found
      if (customQuestionsToAnswer.length > 0) {
        log(`Found ${customQuestionsToAnswer.length} open-ended custom questions. Generating AI answers...`);
        const questionStrings = customQuestionsToAnswer.map(q => q.question);
        
        const apiKey = settings.geminiApiKey || settings.openaiApiKey || "";
        const apiType = settings.geminiApiKey ? "gemini" : "openai";

        const answers = await AIService.answerFormQuestions(
          questionStrings,
          job.title,
          job.description,
          profile,
          apiKey,
          apiType
        );

        for (const cq of customQuestionsToAnswer) {
          const answerText = answers[cq.question] || "Please refer to the attached resume.";
          log(`Answering: "${cq.question.substring(0, 40)}..."`);
          const el = inputs[cq.elementIdx];
          await this.humanType(el, answerText);
          await page.waitForTimeout(500);
        }
      }

      log("Form filling complete.");
      return { success: true };

    } catch (e) {
      log(`Error while filling form: ${(e as Error).message}`, true);
      return { success: false, error: (e as Error).message };
    }
  }

  /**
   * Inputs text slowly to mimic human typing behavior
   */
  private static async humanType(locator: any, text: string) {
    if (!text) return;
    await locator.focus();
    await locator.fill(""); // Clear existing
    // Type with randomized delay per character
    for (const char of text) {
      await locator.press(char);
      const delay = Math.random() * 50 + 20; // 20-70ms delay
      await new Promise(r => setTimeout(r, delay));
    }
  }

  /**
   * Helper to select dropdown values by matching text
   */
  private static async selectDropdownOption(locator: any, text: string) {
    try {
      // Get all option elements inside select
      const options = await locator.locator("option").all();
      let bestValue = "";
      let minDistance = 999;

      for (const opt of options) {
        const val = await opt.getAttribute("value") || "";
        const labelText = (await opt.innerText() || "").toLowerCase();
        
        if (labelText.includes(text.toLowerCase()) || text.toLowerCase().includes(labelText)) {
          bestValue = val;
          break;
        }
      }

      if (bestValue) {
        await locator.selectOption(bestValue);
      } else {
        // Fallback: choose the first non-empty option
        const firstVal = await options[1]?.getAttribute("value");
        if (firstVal) await locator.selectOption(firstVal);
      }
    } catch (err) {
      console.warn("Could not select dropdown value:", err);
    }
  }
}
