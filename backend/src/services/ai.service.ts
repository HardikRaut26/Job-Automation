import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export interface ParsedProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  experienceYears: number;
  skills: string[];
  education: Array<{ degree: string; institution: string; year: string }>;
  projects: Array<{ title: string; description: string; techStack: string[] }>;
  experienceList: Array<{ role: string; company: string; duration: string; description: string }>;
}

export interface MatchScores {
  skillScore: number;
  experienceScore: number;
  locationScore: number;
  salaryScore: number;
  overallScore: number;
}

export class AIService {
  private static getClient(apiKey: string, type: 'gemini' | 'openai') {
    if (type === 'gemini') {
      return new GoogleGenerativeAI(apiKey);
    } else {
      return new OpenAI({ apiKey });
    }
  }

  /**
   * Parses resume text into structured profile data using LLMs
   */
  static async parseResume(pdfText: string, apiKey: string, type: 'gemini' | 'openai' = 'gemini'): Promise<ParsedProfile> {
    const prompt = `
      You are an expert ATS (Applicant Tracking System) parser. Parse the following resume text and extract structured profile data.
      You MUST return your response ONLY as a valid JSON object matching the JSON schema below. Do not add any markdown formattings like \`\`\`json.
      
      JSON Schema:
      {
        "name": "Full Name",
        "email": "Email Address",
        "phone": "Phone Number",
        "address": "Home/Current Address",
        "experienceYears": 5.5,
        "skills": ["JavaScript", "TypeScript", "React", "Node.js"],
        "education": [
          { "degree": "Degree/Major", "institution": "College Name", "year": "2018 - 2022" }
        ],
        "projects": [
          { "title": "Project Title", "description": "Project description", "techStack": ["React", "Express"] }
        ],
        "experienceList": [
          { "role": "Software Engineer", "company": "Company Name", "duration": "Jan 2022 - Present", "description": "Responsibilities and achievements" }
        ]
      }

      Resume Text:
      ${pdfText}
    `;

    try {
      if (type === 'gemini') {
        const genAI = this.getClient(apiKey, 'gemini') as GoogleGenerativeAI;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return this.cleanAndParseJson(text);
      } else {
        const openai = this.getClient(apiKey, 'openai') as OpenAI;
        const response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        const text = response.choices[0]?.message?.content || "{}";
        return JSON.parse(text);
      }
    } catch (error) {
      console.error("Error parsing resume with AI:", error);
      throw new Error("Failed to parse resume using LLM: " + (error as Error).message);
    }
  }

  /**
   * Calculates compatibility scores between job description and profile
   */
  static async calculateMatchScore(
    jobTitle: string,
    jobDescription: string,
    profile: any,
    apiKey: string,
    type: 'gemini' | 'openai' = 'gemini'
  ): Promise<MatchScores> {
    const prompt = `
      You are an AI recruiter. Evaluate the compatibility of a candidate's profile for the following job.
      
      Job Title: ${jobTitle}
      Job Description: ${jobDescription}
      
      Candidate Profile:
      - Skills: ${JSON.stringify(profile.skills)}
      - Experience Years: ${profile.experienceYears}
      - Preferred Roles: ${JSON.stringify(profile.preferredRoles || [])}
      - Preferred Locations: ${JSON.stringify(profile.locations || [])}
      - Work Preferences: ${JSON.stringify(profile.workPreferences || [])}
      
      Analyze:
      1. Skill Match: How closely do the candidate's skills match the required skills in the description? (0-100)
      2. Experience Match: Does the candidate's experience level align with the job requirements? (0-100)
      3. Location Match: Does the job location match candidate's preferred locations (e.g. Remote, or specific cities)? (0-100)
      4. Salary Match: (Default to 80 if salary details are unspecified). (0-100)
      5. Overall Score: Weighted average of the scores above.
      
      You MUST return your response ONLY as a valid JSON object matching the JSON schema below. Do not add markdown formatting.
      
      JSON Schema:
      {
        "skillScore": 85,
        "experienceScore": 90,
        "locationScore": 100,
        "salaryScore": 80,
        "overallScore": 88
      }
    `;

    try {
      if (type === 'gemini') {
        const genAI = this.getClient(apiKey, 'gemini') as GoogleGenerativeAI;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return this.cleanAndParseJson(text);
      } else {
        const openai = this.getClient(apiKey, 'openai') as OpenAI;
        const response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        const text = response.choices[0]?.message?.content || "{}";
        return JSON.parse(text);
      }
    } catch (error) {
      console.warn("Error calculating match scores with AI:", error);
      return { skillScore: 50, experienceScore: 50, locationScore: 50, salaryScore: 50, overallScore: 50 };
    }
  }

