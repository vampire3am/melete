require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const db = require('./db');
const openaiService = require('./services/openaiService');

const app = express();
const PORT = process.env.PORT || 8080;

// Setup Uploads Directory for recorded audio
const isVercel = Boolean(process.env.VERCEL);
const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads', 'audio') : path.join(__dirname, 'uploads', 'audio');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch(e) {}
}

// Multer storage for uploaded student voice clips
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, 'voice-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
const staticRoot = process.env.VERCEL ? process.cwd() : __dirname;
app.use(express.static(staticRoot));
app.use('/uploads/audio', express.static(UPLOADS_DIR));

// Explicit route handlers for Vercel serverless environment
app.get('/', (req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

app.get('/:page.html', (req, res, next) => {
  const filePath = path.join(staticRoot, req.params.page + '.html');
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});

/* =========================================================================
   AUTHENTICATION & USER TRACKING
   ========================================================================= */

app.post('/api/auth/google', (req, res) => {
  try {
    const { email, name, picture, credential } = req.body;
    let userProfile = { email, name, picture };

    // If a Google JWT credential was provided, we can decode the payload
    if (credential) {
      try {
        const payloadBase64 = credential.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
        userProfile = {
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture
        };
      } catch (e) {
        console.warn('Could not decode Google JWT, using provided body:', e.message);
      }
    }

    if (!userProfile.email) {
      return res.status(400).json({ error: 'Email is required for student tracking.' });
    }

    const user = db.findOrCreateUser(userProfile);
    res.json({ success: true, user });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/auth/me', (req, res) => {
  // Returns demo user or reads from header/query
  const email = req.query.email;
  if (email) {
    const users = db.getUsers();
    const u = users.find(user => user.email === email);
    if (u) return res.json({ user: u });
  }
  const defaultUser = db.getUsers()[0] || {
    id: 'guest',
    name: 'Candidate Guest',
    email: 'guest@melete.ai',
    practice_count: 0
  };
  res.json({ user: defaultUser });
});

/* =========================================================================
   QUESTION BANK & UNIVERSITIES
   ========================================================================= */

app.get('/api/universities', (req, res) => {
  const { country } = req.query;
  const list = db.getUniversities(country);
  res.json({ universities: list });
});

app.get('/api/questions', (req, res) => {
  const { country, university_id, category } = req.query;
  const list = db.getQuestions({ country, university_id, category });
  res.json({ questions: list });
});

/* =========================================================================
   REAL AI AUDIO TRANSCRIPTION & EVALUATION
   ========================================================================= */

// Real speech upload and transcription
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype || 'audio/webm';
    const audioUrl = `/uploads/audio/${path.basename(filePath)}`;

    const transcriptionResult = await openaiService.transcribeAudio(filePath, mimeType);

    res.json({
      success: true,
      audioUrl: audioUrl,
      transcript: transcriptionResult.transcript || '',
      whisperUsed: transcriptionResult.success,
      message: transcriptionResult.message || null
    });
  } catch (err) {
    console.error('Transcription route error:', err);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

// Real AI credibility evaluation
app.post('/api/evaluate', async (req, res) => {
  try {
    const {
      question,
      transcript,
      university,
      country,
      category,
      sampleAnswer,
      redFlags,
      recommendedPoints
    } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({
        error: 'Transcript is empty. Please speak your answer or provide audio.'
      });
    }

    const evaluation = await openaiService.evaluateAnswer({
      question,
      transcript,
      university,
      country,
      category,
      sampleAnswer,
      redFlags,
      recommendedPoints
    });

    res.json({
      success: true,
      evaluation
    });
  } catch (err) {
    console.error('Evaluation route error:', err);
    res.status(500).json({ error: 'Failed to evaluate answer' });
  }
});

/* =========================================================================
   STUDENT SESSIONS (DRILL & FULL MOCK)
   ========================================================================= */

app.post('/api/sessions', (req, res) => {
  try {
    const sessionData = req.body;
    if (!sessionData.answers || !Array.isArray(sessionData.answers)) {
      return res.status(400).json({ error: 'Session must contain recorded answers.' });
    }

    const saved = db.saveSession(sessionData);
    res.json({ success: true, session: saved });
  } catch (err) {
    console.error('Save session error:', err);
    res.status(500).json({ error: 'Could not record session' });
  }
});

app.get('/api/sessions/:id', (req, res) => {
  const session = db.getSessionById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session });
});

