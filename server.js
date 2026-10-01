require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { z } = require('zod');
const storage = require('./storage');
const ai = require('./services/openaiService');
const auth = require('./auth');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const publicRoot = path.join(__dirname, 'public');
const templatesRoot = path.join(__dirname, 'views');
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const allowedOrigin = (process.env.APP_ORIGIN || (isProduction ? 'https://melete-seven.vercel.app' : `http://localhost:${PORT}`)).replace(/\/$/, '');
const allowedPages = new Set(['index','interviews','how-it-works','resources','about','faq','login','onboarding','practice','session','report','privacy-policy','terms-of-use','disclaimer']);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((_req,res,next)=>{res.locals.cspNonce=crypto.randomBytes(18).toString('base64');next();});
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", (_req,res)=>`'nonce-${res.locals.cspNonce}'`, 'https://accounts.google.com'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://lh3.googleusercontent.com'],
      connectSrc: ["'self'", 'https://accounts.google.com', 'https://www.googleapis.com'],
      frameSrc: ['https://accounts.google.com'],
      mediaSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use((req, res, next) => {
  if (!req.path.startsWith('/api/') || ['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin && origin.replace(/\/$/, '') !== allowedOrigin) return res.status(403).json({ error: 'Cross-origin request rejected' });
  if (isProduction && !origin) return res.status(403).json({ error: 'Request origin is required' });
  next();
});

const generalLimit = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });
const authLimit = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
const aiLimit = rateLimit({ windowMs: 10 * 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
app.use('/api', generalLimit);

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) { const e = new Error('Invalid request'); e.status = 400; e.details = result.error.issues.map(x => ({ path: x.path.join('.'), message: x.message })); throw e; }
  return result.data;
}
function asyncRoute(fn) { return (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next); }

const text = (max=500) => z.string().trim().max(max).default('');
const profileSchema = z.object({ phone:text(40),country:text(100),target_destination:text(100),target_university:text(200) }).partial();
const evaluationSchema = z.object({ question:z.string().trim().min(1).max(1000), transcript:z.string().trim().min(1).max(8000), university:text(250), country:text(100), category:text(200), redFlags:text(1500), recommendedPoints:text(1500) });
const questionSchema = z.object({ question_text:z.string().trim().min(5).max(1500),tag:text(200),category:text(200),country:z.string().trim().min(2).max(100),university_id:text(150),sample_answer:text(2500),red_flags:text(2000),recommended_points:text(2000) });
const universitySchema = z.object({ name:z.string().trim().min(2).max(250),country:z.string().trim().min(2).max(100),framework:text(200) });

app.get('/api/health', asyncRoute(async (_req,res) => { await storage.ensureReady(); res.json({ ok:true }); }));
app.get('/api/auth/config', (_req,res) => res.json({ googleClientId: auth.googleClientId() }));
app.post('/api/auth/google', authLimit, asyncRoute(async (req,res) => {
  const body=parse(z.object({ credential:z.string().min(20).max(10000),profile:profileSchema.optional() }),req.body);
  const identity=await auth.verifyGoogleCredential(body.credential);
  const user=await storage.upsertUser({ ...identity, ...(body.profile||{}) });
  const claims=auth.issueSession(res,user);
  res.json({ success:true,user:{ id:user.id,email:user.email,name:user.name,picture:user.picture,phone:user.phone||'',country:user.country||'',target_destination:user.target_destination||'',target_university:user.target_university||'',role:claims.role } });
}));
app.get('/api/auth/me', asyncRoute(async (req,res) => {
  const claims=auth.readSession(req); if(!claims) return res.status(401).json({ error:'Authentication required' });
  const user=await storage.findUser(claims.email); if(!user){auth.clearSession(res);return res.status(401).json({error:'Session user no longer exists'});}
  res.json({ user:{ id:user.id,email:user.email,name:user.name,picture:user.picture,phone:user.phone||'',country:user.country||'',target_destination:user.target_destination||'',target_university:user.target_university||'',role:claims.role } });
}));
app.post('/api/auth/logout', (_req,res) => { auth.clearSession(res); res.json({ success:true }); });
app.post('/api/auth/profile', auth.requireAuth, asyncRoute(async (req,res) => {
  const profile=parse(profileSchema,req.body); const current=await storage.findUser(req.user.email);
  const user=await storage.upsertUser({googleId:current.google_id||current.googleId,email:current.email,name:current.name,picture:current.picture,...profile});
  res.json({success:true,user});
}));

app.get('/api/universities', asyncRoute(async (req,res) => { const q=parse(z.object({country:z.string().trim().max(100).optional()}),req.query);res.json({universities:await storage.getUniversities(q.country)}); }));
app.get('/api/questions', asyncRoute(async (req,res) => { const q=parse(z.object({country:z.string().trim().max(100).optional(),university_id:z.string().trim().max(150).optional(),category:z.string().trim().max(200).optional()}),req.query);res.json({questions:await storage.getQuestions(q)}); }));

const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1},fileFilter:(_req,file,cb)=>cb(null,['audio/webm','audio/ogg','audio/mp4','video/webm'].includes(file.mimetype))});
function hasSupportedAudioSignature(buffer) {
  if (!buffer || buffer.length < 12) return false;
  return buffer.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])) ||
    buffer.subarray(0,4).toString('ascii') === 'OggS' || buffer.subarray(4,8).toString('ascii') === 'ftyp';
}
app.post('/api/transcribe', auth.requireAuth, aiLimit, upload.single('audio'), asyncRoute(async (req,res) => {
  if(!req.file) return res.status(400).json({error:'A supported audio recording is required'});
  if(!hasSupportedAudioSignature(req.file.buffer)) return res.status(400).json({error:'The uploaded recording format is invalid'});
  const transcript=await ai.transcribeAudio(req.file.buffer,req.file.mimetype);
  res.json({success:true,transcript});
}));

