import { chromium } from "playwright";
import path from "path";
import fs from "fs";

// Path to mock files
const scratchDir = "C:/Users/hardi/.gemini/antigravity-ide/brain/175150cf-3f23-45ae-9f74-1e792c399451/scratch";
const mockFormUrl = "file:///" + path.join(scratchDir, "mock-apply-form.html").replace(/\\/g, "/");
const mockResumePath = path.join(scratchDir, "mock-resume.txt");

// Ensure mock resume file exists for testing upload
if (!fs.existsSync(mockResumePath)) {
  fs.writeFileSync(mockResumePath, "This is a mock resume document for testing Playwright uploads.");
}

// Mock candidate profile data
const mockProfile = {
  name: "Hardik Raut",
  email: "hardik.raut@example.com",
  phone: "+91 9876543210",
  address: "Mumbai, India",
  noticePeriod: "Immediate",
  experienceYears: 2.5,
  expectedCtc: 1500000,
  githubProfile: "https://github.com/HardikRaut26",
  linkedinProfile: "https://linkedin.com/in/hardik-raut",
  portfolioLinks: ["https://hardik-portfolio.com"]
};

// Custom questions response map (simulating AI response)
const mockAiAnswers: Record<string, string> = {
  "Why do you want to join our engineering team?": "I am passionate about building modern web applications. Your focus on agentic automation aligns perfectly with my background in React and Node.js developer tools, and I want to help solve complex engineering challenges with your team."
};

// Helper for typing slowly
async function humanType(locator: any, text: string) {
  if (!text) return;
  await locator.focus();
  await locator.fill("");
  for (const char of text) {
    await locator.press(char);
    const delay = Math.random() * 40 + 20; // 20-60ms delay
    await new Promise(r => setTimeout(r, delay));
  }
}

// Helper for dropdown selection
async function selectDropdownOption(locator: any, text: string) {
  try {
    const options = await locator.locator("option").all();
    let bestValue = "";
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
    }
  } catch (err) {
    console.warn("Dropdown select error:", err);
  }
}

async function run() {
  console.log("=== Starting Playwright Browser Automation Test ===");
  console.log(`Opening mock form: ${mockFormUrl}`);

  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"]
  });

  const page = await browser.newPage();
  await page.goto(mockFormUrl);
  await page.waitForTimeout(1000);

  console.log("Inspecting inputs on the page...");
  const inputs = await page.locator("input, textarea, select").all();
  console.log(`Detected ${inputs.length} inputs. Starting form filling...`);

  for (let i = 0; i < inputs.length; i++) {
    const el = inputs[i];
    if (!(await el.isVisible()) || await el.isDisabled()) continue;

    const name = (await el.getAttribute("name") || "").toLowerCase();
    const type = (await el.getAttribute("type") || "").toLowerCase();
    const tagName = await el.evaluate(e => e.tagName.toLowerCase());

    // Retrieve label associated with this input
    const labelText = await el.evaluate(e => {
      const parentLabel = e.closest("label");
      if (parentLabel) return parentLabel.innerText;
      
      const id = e.getAttribute("id");
      if (id) {
        const lEl = document.querySelector(`label[for="${id}"]`);
        if (lEl) return (lEl as HTMLElement).innerText;
      }
      return e.getAttribute("placeholder") || "";
    });

    const label = labelText.trim().toLowerCase();

    // 1. Resume upload
    if (type === "file" || label.includes("resume") || label.includes("cv")) {
      console.log(`[Upload] Uploading mock resume to: "${labelText}"`);
      await el.setInputFiles(mockResumePath);
      await page.waitForTimeout(800);
      continue;
    }

    // 2. Select Notice Period
    if (tagName === "select") {
      if (label.includes("notice") || name.includes("notice")) {
        console.log(`[Dropdown] Selecting notice period: "${mockProfile.noticePeriod}"`);
        await selectDropdownOption(el, mockProfile.noticePeriod);
        await page.waitForTimeout(500);
      }
      continue;
    }

    // 3. Text Inputs
    if (tagName === "input" && (type === "text" || type === "email" || type === "")) {
      if (label.includes("name") || name.includes("name")) {
        console.log(`[Input] Filling name: "${mockProfile.name}"`);
        await humanType(el, mockProfile.name);
      } else if (label.includes("email") || name.includes("email") || type === "email") {
        console.log(`[Input] Filling email: "${mockProfile.email}"`);
        await humanType(el, mockProfile.email);
      } else if (label.includes("phone") || name.includes("phone")) {
        console.log(`[Input] Filling phone: "${mockProfile.phone}"`);
        await humanType(el, mockProfile.phone);
      } else if (label.includes("salary") || label.includes("expected ctc") || name.includes("salary")) {
        console.log(`[Input] Filling expected CTC: "${mockProfile.expectedCtc}"`);
        await humanType(el, String(mockProfile.expectedCtc));
      }
      await page.waitForTimeout(500);
      continue;
    }

    // 4. Textarea Question Answering
    if (tagName === "textarea") {
      if (labelText) {
        const matchingQuestion = Object.keys(mockAiAnswers).find(q => q.includes(labelText) || labelText.includes(q));
        const answer = matchingQuestion ? mockAiAnswers[matchingQuestion] : "Refer to resume.";
        console.log(`[Textarea] Answering custom question: "${labelText.substring(0, 30)}..."`);
        await humanType(el, answer);
        await page.waitForTimeout(500);
      }
    }
  }

  console.log("\n=== SUCCESS: Form filled! ===");
  console.log("Browser is kept open for 10 seconds for visual review...");
  await page.waitForTimeout(10000);
  await browser.close();
  console.log("Browser session completed.");
}

run().catch(console.error);
