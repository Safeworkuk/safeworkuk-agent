import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Set it in Render → Environment Variables.");
  process.exit(1);
}

const DATA_DIR = path.join(process.cwd(), 'data');
const AGENT_JSON_PATH = path.join(process.cwd(), 'safeworkuk_agent_full.json');
const EMB_PATH = path.join(DATA_DIR, 'faq_embeddings.json');
const LEADS_PATH = path.join(DATA_DIR, 'leads.json');

// Load agent JSON
const agentConfig = JSON.parse(fs.readFileSync(AGENT_JSON_PATH, 'utf-8'));
const corePrompt = agentConfig.core_prompt;
const faqs = agentConfig.faqs || [];
const signOff = agentConfig.branding?.sign_off || "";

// Ensure data dir
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Cosine similarity
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

// OpenAI helpers
async function openai(pathUrl, body) {
  const resp = await fetch(`https://api.openai.com/v1/${pathUrl}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${txt}`);
  }
  return resp.json();
}

async function embedTexts(texts) {
  const json = await openai('embeddings', {
    model: 'text-embedding-3-small',
    input: texts
  });
  return json.data.map(d => d.embedding);
}

// Build or load FAQ embeddings
let faqEmbeddings = [];
async function ensureEmbeddings() {
  if (fs.existsSync(EMB_PATH)) {
    faqEmbeddings = JSON.parse(fs.readFileSync(EMB_PATH, 'utf-8'));
    if (faqEmbeddings.length === faqs.length) return;
  }
  const texts = faqs.map(f => `${f.question}\n${f.answer}`);
  faqEmbeddings = await embedTexts(texts);
  fs.writeFileSync(EMB_PATH, JSON.stringify(faqEmbeddings, null, 2), 'utf-8');
}

// Rank FAQs
function topFAQIndices(queryEmbedding, k = 1) {
  const sims = faqEmbeddings.map(e => cosineSim(queryEmbedding, e));
  return sims.map((s, i) => ({ i, s }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(o => o.i);
}

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'Missing message' });

    await ensureEmbeddings();
    const [qEmb] = await embedTexts([message]);
    const [bestIdx] = topFAQIndices(qEmb, 1);
    const bestFAQ = faqs[bestIdx];

    const system = corePrompt;
    const knowledge = bestFAQ
      ? `Use this reference if relevant:\nQ: ${bestFAQ.question}\nA: ${bestFAQ.answer}`
      : "";

    const messages = [
      { role: 'system', content: system },
      ...(history || []).slice(-6),
      { role: 'system', content: knowledge },
      { role: 'user', content: message }
    ];

    const chat = await openai('chat/completions', {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      max_tokens: 600
    });

    let answer = chat.choices[0].message.content || "";
    if (signOff && !answer.trim().endsWith(signOff)) {
      answer += `\n\n${signOff}`;
    }
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Lead capture endpoint
app.post('/lead', async (req, res) => {
  try {
    const { name, email, phone, company, message } = req.body || {};
    if (!email && !phone) {
      return res.status(400).json({ error: 'Provide at least an email or phone.' });
    }
    const lead = {
      id: Date.now().toString(),
      name: (name || '').trim(),
      email: (email || '').trim(),
      phone: (phone || '').trim(),
      company: (company || '').trim(),
      message: (message || '').trim(),
      created_at: new Date().toISOString()
    };
    let leads = [];
    if (fs.existsSync(LEADS_PATH)) {
      leads = JSON.parse(fs.readFileSync(LEADS_PATH, 'utf-8'));
    }
    leads.push(lead);
    fs.writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2), 'utf-8');
    res.json({ ok: true, lead });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Serve widget assets
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`SafeWorkUK Agent API running on http://localhost:${PORT}`);
});
