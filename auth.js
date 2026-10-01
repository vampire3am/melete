const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const COOKIE_NAME = 'melete_session';
const SESSION_HOURS = 8;

function requiredEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sessionSecret() {
  const secret = requiredEnv('SESSION_SECRET');
  if (secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  return secret;
}

function googleClientId() {
  return requiredEnv('GOOGLE_CLIENT_ID');
}

function adminEmails() {
  return new Set((process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean));
}

async function verifyGoogleCredential(credential) {
  if (!credential || typeof credential !== 'string') throw new Error('Google credential is required');
  const clientId = googleClientId();
  const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email || payload.email_verified !== true) {
    throw new Error('Google account could not be verified');
  }
  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.given_name || 'Candidate',
    picture: payload.picture || ''
  };
}

function roleFor(email) {
  return adminEmails().has(String(email).toLowerCase()) ? 'admin' : 'candidate';
}

function issueSession(res, user) {
  const claims = { sub: user.id, email: user.email, name: user.name, picture: user.picture || '', role: roleFor(user.email) };
  const token = jwt.sign(claims, sessionSecret(), {
    algorithm: 'HS256', expiresIn: `${SESSION_HOURS}h`, issuer: 'melete', audience: 'melete-web'
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60 * 1000
  });
  return claims;
}

function clearSession(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL), path: '/' });
}

function readSession(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const claims = jwt.verify(token, sessionSecret(), { algorithms: ['HS256'], issuer: 'melete', audience: 'melete-web' });
    return { ...claims, role: roleFor(claims.email) };
  } catch (_) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = readSession(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Administrator access required' });
  req.user = user;
  next();
}

function signEvaluation(user, payload) {
  return jwt.sign({ typ: 'evaluation', email: user.email, payload }, sessionSecret(), {
    algorithm: 'HS256', expiresIn: '1h', issuer: 'melete', audience: 'melete-evaluation'
  });
}

function verifyEvaluation(user, token) {
  try {
    const value = jwt.verify(token, sessionSecret(), { algorithms: ['HS256'], issuer: 'melete', audience: 'melete-evaluation' });
    if (value.typ !== 'evaluation' || value.email !== user.email) throw new Error('Evaluation does not belong to this user');
    return value.payload;
  } catch (_) {
    const error = new Error('Evaluation token is invalid or expired');
    error.status = 400;
    throw error;
  }
}

module.exports = { googleClientId, verifyGoogleCredential, roleFor, issueSession, clearSession, readSession, requireAuth, requireAdmin, signEvaluation, verifyEvaluation };
