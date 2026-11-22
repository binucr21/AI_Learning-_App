const http = require('http');

const PORT = 3000;
const BASE = `http://localhost:${PORT}`;

function post(endpoint, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`${BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${endpoint}`, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', reject);
  });
}

let passed = 0;
let failed = 0;

function assert(cond, desc) {
  if (cond) {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    failed++;
  }
}

async function runTests() {
  console.log('🧪 Starting ATHPEST Call Manager Agent Test Suite...\n');

  // Test 1: Health / Status
  try {
    const res = await get('/api/agent-status');
    assert(res.status === 200, 'GET /api/agent-status returns HTTP 200');
    assert(res.body.status === 'online', 'Status is online');
    assert(Boolean(res.body.agents.aria), 'Agent Aria exists in agents catalog');
    assert(Boolean(res.body.agents.david), 'Coach David exists in agents catalog');
  } catch (err) {
    assert(false, `Server health check failed: ${err.message}`);
  }

  // Test 2: Call Initiation / Greeting
  try {
    const t0 = Date.now();
    const res = await post('/api/call-agent', {
      message: '(The call just connected. Greet me warmly and start the scenario.)',
      scenario: 'Job Interview',
      agentId: 'aria',
      provider: 'local'
    });
    const dt = Date.now() - t0;
    assert(res.status === 200, 'POST /api/call-agent greeting returns HTTP 200');
    assert(res.body.reply && res.body.reply.length > 10, 'Agent returns a natural spoken greeting');
    assert(dt < 100, `Greeting response latency is ultra-fast (${dt}ms < 100ms)`);
  } catch (err) {
    assert(false, `Greeting test failed: ${err.message}`);
  }

  // Test 3: Mistake Detection - "she don't know"
  try {
    const res = await post('/api/call-agent', {
      message: 'She don\'t know how to do that.',
      scenario: 'Office meeting',
      agentId: 'david',
      provider: 'local'
    });
    assert(res.status === 200, 'Call agent returns HTTP 200 on error turn');
    assert(res.body.fixes && res.body.fixes.length > 0, 'Mistake detected for subject-verb agreement');
    assert(/doesn't/i.test(res.body.fixes[0].better), 'Correction properly suggests "doesn\'t"');
  } catch (err) {
    assert(false, `Subject-verb test failed: ${err.message}`);
  }

  // Test 4: Mistake Detection - "didn't went"
  try {
    const res = await post('/api/call-agent', {
      message: 'Yesterday I didn\'t went to the office because I was sick.',
      scenario: 'Free talk',
      agentId: 'aria',
      provider: 'local'
    });
    assert(res.body.fixes && res.body.fixes.length > 0, 'Mistake detected for "didn\'t went"');
    assert(/didn't go/i.test(res.body.fixes[0].better), 'Corrected to "didn\'t go"');
  } catch (err) {
    assert(false, `Past tense test failed: ${err.message}`);
  }

  // Test 5: Mistake Detection - "discussed about"
  try {
    const res = await post('/api/call-agent', {
      message: 'In our morning sync we discussed about the marketing budget.',
      scenario: 'Office meeting',
      agentId: 'alex',
      provider: 'local'
    });
    assert(res.body.fixes && res.body.fixes.length > 0, 'Mistake detected for "discussed about"');
    assert(/discussed/i.test(res.body.fixes[0].better), 'Corrected to "discussed" without "about"');
  } catch (err) {
    assert(false, `Preposition test failed: ${err.message}`);
  }

  // Test 6: Mistake Detection - "I am agree"
  try {
    const res = await post('/api/call-agent', {
      message: 'I am agree with your proposal.',
      scenario: 'Office meeting',
      agentId: 'aria',
      provider: 'local'
    });
    assert(res.body.fixes && res.body.fixes.length > 0, 'Mistake detected for "I am agree"');
    assert(/I agree/i.test(res.body.fixes[0].better), 'Corrected to "I agree"');
  } catch (err) {
    assert(false, `I am agree test failed: ${err.message}`);
  }

  // Test 7: Clean sentence without mistakes
  try {
    const res = await post('/api/call-agent', {
      message: 'I have been working as a software engineer for three years, and I really enjoy collaborating with my team.',
      scenario: 'Job Interview',
      agentId: 'aria',
      provider: 'local'
    });
    assert(res.status === 200, 'Returns HTTP 200 for clean sentence');
    assert(res.body.fixes.length === 0, 'Zero false mistakes flagged on clean sentence');
    assert(Boolean(res.body.pro), 'Provides a polished "Say it like a pro" suggestion');
    assert(Boolean(res.body.reply), 'Provides a natural conversational follow-up reply');
  } catch (err) {
    assert(false, `Clean sentence test failed: ${err.message}`);
  }

  // Test 8: Call Summary Endpoint
  try {
    const res = await post('/api/call-summary', {
      scenario: 'Job Interview',
      durationSeconds: 125,
      mistakesCount: 2,
      transcript: [
        { role: 'user', content: 'Hello, I am excited for this interview.' },
        { role: 'assistant', content: 'Great to have you. Tell me about your background.' },
        { role: 'user', content: 'I worked at ABC company where I managed five engineers.' }
      ]
    });
    assert(res.status === 200, 'POST /api/call-summary returns HTTP 200');
    assert(res.body.fluencyScore > 0, `Fluency score calculated: ${res.body.fluencyScore}`);
    assert(Boolean(res.body.cefrLevel), `CEFR level assigned: ${res.body.cefrLevel}`);
    assert(Boolean(res.body.recommendation), 'Actionable recommendation provided');
  } catch (err) {
    assert(false, `Call summary test failed: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