  /**
   * Generates a tailored cover letter for a job description
   */
  static async generateCoverLetter(
    jobTitle: string,
    company: string,
    jobDescription: string,
    profile: any,
    apiKey: string,
    type: 'gemini' | 'openai' = 'gemini'
  ): Promise<string> {
    const prompt = `
      Write a professional, compelling, and tailored cover letter for the candidate applying to a job.
      
      Candidate Name: ${profile.name}
      Candidate Email: ${profile.email}
      Candidate Phone: ${profile.phone}
      Candidate Skills: ${JSON.stringify(profile.skills)}
      Candidate Projects: ${JSON.stringify(profile.projects || [])}
      Candidate Experience: ${JSON.stringify(profile.experienceList || [])}
      
      Target Job: ${jobTitle}
      Target Company: ${company}
      Job Description: ${jobDescription}
      
      The letter should be about 250-350 words, highlighting the candidate's matching skills and project achievements, while remaining professional and polished. Return ONLY the letter text, without any introductory or concluding developer notes.
    `;

    try {
      if (type === 'gemini') {
        const genAI = this.getClient(apiKey, 'gemini') as GoogleGenerativeAI;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } else {
        const openai = this.getClient(apiKey, 'openai') as OpenAI;
        const response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [{ role: "user", content: prompt }]
        });
        return response.choices[0]?.message?.content?.trim() || "";
      }
    } catch (error) {
      console.error("Error generating cover letter with AI:", error);
      return `Dear Hiring Team,\n\nI am writing to express my strong interest in the ${jobTitle} position at ${company}. With my background in software engineering, I am confident I can add significant value to your team.\n\nSincerely,\n${profile.name}`;
    }
  }

  /**
   * Answers application form questions based on resume and profile
   */
  static async answerFormQuestions(
    questions: string[],
    jobTitle: string,
    jobDescription: string,
    profile: any,
    apiKey: string,
    type: 'gemini' | 'openai' = 'gemini'
  ): Promise<Record<string, string>> {
    if (!questions || questions.length === 0) return {};

    const prompt = `
      You are a candidate applying to a job. Answer the following list of application questions based on your profile and resume details.
      Keep answers professional, realistic, and concise (1-3 sentences per answer, unless it is a simple field like notice period or salary).
      
      Candidate Profile:
      - Name: ${profile.name}
      - Skills: ${JSON.stringify(profile.skills)}
      - Experience Years: ${profile.experienceYears}
      - Notice Period: ${profile.noticePeriod}
      - Current CTC: ${profile.currentCtc}
      - Expected CTC: ${profile.expectedCtc}
      - Experience details: ${JSON.stringify(profile.experienceList || [])}
      - Projects: ${JSON.stringify(profile.projects || [])}
      
      Job Details:
      - Title: ${jobTitle}
      - Description Summary: ${jobDescription.substring(0, 1000)}
      
      Questions to Answer:
      ${questions.map((q, idx) => `${idx + 1}. "${q}"`).join("\n")}
      
      You MUST return your response ONLY as a valid JSON object map matching the JSON schema below where keys are the exact questions and values are your answers. Do not add markdown formatting.
      
      JSON Schema:
      {
        "Why should we hire you?": "I have extensive experience in React...",
        "What is your expected salary?": "$90,000 / year",
        "Notice period?": "Immediate"
      }
    `;

    try {
      if (type === 'gemini') {
        const genAI = this.getClient(apiKey, 'gemini') as GoogleGenerativeAI;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return this.cleanAndParseJson(text);
      } else {
        const openai = this.getClient(apiKey, 'openai') as OpenAI;
        const response = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" }
        });
        const text = response.choices[0]?.message?.content || "{}";
        return JSON.parse(text);
      }
    } catch (error) {
      console.error("Error answering form questions with AI:", error);
      const answers: Record<string, string> = {};
      for (const q of questions) {
        answers[q] = "Please refer to attached resume.";
      }
      return answers;
    }
  }

  private static cleanAndParseJson(text: string): any {
    try {
      // Remove backticks/markdown block wrappers if present
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.substring(7);
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();
      return JSON.parse(cleanText);
    } catch (e) {
      console.error("JSON parsing error on text:", text);
      throw e;
    }
  }
}