app.post('/api/evaluate', auth.requireAuth, aiLimit, asyncRoute(async (req,res) => {
  const input=parse(evaluationSchema,req.body); const evaluation=await ai.evaluateAnswer(input);
  const evaluationToken=auth.signEvaluation(req.user,{question:input.question,category:input.category,evaluation});
  res.json({success:true,evaluation,evaluationToken});
}));

app.post('/api/sessions', auth.requireAuth, asyncRoute(async (req,res) => {
  const body=parse(z.object({ university:text(250),country:text(100),framework:text(200),practice_type:z.enum(['drill','mock']),duration:text(20),answers:z.array(z.object({evaluationToken:z.string().min(20).max(20000)})).min(1).max(20) }),req.body);
  const answers=body.answers.map(a=>auth.verifyEvaluation(req.user,a.evaluationToken)).map(x=>({q:x.question,type:x.category,...x.evaluation}));
  const score=Math.round(answers.reduce((sum,a)=>sum+a.score,0)/answers.length);
  const session=await storage.saveSession(req.user.email,{...body,answers,score});
  res.status(201).json({success:true,session});
}));
app.get('/api/sessions/:id', auth.requireAuth, asyncRoute(async (req,res) => { const session=await storage.getSession(req.params.id,req.user.email,req.user.role==='admin');if(!session)return res.status(404).json({error:'Session not found'});res.json({session}); }));

app.use('/api/admin', auth.requireAdmin);
app.get('/api/admin/stats', asyncRoute(async (_req,res)=>res.json(await storage.stats())));
app.get('/api/admin/users', asyncRoute(async (_req,res)=>res.json({users:await storage.getUsers()})));
app.get('/api/admin/sessions', asyncRoute(async (req,res)=>{const {limit}=parse(z.object({limit:z.coerce.number().int().min(1).max(200).default(100)}),req.query);res.json({sessions:await storage.getSessions(limit)});}));
app.post('/api/admin/questions', asyncRoute(async (req,res)=>res.status(201).json({success:true,question:await storage.addQuestion(parse(questionSchema,req.body))})));
app.put('/api/admin/questions/:id', asyncRoute(async (req,res)=>{const q=await storage.updateQuestion(req.params.id,parse(questionSchema.partial(),req.body));if(!q)return res.status(404).json({error:'Question not found'});res.json({success:true,question:q});}));
app.delete('/api/admin/questions/:id', asyncRoute(async (req,res)=>{await storage.deleteQuestion(req.params.id);res.status(204).end();}));
app.post('/api/admin/universities', asyncRoute(async (req,res)=>res.status(201).json({success:true,university:await storage.addUniversity(parse(universitySchema,req.body))})));
app.get('/api/admin/settings', (_req,res)=>res.json({settings:{openai_model:process.env.OPENAI_MODEL||'gpt-4o-mini',has_api_key:Boolean(process.env.OPENAI_API_KEY),storage:process.env.DATABASE_URL?'postgres':'unavailable'}}));

function servePage(page) {
  return (req,res,next) => {
    if(page==='admin'){
      const user=auth.readSession(req); if(!user)return res.redirect(302,`/login.html?redirect=${encodeURIComponent('/admin.html')}`);if(user.role!=='admin')return res.status(403).send('Administrator access required');
    }
    fs.readFile(path.join(templatesRoot,`${page}.html`),'utf8',(error,html)=>{
      if(error)return next(error);
      const nonce=String(res.locals.cspNonce).replace(/[^A-Za-z0-9+/=]/g,'');
      res.type('html').set('Cache-Control','no-store').send(html.replace(/<script(?=\s|>)/gi,`<script nonce="${nonce}"`));
    });
  };
}
app.get('/admin.html',servePage('admin'));
app.get('/',servePage('index'));
app.get('/:page.html',(req,res,next)=>allowedPages.has(req.params.page)?servePage(req.params.page)(req,res,next):next());
app.use((req,res,next)=>/\.html$/i.test(req.path)?res.status(404).send('Page not found'):next());
app.use(express.static(publicRoot,{index:false,dotfiles:'deny',fallthrough:true,maxAge:isProduction?'1h':0,setHeaders:(res,file)=>{if(/\.html$/i.test(file))res.setHeader('Cache-Control','no-store');}}));
app.use('/api',(req,res)=>res.status(404).json({error:'API endpoint not found'}));
app.use((_req,res)=>res.status(404).type('text').send('Page not found'));
app.use((error,req,res,_next)=>{
  const status=Number(error.status||error.statusCode||500); if(status>=500)console.error(`${req.method} ${req.path}`,error.message);
  if(req.path.startsWith('/api/'))return res.status(status).json({error:status>=500?'Request could not be completed':error.message,details:error.details});
  res.status(status).send(status>=500?'Request could not be completed':error.message);
});

if(require.main===module && !process.env.VERCEL){ storage.ensureReady().then(()=>app.listen(PORT,()=>console.log(`Melete running at http://localhost:${PORT}`))).catch(err=>{console.error(err.message);process.exit(1);}); }
module.exports=app;
