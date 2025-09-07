# SafeWorkUK Agent — OpenAI Self‑Hosted Starter

This starter lets you run your **SafeWorkUK Agent** with the OpenAI API and embed a chat widget on your Squarespace site.

## What you get
- `server/` — Node.js Express API that:
  - Loads your `safeworkuk_agent_full.json` (core prompt + FAQs + branding)
  - Optionally builds embeddings for FAQ search using OpenAI
  - Exposes `POST /chat` to answer website chat messages
- `public/` — Minimal web widget you can embed on Squarespace (floating chat bubble)
- `safeworkuk_agent_full.json` — Your agent brain (prompt + 20 FAQs)

## Quick start (Local)
1) Install Node 18+
2) Copy your OpenAI API Key:
   ```bash
   cp .env.example .env
   # edit .env and set OPENAI_API_KEY=sk-...
   ```
3) Install & run:
   ```bash
   npm install
   npm run dev
   ```
4) Open http://localhost:3000 then try the demo widget at http://localhost:3000/widget.html

## Deploy (Render – simple)
1) Push this folder to a new Git repo (GitHub).
2) Create a new **Render Web Service**:
   - Build command: `npm install`
   - Start command: `npm start`
   - Add environment variable: `OPENAI_API_KEY`
3) After deploy, note your public base URL, e.g. `https://safeworkuk-agent.onrender.com`

## Deploy (Vercel – serverless)
1) Move `server/index.js` logic into `api/chat.js` (Vercel function) or keep Express using a `vercel.json` config.
2) Set **Environment Variables**: `OPENAI_API_KEY`
3) Deploy via Vercel CLI or GitHub import.

## Squarespace embed
- **Site‑wide bubble**: Settings → Advanced → Code Injection → **FOOTER** and paste:
  ```html
  <script src="https://YOUR_DOMAIN/widget.js" defer></script>
  ```
- **Single page**: add a **Code Block** and paste:
  ```html
  <script src="https://YOUR_DOMAIN/widget.js" defer></script>
  <div id="safeworkuk-chat-root"></div>
  ```

## How it works
- The server loads `safeworkuk_agent_full.json` and sets the **system prompt**.
- On each user message:
  1) It runs **semantic search** over FAQs (using OpenAI embeddings) to find the top match.
  2) It sends the system prompt + the most relevant FAQ answer (as contextual knowledge) + the user's message to the Chat Completions API.
  3) It returns a structured, branded reply.
- All answers end with your sign‑off.

## Notes
- This starter calls models: `text-embedding-3-small` (for search) and `gpt-4o-mini` (for chat). Feel free to upgrade to `gpt-4o`.
- CORS is enabled so you can host the API anywhere and embed on Squarespace.
- For speed/cost, embeddings are cached to `data/faq_embeddings.json` after first run.

---
SafeWorkUK – Keeping UK workplaces safe, compliant and confident.
