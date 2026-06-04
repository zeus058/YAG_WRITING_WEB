# SKILL: YAG Codebase Analyzer & Context Loader

## 🎯 Purpose
This skill empowers the Agent to rapidly understand the architecture, data flow, and specific implementation details of "YAG" (A smart story-writing web application integrated with Gemini AI). It should be invoked whenever the user asks for architectural changes, debugging complex interactions between the frontend and the AI services, or when starting a new major feature.

## 🚦 Triggers (When to use this skill)
Use this skill when the user's prompt involves:
* "Quét kiến trúc", "Hiểu codebase", "Phân tích luồng dữ liệu" (Scan architecture, Understand codebase, Analyze data flow).
* Debugging issues related to story generation, Gemini API integrations, or user authentication.
* Modifying database schemas (e.g., how stories, chapters, or user prompts are stored).
* Tracing requests from the frontend down to the serverless backend or AI inference endpoints.

## 🧠 Core Architecture Context (YAG Project)
* **Domain:** Smart Story Writing Assistant.
* **Core Features:** User management, Story/Chapter CRUD, AI-assisted writing (generating plots, completing sentences, character development using Gemini).
* **Security Posture:** Data privacy for user-generated stories, secure prompt handling (mitigating prompt injection), and secure API key management for Gemini integration.

## 📋 Execution Steps for the Agent

When triggered, execute the following steps to build context before answering the user:

### Step 1: Map the Project Structure
Run directory listing commands (`ls`, `tree`, or equivalent workspace read tools) to identify the root structure. Look specifically for:
* `/frontend` or `/client` (UI components, state management).
* `/backend`, `/api`, or `/functions` (Serverless functions, API routes).
* `/ai` or `/services/gemini` (Google AI Studio/Gemini API integration logic, system prompts).
* `/database` or `/prisma`/`/models` (Database schemas).

### Step 2: Analyze AI & LLM Integration
Identify how YAG communicates with Gemini. 
* Search for keywords: `GoogleGenerativeAI`, `generateContent`, `gemini-1.5-pro`, `gemini-1.5-flash`, `systemInstruction`.
* Analyze the prompt construction logic: How does the app format user inputs before sending them to Gemini? 
* Read files containing prompt templates to understand the AI's persona and constraints.

### Step 3: Trace Data Models & Storage
Examine the database schema files (e.g., `schema.prisma`, `.sql` files, or Mongoose models) to understand the relationships between:
* `User` (Authors)
* `Story` (Metadata like genre, synopsis)
* `Chapter` (Content blocks)
* `AI_History`/`Prompts` (Logs of interactions with Gemini for context continuity).

### Step 4: Security & Infrastructure Check
* Check how authentication is handled (e.g., JWT, OAuth, or custom token structures).
* Verify environment variable management (`.env.example`) to ensure API keys and database URIs are correctly structured.
* Analyze deployment configurations (e.g., Dockerfiles, Google Cloud Run configs, or serverless manifests) to understand how the app is built and scaled.

## 🛠️ Required Actions Before Replying
1. **Do not guess:** If a specific file is referenced (e.g., `ai_service.js`), use workspace tools to read its exact contents.
2. **Synthesize:** After scanning, briefly summarize your understanding of the relevant modules to the user to confirm you have the right context before proposing code changes.
3. **Security First:** Never output raw API keys or sensitive credentials found during the scan. Highlight security best practices when proposing new AI integrations.