/* =========================================================================
   ADMIN PANEL APIS
   ========================================================================= */

app.get('/api/admin/stats', (req, res) => {
  const users = db.getUsers();
  const sessions = db.getSessions(500);
  const questions = db.getQuestions();
  const universities = db.getUniversities();

  const totalScores = sessions.reduce((acc, s) => acc + (s.score || 0), 0);
  const avgScore = sessions.length ? Math.round(totalScores / sessions.length) : 85;

  let totalAudioFiles = 0;
  if (fs.existsSync(UPLOADS_DIR)) {
    totalAudioFiles = fs.readdirSync(UPLOADS_DIR).length;
  }

  // Country breakdown
  const countryBreakdown = {};
  sessions.forEach(s => {
    const c = s.country || 'Other';
    countryBreakdown[c] = (countryBreakdown[c] || 0) + 1;
  });

  res.json({
    totalUsers: users.length,
    totalSessions: sessions.length,
    totalQuestions: questions.length,
    totalUniversities: universities.length,
    avgScore,
    totalAudioFiles,
    countryBreakdown
  });
});

app.get('/api/admin/users', (req, res) => {
  const users = db.getUsers();
  res.json({ users });
});

app.get('/api/admin/sessions', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const sessions = db.getSessions(limit);
  res.json({ sessions });
});

app.post('/api/admin/questions', (req, res) => {
  try {
    const { question_text, tag, category, country, university_id, sample_answer, red_flags, recommended_points } = req.body;
    if (!question_text || !country) {
      return res.status(400).json({ error: 'Question text and country are required.' });
    }
    const created = db.addQuestion({
      question_text,
      tag: tag || 'GENERAL CREDIBILITY',
      category: category || 'Course & University Choice',
      country,
      university_id: university_id || 'all_' + country.toLowerCase().slice(0, 2),
      sample_answer: sample_answer || '',
      red_flags: red_flags || '',
      recommended_points: recommended_points || ''
    });
    res.json({ success: true, question: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/questions/:id', (req, res) => {
  const updated = db.updateQuestion(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Question not found' });
  res.json({ success: true, question: updated });
});

app.delete('/api/admin/questions/:id', (req, res) => {
  db.deleteQuestion(req.params.id);
  res.json({ success: true });
});

app.post('/api/admin/universities', (req, res) => {
  try {
    const { name, country, framework } = req.body;
    if (!name || !country) return res.status(400).json({ error: 'Name and country required' });
    const uni = db.addUniversity({ name, country, framework: framework || 'Pre-CAS Interview' });
    res.json({ success: true, university: uni });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/settings', (req, res) => {
  const settings = db.getSettings();
  const rawKey = settings.openai_api_key || '';
  const maskedKey = rawKey ? `${rawKey.slice(0, 3)}...${rawKey.slice(-4)}` : '';
  res.json({
    settings: {
      ...settings,
      openai_api_key_masked: maskedKey,
      has_api_key: Boolean(rawKey)
    }
  });
});

app.post('/api/admin/settings', (req, res) => {
  try {
    const { openai_api_key, openai_model, whisper_enabled, free_tier_questions } = req.body;
    const updates = {};
    if (openai_api_key !== undefined && openai_api_key.trim() !== '') {
      updates.openai_api_key = openai_api_key.trim();
    }
    if (openai_model) updates.openai_model = openai_model;
    if (whisper_enabled !== undefined) updates.whisper_enabled = Boolean(whisper_enabled);
    if (free_tier_questions) updates.free_tier_questions = parseInt(free_tier_questions) || 15;

    const saved = db.updateSettings(updates);
    res.json({ success: true, settings: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export for Vercel Serverless
module.exports = app;

// Start Server locally
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Melete Production SaaS running at http://localhost:${PORT}`);
    console.log(` Admin Dashboard available at http://localhost:${PORT}/admin.html`);
    console.log(` Single Question Drill at http://localhost:${PORT}/practice.html`);
    console.log(` Full Mock Simulation at http://localhost:${PORT}/session.html`);
    console.log(`=======================================================`);
  });
}
