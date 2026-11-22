# 📞 ATHPEST — AI Spoken English Call Manager Agent

A full-stack, real-time AI Phone Call Manager Agent designed for mastering spoken English fluency with real-time mistake detection, conversational flow management, and full call lifecycle control.

---

## 🌟 Key Features

### 1. 🤖 Dedicated Call Manager Agents
Choose your specialized conversation partner:
- **👩‍💼 Agent Aria (Executive Call Manager & Fluency Coach)**: Polished, corporate, articulate; spots subtle nuances and provides executive phrasing.
- **🧑‍🏫 Coach David (Master Grammar & Error Hunter)**: Deep linguistic precision; spots tricky prepositions, tenses, and agreement rules.
- **👱‍♀️ Babe (Friendly Daily Partner)**: Warm, casual, low-stress daily phone chats for building conversational confidence.
- **👨‍💼 Agent Alex (Dynamic Interview & Career Coach)**: High-stakes interview prep, assertive corporate communication, and leadership speaking.

### 2. 📱 Realistic Phone Call Simulation
- **Authentic Dual-Frequency Ringtone**: Uses Web Audio API dual-tone synthesis (440Hz + 480Hz US telephone standard).
- **Incoming Call Screen**: Animated caller avatar, caller role, Accept & Decline buttons.
- **Direct Call Mode**: Jump straight into a call without waiting for ring.
- **Real-Time Audio Waveform**: Live canvas visualizer animating in response to your voice and the agent's voice.
- **Call Connect & Disconnect Chimes**: Authentic telephone audio cues.

### 3. 🔍 Real-Time Mistake Detection & Coaching
- **Instant Error Catching**: Detects 100+ categories of spoken English mistakes:
  - Subject-verb agreement (`she don't` ➔ `she doesn't`)
  - Past tense auxiliaries (`didn't went` ➔ `didn't go`)
  - Prepositions (`discussed about` ➔ `discussed`, `told to me` ➔ `told me`)
  - Stative verbs (`I am agree` ➔ `I agree`, `I am having doubt` ➔ `I have a doubt`)
  - ESL / Collocation transfers (`take a decision` ➔ `make a decision`, `revert back` ➔ `reply`)
- **"Say It Like A Pro"**: After every turn, the agent suggests a native, idiomatic phrasing of what you wanted to say.
- **Floating In-Call Notification**: Instant banner alert appears on your phone screen when a mistake is spotted.

### 4. 🛑 Complete Call Termination & Microphone Safety
- **When you tap "End Call" (or Decline)**:
  1. **Hardware Microphone**: All media stream tracks (`activeStream.getTracks().forEach(t => t.stop())`) are terminated immediately. The red recording dot in your browser tab turns OFF.
  2. **Speech Recognition**: Recognition is immediately aborted and nulled; it will **never** restart in the background.
  3. **Speech Synthesis**: Any ongoing agent voice is immediately canceled (`speechSynthesis.cancel()`).
  4. **Timers & Visualizers**: Ring loops, silence detectors, and canvas animation frames are completely cleared.

### 5. 📊 Post-Call Mistake Diagnosis Report
Upon ending a call, a comprehensive diagnostic report pops up:
- **Fluency Score & CEFR Level**: Quantitative rating (e.g., 85% · B2 Level).
- **Detailed Mistakes Breakdown**: Side-by-side view of what you said vs. the corrected sentence, plus the grammar rule explanation.
- **Interactive Audio Pronunciation**: Tap the 🔊 button next to any mistake to hear the native pronunciation of the correct phrase!
- **Notebook Integration**: Save mistakes directly into your permanent Mistake Notebook.

### 6. ⚡ Multi-Provider Architecture (Gemini, OpenAI, Local NLP)
- **Built-in Local Smart Agent**: 100% free, runs locally with ultra-fast latency (<15ms), zero API key needed.
- **Google Gemini 2.5 Flash**: Connect your Gemini API key in Settings or `.env`.
- **OpenAI GPT-4o-mini**: Connect your OpenAI key in Settings or `.env`.

---

## 🚀 Quick Start

### 1. Launch with 1-Click (Windows)
Double-click `start.bat`. This starts the server on port 3000 and automatically opens your browser.

### 2. Launch via Terminal
```bash
# Start the full-stack server
npm start
# or
node server.js
```
Open **http://localhost:3000** in Chrome or Edge.

---

## 🧪 Automated Testing

Run the automated test suite to verify all agent endpoints, mistake detection rules, and latency:
```bash
npm test
# or
node test_agent.js
```
All 24 automated tests validate:
- Status & health endpoint
- Spoken greeting generation
- Latency benchmarks (< 100ms)
- Subject-verb agreement fixes
- Past tense fixes
- Preposition fixes
- Collocation fixes
- Clean sentence handling (zero false positives)
- Post-call summary and score computation
