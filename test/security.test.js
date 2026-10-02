const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

process.env.SESSION_SECRET = 'test-only-secret-abcdefghijklmnopqrstuvwxyz';
process.env.GOOGLE_CLIENT_ID = 'test.apps.googleusercontent.com';
process.env.OPENAI_API_KEY = 'test-key';

const auth = require('../auth');
const ai = require('../services/openaiService');

test('evaluation tokens are bound to the authenticated email', () => {
  const owner = { email: 'owner@example.com' };
  const token = auth.signEvaluation(owner, { question: 'Why?', evaluation: { score: 0 } });
  assert.equal(auth.verifyEvaluation(owner, token).evaluation.score, 0);
  assert.throws(() => auth.verifyEvaluation({ email: 'other@example.com' }, token), /invalid or expired/);
});

test('score boundaries are deterministic, including zero', () => {
  assert.equal(ai.expectedStatus(0), 'HIGH_RISK');
  assert.equal(ai.expectedStatus(54), 'HIGH_RISK');
  assert.equal(ai.expectedStatus(55), 'NEEDS_REVISION');
  assert.equal(ai.expectedStatus(75), 'PASS');
});

test('short answers are rejected before an external AI request', async () => {
  await assert.rejects(() => ai.evaluateAnswer({ transcript: 'too short' }), error => error.status === 400);
});

test('the model status cannot override the score status', async t => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify({
      score: 0, status: 'PASS', better_way: 'A clearer answer.', strengths: [], risks: ['Missing detail'], quick_tip: 'Add facts.'
    }) } }] })
  });
  const result = await ai.evaluateAnswer({ question: 'Why?', transcript: 'This is my complete answer.' });
  assert.equal(result.score, 0);
  assert.equal(result.status, 'HIGH_RISK');
});

test('HTML templates cannot bypass Express through Vercel static hosting', () => {
  const publicDirectory = path.join(__dirname, '..', 'public');
  const publicHtmlFiles = fs.readdirSync(publicDirectory).filter(file => file.endsWith('.html'));
  assert.deepEqual(publicHtmlFiles, []);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'views', 'admin.html')), true);
});

test('HTTP routes keep source, admin data, and forged sessions private', async t => {
  const app = require('../server');
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  const home = await fetch(`${base}/index.html`);
  const csp = home.headers.get('content-security-policy') || '';
  const homeHtml = await home.text();
  assert.equal(home.status, 200);
  assert.equal(home.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
  assert.match(csp, /script-src 'self' 'nonce-/);
  assert.doesNotMatch(csp.split(';').find(part => part.trim().startsWith('script-src ')), /unsafe-inline/);
  assert.match(homeHtml, /<script nonce="[^"]+"/);
  assert.equal((await fetch(`${base}/server.js`)).status, 404);
  assert.equal((await fetch(`${base}/admin.html`, { redirect: 'manual' })).status, 302);
  assert.equal((await fetch(`${base}/api/admin/stats`)).status, 401);

  let sessionToken;
  auth.issueSession({ cookie: (_name, value) => { sessionToken = value; } }, { id: 'test-user', email: 'candidate@example.com', name: 'Candidate' });
  const forged = await fetch(`${base}/api/sessions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `melete_session=${sessionToken}` },
    body: JSON.stringify({ university: 'Test', country: 'Test', framework: 'Test', practice_type: 'mock', duration: '00:10', answers: [{ evaluationToken: 'not-a-valid-evaluation-token-value' }] })
  });
  assert.equal(forged.status, 400);
});
