const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Environment loader
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
    }
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

// 2. Agents Definitions
const AGENTS = {
  aria: {
    id: 'aria',
    name: 'Agent Aria',
    role: 'Executive Call Manager & Fluency Coach',
    avatar: '👩‍💼',
    voiceHint: 'en-US female confident',
    greeting: (scen) => `Hello! This is Agent Aria, your call manager and fluency coach. We're in the "${scen}" session. How are you doing today?`,
    systemPrompt: `You are Agent Aria, an executive spoken English call manager and communication coach.
Tone: Articulate, polished, supportive, highly professional yet warm.
Mission: Listen attentively, catch spoken English mistakes instantly, offer natural conversational replies (1-2 sentences), and end with a great follow-up question. Provide exact grammar corrections and a native "Say it like a pro" suggestion.`
  },
  david: {
    id: 'david',
    name: 'Coach David',
    role: 'Master Grammar & Mistake Hunter',
    avatar: '🧑‍🏫',
    voiceHint: 'en-US male articulate',
    greeting: (scen) => `Hi there! Coach David here. Ready for our "${scen}" phone practice? Tell me what you've been working on today!`,
    systemPrompt: `You are Coach David, a master English grammar specialist and error-hunter.
Tone: Precise, friendly, educational, encouraging.
Mission: Spot even subtle preposition, tense, and agreement mistakes. Keep replies conversational (1-2 sentences) with a follow-up question, and give clear, crisp explanations for every mistake.`
  },
  babe: {
    id: 'babe',
    name: 'Babe',
    role: 'Friendly Daily Conversational Partner',
    avatar: '👱‍♀️',
    voiceHint: 'en-US female friendly',
    greeting: (scen) => `Hey! Great to hear your voice. Let's do our quick daily call for "${scen}". What's on your mind right now?`,
    systemPrompt: `You are Babe, a warm, friendly, natural American English conversation partner.
Tone: Friendly, casual, encouraging, easygoing.
Mission: Chat naturally like two close friends on a phone call. Keep replies snappy (1-2 sentences), gently note mistakes without interrupting the vibe, and keep the user talking.`
  },
  alex: {
    id: 'alex',
    name: 'Agent Alex',
    role: 'Dynamic Interview & Career Coach',
    avatar: '👨‍💼',
    voiceHint: 'en-US male professional',
    greeting: (scen) => `Good day! Agent Alex here. Let's sharpen your career speaking and high-stakes communication for "${scen}". Ready to begin?`,
    systemPrompt: `You are Agent Alex, a dynamic executive interview and workplace communication coach.
Tone: Crisp, energetic, direct, structured.
Mission: Challenge the learner with realistic workplace and interview scenarios. Demand precision, point out filler words or weak phrasing, and offer powerful corporate alternatives.`
  }
};

