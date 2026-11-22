const http = require('http');
const { server, runLocalCallAgent, AGENTS, GRAMMAR_RULES } = require('./server.js');

let BASE = 'http://localhost:3000';

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
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
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
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
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

async function runFullSuite() {
  console.log('================================================================');
  console.log('🚀 ATHPEST Call Manager Agent — Deep Validation & Full Suite');
  console.log('================================================================\n');

  // Start in-process server on dynamic port
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      BASE = `http://127.0.0.1:${port}`;
      console.log(`[Test Server started on ${BASE}]\n`);
      resolve();
    });
  });

  // Suite 1: Static Files & Headers
  console.log('--- Suite 1: Server & Static Files ---');
  try {
    const resHome = await get('/');
    assert(resHome.status === 200, 'GET / returns 200');
    assert(resHome.headers['content-type'].includes('text/html'), 'Content-Type is text/html');
    assert(resHome.raw.includes('ATHPEST – Spoken English Call Manager Agent'), 'HTML contains correct title');
    assert(resHome.raw.includes('id="ph"'), 'Phone overlay container exists in HTML');
    assert(resHome.raw.includes('id="reportModal"'), 'Post-call report modal exists in HTML');
    assert(resHome.raw.includes('id="settingsModal"'), 'Settings modal exists in HTML');
    assert(resHome.raw.includes('id="agGrid"'), 'Agent selector grid exists in HTML');

    const resStatus = await get('/api/agent-status');
    assert(resStatus.status === 200, 'GET /api/agent-status returns 200');
    assert(resStatus.body.status === 'online', 'Server reports online');
  } catch (e) {
    assert(false, `Server error: ${e.message}`);
  }

  // Suite 2: All 4 Agent Personas
  console.log('\n--- Suite 2: Agent Persona Verification ---');
  const agents = ['aria', 'david', 'babe', 'alex'];
  for (const ag of agents) {
    try {
      const res = await post('/api/call-agent', {
        message: 'Hello, I am testing your persona.',
        scenario: 'Free talk',
        agentId: ag,
        provider: 'local'
      });
      assert(res.status === 200, `Agent "${ag}" responded successfully`);
      assert(res.body.agent.id === ag, `Response matches agent id "${ag}"`);
      assert(res.body.reply.length > 5, `Agent "${ag}" gave spoken reply: "${res.body.reply.slice(0, 40)}..."`);
    } catch (e) {
      assert(false, `Agent "${ag}" failed: ${e.message}`);
    }
  }

  // Suite 3: All 11 Scenarios Greetings
  console.log('\n--- Suite 3: All 11 Scenario Greetings ---');
  const scenarios = [
    "Free talk", "Daily conversation", "Self introduction", "Job Interview",
    "Office meeting", "Shopping", "Restaurant", "Travel Abroad",
    "Friends and family", "Higher Studies", "Promotion"
  ];
  for (const scen of scenarios) {
    try {
      const res = await post('/api/call-agent', {
        message: '(The call just connected. Greet me warmly and start the scenario.)',
        scenario: scen,
        agentId: 'aria',
        provider: 'local'
      });
      assert(res.status === 200, `Scenario "${scen}" greeting generated`);
      assert(res.body.reply.length > 15, `Greeting text: "${res.body.reply.slice(0, 45)}..."`);
    } catch (e) {
      assert(false, `Scenario "${scen}" failed: ${e.message}`);
    }
  }

  // Suite 4: 15+ Diverse Spoken English Mistakes
  console.log('\n--- Suite 4: Extensive Spoken English Mistake Detection ---');
  const errorCases = [
    { text: "He don't know the answer.", expectBetter: "doesn't", rule: "Subject-verb agreement (he don't)" },
    { text: "They doesn't like to come.", expectBetter: "don't", rule: "Subject-verb agreement (they doesn't)" },
    { text: "I didn't saw that film.", expectBetter: "didn't see", rule: "Past auxiliary (didn't saw)" },
    { text: "She didn't came to office.", expectBetter: "didn't come", rule: "Past auxiliary (didn't came)" },
    { text: "Did you went to market?", expectBetter: "did you go", rule: "Question auxiliary (did you went)" },
    { text: "Myself Rahul from Mumbai.", expectBetter: "I am Rahul", rule: "Self-intro (Myself Rahul)" },
    { text: "I am agree with your opinion.", expectBetter: "I agree", rule: "Stative verb (I am agree)" },
    { text: "I am having doubt in this chapter.", expectBetter: "I have", rule: "Stative verb (I am having doubt)" },
    { text: "I am having 24 years old.", expectBetter: "I am 24 years old", rule: "Age phrasing (I am having 24 years old)" },
    { text: "We will discuss about this tomorrow.", expectBetter: "discuss", rule: "Preposition with discuss (discuss about)" },
    { text: "Let's order for dinner now.", expectBetter: "order dinner", rule: "Preposition with order (order for)" },
    { text: "I will revert back to your email.", expectBetter: "reply / get back", rule: "Redundancy (revert back)" },
    { text: "Can you repeat again please?", expectBetter: "repeat", rule: "Redundancy (repeat again)" },
    { text: "It is hard to cope up with workload.", expectBetter: "cope with", rule: "Phrasal verb (cope up with)" },
    { text: "I will pass out from college next year.", expectBetter: "graduate from", rule: "Academic graduation (pass out)" },
    { text: "We need to take a decision quickly.", expectBetter: "make a decision", rule: "Collocation (take a decision)" },
    { text: "I look forward to meet you.", expectBetter: "meeting", rule: "Gerund (look forward to meet)" },
    { text: "He told to me the truth.", expectBetter: "told me", rule: "Indirect object (told to me)" },
    { text: "She is married with a doctor.", expectBetter: "married to", rule: "Preposition with married (married with)" },
    { text: "He is very good in math.", expectBetter: "good at", rule: "Preposition with skill (good in)" },
    { text: "This design is more better.", expectBetter: "better", rule: "Double comparative (more better)" },
    { text: "She gave me an advice.", expectBetter: "some advice", rule: "Uncountable noun (an advice)" },
    { text: "We bought new furnitures.", expectBetter: "furniture", rule: "Uncountable noun (furnitures)" }
  ];

  for (const tc of errorCases) {
    try {
      const res = await post('/api/call-agent', {
        message: tc.text,
        scenario: 'Free talk',
        agentId: 'david',
        provider: 'local'
      });
      assert(res.body.fixes && res.body.fixes.length > 0, `Mistake spotted for: "${tc.rule}"`);
      const found = res.body.fixes[0];
      const matches = found.better.toLowerCase().includes(tc.expectBetter.toLowerCase());
      assert(matches, `Expected correction "${tc.expectBetter}", got "${found.better}"`);
    } catch (e) {
      assert(false, `Test case failed for "${tc.rule}": ${e.message}`);
    }
  }

  // Suite 5: Call Summary & Diagnosis Endpoint
  console.log('\n--- Suite 5: Call Summary & Diagnosis Metrics ---');
  try {
    const summaryRes = await post('/api/call-summary', {
      scenario: 'Job Interview',
      durationSeconds: 185,
      mistakesCount: 1,
      transcript: [
        { role: 'user', content: 'Good morning, I am excited to interview today.' },
        { role: 'assistant', content: 'Welcome! Tell me about yourself.' },
        { role: 'user', content: 'I have three years of experience building web applications and leading team sprints.' }
      ]
    });
    assert(summaryRes.status === 200, 'POST /api/call-summary returns 200');
    assert(summaryRes.body.durationFormatted === '3m 5s', `Duration formatted properly: "${summaryRes.body.durationFormatted}"`);
    assert(summaryRes.body.wordsSpoken > 15, `Word count calculated: ${summaryRes.body.wordsSpoken}`);
    assert(summaryRes.body.fluencyScore >= 75, `High fluency score assigned: ${summaryRes.body.fluencyScore}%`);
  } catch (e) {
    assert(false, `Summary test failed: ${e.message}`);
  }

  // Suite 6: Save Configuration API
  console.log('\n--- Suite 6: Settings & Configuration API ---');
  try {
    const cfgRes = await post('/api/save-config', {
      geminiKey: '',
      openaiKey: ''
    });
    assert(cfgRes.status === 200, 'POST /api/save-config returns 200');
    assert(cfgRes.body.success === true, 'Configuration saved flag is true');
  } catch (e) {
    assert(false, `Config save failed: ${e.message}`);
  }

  // Suite 7: Universal 'Hello' Access Points & Fast Spoken Conversation
  console.log("\n--- Suite 7: Universal 'Hello' Access Points & Fast Reply ---");
  const helloPhrases = [
    { text: "Hello", desc: "Short direct 'Hello'" },
    { text: "Hello Aria!", desc: "Named greeting 'Hello Aria!'" },
    { text: "Hi, how are you doing today?", desc: "Conversational greeting 'Hi, how are you...'" },
    { text: "Good morning!", desc: "Time-based greeting 'Good morning!'" }
  ];

  for (const item of helloPhrases) {
    try {
      const res = await post('/api/call-agent', {
        message: item.text,
        scenario: 'Free talk',
        agentId: 'aria',
        provider: 'local'
      });
      assert(res.status === 200, `Greeting '${item.desc}' processed successfully`);
      assert(res.body.reply.toLowerCase().includes('hello') || res.body.reply.toLowerCase().includes('great') || res.body.reply.toLowerCase().includes('hear you'), `Reply acknowledges greeting: "${res.body.reply.slice(0, 50)}..."`);
      assert(Array.isArray(res.body.fixes) && res.body.fixes.length === 0, `Greeting '${item.desc}' recognized with 0 mistakes`);
    } catch (e) {
      assert(false, `Hello test '${item.desc}' failed: ${e.message}`);
    }
  }

  console.log('\n================================================================');
  console.log(`FINAL RESULT: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  try {
    server.close();
  } catch(e) {}

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runFullSuite();