// 3. Comprehensive Built-in Linguistic & Grammar Mistake Rule Base
const GRAMMAR_RULES = [
  // Subject - Verb Agreement
  {
    regex: /\b(he|she|it)\s+don't\b/i,
    better: "$1 doesn't",
    why: "With third-person singular (he, she, it), use 'doesn't' instead of 'don't'."
  },
  {
    regex: /\b(they|we|you)\s+doesn't\b/i,
    better: "$1 don't",
    why: "With plural subjects (they, we, you), use 'don't' instead of 'doesn't'."
  },
  {
    regex: /\b(he|she|it)\s+(go|do|want|need|have)\b/i,
    transform: (m) => {
      const v = m[2].toLowerCase();
      const map = { go: 'goes', do: 'does', want: 'wants', need: 'needs', have: 'has' };
      return `${m[1]} ${map[v] || v + 's'}`;
    },
    why: "Present simple verbs need an '-s' or '-es' when the subject is he, she, or it."
  },
  {
    regex: /\beveryone\s+are\b/i,
    better: "everyone is",
    why: "'Everyone' is grammatically singular and takes 'is', not 'are'."
  },
  {
    regex: /\beverybody\s+are\b/i,
    better: "everybody is",
    why: "'Everybody' is treated as singular; use 'everybody is'."
  },

  // Past Tense & Auxiliaries
  {
    regex: /\bdid\s*n['o]?t\s+(went|saw|ate|came|took|spoke|bought|wrote|did|knew|felt|thought|left|made|ran|heard)\b/i,
    transform: (m) => {
      const map = { went: 'go', saw: 'see', ate: 'eat', came: 'come', took: 'take', spoke: 'speak', bought: 'buy', wrote: 'write', did: 'do', knew: 'know', felt: 'feel', thought: 'think', left: 'leave', made: 'make', ran: 'run', heard: 'hear' };
      return `didn't ${map[m[1].toLowerCase()] || m[1]}`;
    },
    why: "After the auxiliary 'didn't', always use the base verb (infinitive without 'to')."
  },
  {
    regex: /\bdid\s+(you|he|she|they|we)\s+(went|saw|ate|came|took|spoke|bought|wrote)\b/i,
    transform: (m) => {
      const map = { went: 'go', saw: 'see', ate: 'eat', came: 'come', took: 'take', spoke: 'speak', bought: 'buy', wrote: 'write' };
      return `did ${m[1]} ${map[m[2].toLowerCase()] || m[2]}`;
    },
    why: "In questions with 'did', use the base verb (e.g., 'Did you go?', not 'Did you went?')."
  },
  {
    regex: /\bi\s+have\s+seen\s+him\s+yesterday\b/i,
    better: "I saw him yesterday",
    why: "Finished past time expressions like 'yesterday' require Past Simple ('saw'), not Present Perfect."
  },

  // Verb State & Indian/ESL Collocations
  {
    regex: /\bmyself\s+(is\s+)?([A-Za-z]+)\b/i,
    transform: (m) => `I am ${m[2]}`,
    why: "Avoid starting an introduction with 'Myself'; say 'I am' or 'My name is'."
  },
  {
    regex: /\bi\s+am\s+agree\b/i,
    better: "I agree",
    why: "'Agree' is already a full verb. Say 'I agree', not 'I am agree'."
  },
  {
    regex: /\bi\s+am\s+disagree\b/i,
    better: "I disagree",
    why: "'Disagree' is a verb. Say 'I disagree', not 'I am disagree'."
  },
  {
    regex: /\bi\s+am\s+having\s+(\d+|a|some)?\s*(years?\s+old|doubts?|questions?)\b/i,
    transform: (m) => {
      if (/year/i.test(m[2])) return `I am ${m[1] || ''} years old`.replace(/\s+/, ' ');
      const article = m[1] ? m[1] + ' ' : (/s$/i.test(m[2]) ? 'some ' : 'a ');
      return `I have ${article}${m[2]}`;
    },
    why: "For age say 'I am [X] years old', and for questions say 'I have a question' rather than 'I am having'."
  },
  {
    regex: /\bi\s+am\s+(knowing|understanding)\b/i,
    transform: (m) => m[1].toLowerCase() === 'knowing' ? "I know" : "I understand",
    why: "'Know' and 'understand' are stative verbs and rarely used in continuous (-ing) forms."
  },
  {
    regex: /\bdiscuss(ed|ing|es)?\s+about\b/i,
    transform: (m) => m[1] ? `discuss${m[1]}` : 'discuss',
    why: "'Discuss' is a transitive verb that takes a direct object without 'about'."
  },
  {
    regex: /\border(ed|ing|s)?\s+for\s+(food|coffee|tea|lunch|dinner|a\s+drink|pizza|[a-z]+)\b/i,
    transform: (m) => `order${m[1] || ''} ${m[2]}`,
    why: "Say 'order food', not 'order for food'."
  },
  {
    regex: /\brevert(ed|ing|s)?\s+back\b/i,
    transform: (m) => m[1] === 'ed' ? 'replied / got back' : (m[1] === 'ing' ? 'replying / getting back' : 'reply / get back'),
    why: "'Revert back' is redundant and outdated in modern English; use 'get back to you' or 'reply'."
  },
  {
    regex: /\brepeat(ed|ing|s)?\s+again\b/i,
    transform: (m) => `repeat${m[1] || ''}`,
    why: "'Repeat' already means saying something again; saying 'repeat again' is redundant."
  },
  {
    regex: /\bcop(e|ed|ing|es)\s+up\s+with\b/i,
    transform: (m) => `cop${m[1]} with`,
    why: "The correct English phrasal verb is 'cope with', without 'up'."
  },
  {
    regex: /\bpass\s+out\s+from\s+(college|university|school)\b/i,
    better: "graduate from $1",
    why: "'Pass out' means to faint or lose consciousness. Use 'graduate from' for academic completion."
  },
  {
    regex: /\bprepone\b/i,
    better: "bring forward / reschedule earlier",
    why: "'Prepone' is Indian English; in global business English, use 'advance' or 'bring forward'."
  },
  {
    regex: /\bdo\s+one\s+thing\b/i,
    better: "here's an idea / try this",
    why: "Instead of 'do one thing', use 'here's what you can do' or 'try this' for natural fluency."
  },
  {
    regex: /\btak(e|ing|es|en)\s+a\s+decision\b/i,
    transform: (m) => {
      const map = { take: 'make', taking: 'making', takes: 'makes', taken: 'made' };
      return `${map[m[1].toLowerCase()] || 'make'} a decision`;
    },
    why: "In English, the natural collocation is to 'make a decision', not 'take a decision'."
  },
  {
    regex: /\blook(ed|ing|s)?\s+forward\s+to\s+meet\s+([a-z]+)\b/i,
    transform: (m) => `look${m[1] || ''} forward to meeting ${m[2]}`,
    why: "'Look forward to' takes a gerund (-ing form), so say 'looking forward to meeting you'."
  },
  {
    regex: /\btold\s+to\s+(me|him|her|us|them)\b/i,
    transform: (m) => `told ${m[1]}`,
    why: "'Tell' takes an indirect object without 'to': 'He told me', not 'He told to me'."
  },
  {
    regex: /\bexplain(ed|s|ing)?\s+(me|him|her|us|them)\b/i,
    transform: (m) => `explain${m[1] || ''} to ${m[2]}`,
    why: "'Explain' requires the preposition 'to' before the person being addressed: 'explained to me'."
  },
  {
    regex: /\b(is|am|are|was|were|got)?\s*married\s+with\b/i,
    transform: (m) => (m[1] ? `${m[1]} ` : '') + 'married to',
    why: "In English, a person is 'married to' someone, not 'married with'."
  },
  {
    regex: /\bgood\s+in\s+(english|math|science|coding|sports)\b/i,
    better: "good at $1",
    why: "We use 'good at' for skills and abilities, e.g., 'good at English'."
  },
  {
    regex: /\bcongratulat(e|ed|ing|es)\s+([a-z]+)\s+for\b/i,
    transform: (m) => `congratulat${m[1]} ${m[2]} on`,
    why: "The preposition used with congratulate is 'on': 'congratulate you on your success'."
  },
  {
    regex: /\blisten(ed|ing|s)?\s+(me|him|her|us|them)\b/i,
    transform: (m) => `listen${m[1] || ''} to ${m[2]}`,
    why: "'Listen' requires the preposition 'to': 'listen to me'."
  },
  {
    regex: /\bpay(ing|s)?\s+attention\s+on\b/i,
    transform: (m) => `pay${m[1] || ''} attention to`,
    why: "The correct idiom is 'pay attention to', not 'pay attention on'."
  },
  {
    regex: /\baccording\s+to\s+me\b/i,
    better: "in my opinion / from my perspective",
    why: "'According to' is used for other sources or authorities. For yourself, say 'in my opinion'."
  },
  {
    regex: /\bmore\s+better\b/i,
    better: "much better / better",
    why: "'Better' is already comparative; do not combine 'more' with 'better'."
  },
  {
    regex: /\bmore\s+faster\b/i,
    better: "faster",
    why: "Use 'faster', not 'more faster'."
  },
  {
    regex: /\btoo\s+much\s+(good|nice|happy|beautiful)\b/i,
    transform: (m) => `very ${m[1]}`,
    why: "'Too much' has a negative connotation (excessive). Use 'very' or 'really' for positive emphasis."
  },
  {
    regex: /\ban\s+advice\b/i,
    better: "some advice / a piece of advice",
    why: "'Advice' is an uncountable noun. Say 'some advice' or 'a piece of advice', never 'an advice'."
  },
  {
    regex: /\ban\s+information\b/i,
    better: "some information / a piece of information",
    why: "'Information' is uncountable; use 'some information'."
  },
  {
    regex: /\bfurnitures\b/i,
    better: "furniture",
    why: "'Furniture' is an uncountable noun and does not have a plural 's'."
  },
  {
    regex: /\bequipments\b/i,
    better: "equipment",
    why: "'Equipment' is uncountable; use 'pieces of equipment' or just 'equipment'."
  },
  {
    regex: /\bfor\s+(\d+|many|two|three)\s+years\s+ago\b/i,
    transform: (m) => `${m[1]} years ago`,
    why: "Do not combine 'for' and 'ago'; say 'two years ago' or 'for two years'."
  },
  {
    regex: /\bsince\s+(\d+|two|three|several)\s+years\b/i,
    transform: (m) => `for ${m[1]} years`,
    why: "Use 'for' with periods/durations of time ('for three years'), and 'since' with points in time ('since 2021')."
  }
];

// 4. Local NLP Call Agent Engine
function runLocalCallAgent(text, scenario, agentKey, history) {
  const raw = String(text || '').trim();
  const lower = raw.toLowerCase();
  const agent = AGENTS[agentKey] || AGENTS.aria;

  // 4a. Error detection
  const fixes = [];
  for (const rule of GRAMMAR_RULES) {
    const m = raw.match(rule.regex);
    if (m) {
      let better = rule.better;
      if (typeof rule.transform === 'function') {
        better = rule.transform(m);
      } else if (typeof better === 'string') {
        better = m[0].replace(rule.regex, better);
      }
      const situation = raw.replace(m[0], better);
      fixes.push({
        said: m[0],
        better: better,
        why: rule.why,
        situation: situation
      });
      break; // Pick primary prominent mistake per turn for conversational ease
    }
  }

  // 4b. Dynamic contextual response generator
  let reply = '';
  let praise = '';
  let pro = '';
  let tip = '';

  const isGreeting = /^(\(the call|\(i changed|call connected|hello|hi|hey|good\s*(morning|afternoon|evening)|howdy)/i.test(lower);
  const userWordCount = raw.split(/\s+/).filter(Boolean).length;

  if (isGreeting) {
    if (/^(hello|hi|hey|good\s*(morning|afternoon|evening)|howdy)\b/i.test(lower)) {
      reply = `Hello! I hear you loud and clear. It's great to connect! How are you doing today? What would you like to discuss in this ${scenario} session?`;
    } else {
      const greetings = {
        'Free talk': `${agent.name} here! It's fantastic to connect. How has your day been treating you so far?`,
        'Daily conversation': `Good to speak with you! Let's get right into today's conversation. What have you been up to?`,
        'Self introduction': `Hello! I'm ${agent.name}. In this session, let's practice introducing yourself with impact. What's your name, and what do you do?`,
        'Job Interview': `Welcome to this interview session. I'm ${agent.name}. To kick things off, could you walk me through your background and what you specialize in?`,
        'Office meeting': `Hi everyone, let's get our meeting underway. What's the main update or project milestone you'd like to share today?`,
        'Shopping': `Hello! Welcome to our store. Are you looking for anything specific today, or just browsing around?`,
        'Restaurant': `Good evening, welcome! Have you had a chance to look over our menu, or would you like a quick recommendation?`,
        'Travel Abroad': `Welcome to airport check-in! Where are you flying today, and do you have any luggage to check?`,
        'Friends and family': `Hey! So glad we caught up today. What's new with you recently? Anything exciting?`,
        'Higher Studies': `Hello! Welcome to our seminar discussion. What subject are you focusing on, and what's an interesting topic you've explored?`,
        'Promotion': `Thanks for meeting with me to discuss your career progression. What key accomplishments from the past quarter are you most proud of?`
      };
      reply = greetings[scenario] || greetings['Free talk'];
    }
    praise = 'Connection established! Speak naturally.';
    pro = 'Ready when you are! Let’s practice fluent, confident speaking.';
  } else {
    // Context-sensitive natural conversation replies
    if (lower.includes('?') || /^(what|how|why|when|where|who|can you|could you)/i.test(lower)) {
      reply = `That's an insightful question. From my perspective, focusing on clarity and steady practice makes all the difference. How do you usually approach that in your daily routine?`;
    } else if (/\b(developer|software|code|python|javascript|engineer|tech|design)\b/i.test(lower)) {
      reply = `That's a very in-demand field with continuous learning. What kind of projects or challenges do you find most rewarding when you're working on them?`;
    } else if (/\b(learn|study|english|practice|speaking|grammar)\b/i.test(lower)) {
      reply = `Consistent daily speaking practice is the fastest way to build fluency. What aspect of speaking do you find most challenging—finding the right words, or speaking without hesitation?`;
    } else if (/\b(job|interview|career|company|work|office|boss|team)\b/i.test(lower)) {
      reply = `Workplace communication requires both diplomacy and confidence. Could you share an example of how you and your team overcome unexpected hurdles?`;
    } else if (/\b(hobby|music|movie|weekend|relax|travel|food|cook)\b/i.test(lower)) {
      reply = `That sounds really enjoyable! Having personal passions helps keep a balanced life. How often do you get the time to indulge in that?`;
    } else if (/\b(because|reason|since|due to)\b/i.test(lower)) {
      reply = `I see your reasoning, and that makes total sense. Could you elaborate on one specific experience that shaped that view?`;
    } else if (userWordCount < 4) {
      reply = `I hear you! To practice expanding your thoughts, could you add two or three more details explaining why or how?`;
    } else {
      const conversationalAffirmations = [
        "That's a very compelling point.",
        "I completely understand what you mean.",
        "That makes a lot of sense.",
        "You expressed that thought very clearly."
      ];
      const randomAffirmation = conversationalAffirmations[Math.floor(Math.random() * conversationalAffirmations.length)];
      reply = `${randomAffirmation} When you reflect on that experience, what was the biggest takeaway or next step you took?`;
    }

    // Generate 'Say it like a pro'
    if (raw.length > 8) {
      pro = raw
        .replace(/\bwant to\b/gi, 'would like to')
        .replace(/\bvery good\b/gi, 'exceptional')
        .replace(/\ba lot of\b/gi, 'a substantial amount of')
        .replace(/\bi think\b/gi, 'in my view')
        .replace(/\bhelp me\b/gi, 'assist me')
        .replace(/^i\b/, 'I')
        .replace(/\bi\b/g, 'I');
      if (pro === raw) {
        pro = `In professional settings, you might phrase this as: "Speaking from my experience, ${raw.charAt(0).toLowerCase() + raw.slice(1)}"`;
      }
    }

    if (fixes.length > 0) {
      tip = `Pay attention to '${fixes[0].better}'. Keep an ear out for this pattern in conversational English.`;
      praise = "Good effort expressing your thought! Notice the small correction below.";
    } else {
      praise = "Smooth phrasing and accurate grammar! Your fluency is showing.";
      tip = "Try using varied transitional phrases like 'Furthermore' or 'Consequently' to sound even more polished.";
    }
  }

  return {
    reply,
    fixes,
    pro: pro || raw,
    tip,
    praise,
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role
    }
  };
}

// 5. External AI integration (Gemini & OpenAI)
async function runExternalAI(userText, scenario, agentKey, history, apiKey, provider) {
  const agent = AGENTS[agentKey] || AGENTS.aria;
  const recentHistory = (history || []).slice(-8).map(h => `${h.role === 'user' ? 'Learner' : agent.name}: ${h.content}`).join('\n');

  const systemInstructions = `${agent.systemPrompt}
Scenario: ${scenario}
Learner's message: "${userText}"
Recent conversation:
${recentHistory}

Analyze the learner's last message for spoken English errors (grammar, prepositions, awkward collocations).
Respond strictly in JSON format matching this schema:
{
  "reply": "Your spoken conversational reply (1-2 sentences maximum, natural, warm, ending with a question)",
  "fixes": [
    {
      "said": "exact wrong phrase learner used",
      "better": "clean corrected phrase",
      "why": "simple one-sentence grammar reason",
      "situation": "natural complete sentence using the correction"
    }
  ],
  "pro": "one native-like, professional, idiomatic phrasing of what the learner tried to say",
  "tip": "one short, practical spoken English tip, or empty string",
  "praise": "brief encouraging compliment, or empty string"
}
If there are no mistakes in the learner's message, "fixes" MUST be an empty array [].
Keep your "reply" concise, crisp, and conversational because it will be spoken out loud.`;

  // 5a. Gemini API
  if ((provider === 'gemini' || (!provider && process.env.GEMINI_API_KEY)) && (apiKey || process.env.GEMINI_API_KEY)) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const payload = {
      contents: [{ role: 'user', parts: [{ text: systemInstructions }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 800
      }
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err}`);
    }
    const data = await res.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) throw new Error('Empty Gemini response');
    const parsed = JSON.parse(rawJson);
    parsed.agent = { id: agent.id, name: agent.name, role: agent.role };
    return parsed;
  }

  // 5b. OpenAI API
  if ((provider === 'openai' || (!provider && process.env.OPENAI_API_KEY)) && (apiKey || process.env.OPENAI_API_KEY)) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const payload = {
      model,
      messages: [
        { role: 'system', content: 'You are an English coach. Return only valid JSON.' },
        { role: 'user', content: systemInstructions }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 600
    };
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }
    const data = await res.json();
    const rawJson = data.choices?.[0]?.message?.content;
    if (!rawJson) throw new Error('Empty OpenAI response');
    const parsed = JSON.parse(rawJson);
    parsed.agent = { id: agent.id, name: agent.name, role: agent.role };
    return parsed;
  }

  // Fallback to local engine
  return runLocalCallAgent(userText, scenario, agentKey, history);
}

// 6. JSON responder helper
function sendJSON(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(obj));
}

// 7. Request Listener
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // API 1: Agent status
  if (req.method === 'GET' && req.url === '/api/agent-status') {
    return sendJSON(res, 200, {
      status: 'online',
      version: '2.0.0',
      port: PORT,
      agents: AGENTS,
      configuredProviders: {
        gemini: Boolean(process.env.GEMINI_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
        localNLP: true
      }
    });
  }

  // API 2: Call Agent Turn
  if (req.method === 'POST' && req.url === '/api/call-agent') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2_000_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const input = JSON.parse(body || '{}');
        const text = input.message || '';
        const scenario = input.scenario || 'Free talk';
        const agentKey = input.agentId || 'aria';
        const history = input.history || [];
        const apiKey = input.apiKey || '';
        const provider = input.provider || 'auto';

        let result;
        try {
          if (provider !== 'local' && (apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)) {
            result = await runExternalAI(text, scenario, agentKey, history, apiKey, provider);
          } else {
            result = runLocalCallAgent(text, scenario, agentKey, history);
          }
        } catch (aiErr) {
          console.warn('[CallAgent] External AI error, using local engine:', aiErr.message);
          result = runLocalCallAgent(text, scenario, agentKey, history);
        }

        return sendJSON(res, 200, result);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message || 'Call handling error' });
      }
    });
    return;
  }

  // API 3: Call End Summary
  if (req.method === 'POST' && req.url === '/api/call-summary') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2_000_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const input = JSON.parse(body || '{}');
        const transcript = input.transcript || [];
        const scenario = input.scenario || 'Free talk';
        const duration = input.durationSeconds || 0;
        const totalMistakes = input.mistakesCount || 0;

        const userTurns = transcript.filter(t => t.role === 'user');
        const wordsSpoken = userTurns.reduce((acc, t) => acc + (t.content || '').split(/\s+/).filter(Boolean).length, 0);

        // Calculate CEFR and fluency metrics
        let cefr = 'B1';
        let score = 75;
        if (wordsSpoken > 80 && totalMistakes <= 2) {
          cefr = 'B2';
          score = 88;
        }
        if (wordsSpoken > 140 && totalMistakes <= 1) {
          cefr = 'C1';
          score = 95;
        }
        if (totalMistakes > 5) {
          score = Math.max(50, score - (totalMistakes * 4));
        }

        const summary = {
          scenario,
          durationFormatted: `${Math.floor(duration / 60)}m ${duration % 60}s`,
          userTurnsCount: userTurns.length,
          wordsSpoken,
          cefrLevel: cefr,
          fluencyScore: score,
          mistakesCount: totalMistakes,
          recommendation: totalMistakes === 0
            ? "Outstanding performance! You spoke clearly with natural phrasing and zero grammar slips."
            : `Great job practicing! Review the ${totalMistakes} highlighted correction${totalMistakes > 1 ? 's' : ''} in your notebook before your next call.`
        };

        return sendJSON(res, 200, summary);
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    });
    return;
  }

  // API 4: Save Config
  if (req.method === 'POST' && req.url === '/api/save-config') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const input = JSON.parse(body || '{}');
        if (input.geminiKey !== undefined) process.env.GEMINI_API_KEY = input.geminiKey;
        if (input.openaiKey !== undefined) process.env.OPENAI_API_KEY = input.openaiKey;

        // Persist to .env
        const lines = [
          `PORT=${PORT}`,
          `GEMINI_API_KEY=${process.env.GEMINI_API_KEY || ''}`,
          `OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}`,
          `DEFAULT_AGENT=${process.env.DEFAULT_AGENT || 'aria'}`,
          `NLP_PROVIDER=${process.env.NLP_PROVIDER || 'auto'}`
        ];
        fs.writeFileSync(path.join(__dirname, '.env'), lines.join('\n'), 'utf8');
        return sendJSON(res, 200, { success: true, message: 'Configuration saved' });
      } catch (err) {
        return sendJSON(res, 500, { error: err.message });
      }
    });
    return;
  }

  // Static File Serving
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJSON(res, 405, { error: 'Method not allowed' });
  }

  const cleanUrl = (req.url || '/').split('?')[0];
  const relativePath = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT, relativePath);

  if (!filePath.startsWith(ROOT)) {
    return sendJSON(res, 403, { error: 'Access forbidden' });
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return sendJSON(res, 404, { error: 'File not found' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

let currentPort = PORT;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    currentPort++;
    console.warn(`⚠️ Port ${currentPort - 1} is in use. Retrying on port ${currentPort}...`);
    setTimeout(() => {
      server.listen(currentPort, '0.0.0.0');
    }, 250);
  } else {
    console.error('Server error:', err);
  }
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 ATHPEST Call Manager Agent is running!`);
    console.log(`🔗 Local URL: http://localhost:${currentPort}`);
    console.log(`🤖 Default Agent: ${AGENTS.aria.name} (${AGENTS.aria.role})`);
    console.log(`🎙️ Mistake Detection: ACTIVE (Real-time Spoken English Analysis)`);
    console.log(`====================================================`);
  });
}

module.exports = {
  server,
  runLocalCallAgent,
  AGENTS,
  GRAMMAR_RULES,
  PORT
};

