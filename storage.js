const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'melete_db.json'), 'utf8'));
const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
const databaseUrl = (process.env.DATABASE_URL || '').trim();
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? false : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' },
  // Vercel functions create one module-level pool per warm instance.
  // Keep this at one when connecting through Supabase's transaction pooler.
  max: 1
}) : null;
const localDir = path.join(__dirname, '.local');
const localFile = path.join(localDir, 'melete_db.json');
let initPromise;

function cleanSeed() {
  return { universities: seed.universities || [], questions: seed.questions || [], users: [], sessions: [] };
}

async function ensureReady() {
  if (!initPromise) initPromise = initialize();
  return initPromise;
}

async function initialize() {
  if (!pool) {
    if (isProduction) throw new Error('DATABASE_URL is required in production');
    fs.mkdirSync(localDir, { recursive: true });
    if (!fs.existsSync(localFile)) fs.writeFileSync(localFile, JSON.stringify(cleanSeed(), null, 2));
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, google_id TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL, picture TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '', target_destination TEXT NOT NULL DEFAULT '',
      target_university TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS universities (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL, framework TEXT NOT NULL, logo TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY, university_id TEXT NOT NULL, country TEXT NOT NULL, category TEXT NOT NULL,
      tag TEXT NOT NULL, question_text TEXT NOT NULL, sample_answer TEXT NOT NULL DEFAULT '',
      red_flags TEXT NOT NULL DEFAULT '', recommended_points TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
      university TEXT NOT NULL DEFAULT '', country TEXT NOT NULL DEFAULT '', framework TEXT NOT NULL DEFAULT '',
      practice_type TEXT NOT NULL, duration TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100),
      answers JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  for (const u of seed.universities || []) {
    await pool.query('INSERT INTO universities(id,name,country,framework,logo) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING', [u.id,u.name,u.country,u.framework,u.logo || '']);
  }
  for (const q of seed.questions || []) {
    await pool.query('INSERT INTO questions(id,university_id,country,category,tag,question_text,sample_answer,red_flags,recommended_points) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING', [q.id,q.university_id,q.country,q.category,q.tag,q.question_text,q.sample_answer || '',q.red_flags || '',q.recommended_points || '']);
  }
}

function readLocal() { return JSON.parse(fs.readFileSync(localFile, 'utf8')); }
function writeLocal(data) { const temp = `${localFile}.tmp`; fs.writeFileSync(temp, JSON.stringify(data, null, 2)); fs.renameSync(temp, localFile); }

async function getUniversities(country) {
  await ensureReady();
  if (!pool) { const rows=readLocal().universities; return country ? rows.filter(x=>x.country.toLowerCase()===country.toLowerCase()) : rows; }
  const r = country ? await pool.query('SELECT * FROM universities WHERE LOWER(country)=LOWER($1) ORDER BY name',[country]) : await pool.query('SELECT * FROM universities ORDER BY country,name');
  return r.rows;
}

async function getQuestions(filter={}) {
  await ensureReady();
  if (!pool) {
    let rows=readLocal().questions;
    if(filter.country) rows=rows.filter(x=>x.country.toLowerCase()===filter.country.toLowerCase());
    if(filter.university_id) rows=rows.filter(x=>x.university_id===filter.university_id || x.university_id.startsWith('all_'));
    if(filter.category) rows=rows.filter(x=>x.category.toLowerCase()===filter.category.toLowerCase());
    return rows;
  }
  const args=[]; const where=[];
  if(filter.country){args.push(filter.country);where.push(`LOWER(country)=LOWER($${args.length})`);}
  if(filter.university_id){args.push(filter.university_id);where.push(`(university_id=$${args.length} OR university_id LIKE 'all_%')`);}
  if(filter.category){args.push(filter.category);where.push(`LOWER(category)=LOWER($${args.length})`);}
  const r=await pool.query(`SELECT * FROM questions ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY country,id`,args); return r.rows;
}

async function upsertUser(profile) {
  await ensureReady();
  if (!pool) {
    const d=readLocal(); let u=d.users.find(x=>x.email===profile.email);
    if(!u){u={id:crypto.randomUUID(),...profile,created_at:new Date().toISOString()};d.users.push(u);} else Object.assign(u,profile);
    u.last_login=new Date().toISOString();writeLocal(d);return u;
  }
  const id=crypto.randomUUID();
  const r=await pool.query(`INSERT INTO users(id,google_id,email,name,picture,phone,country,target_destination,target_university)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT(email) DO UPDATE SET google_id=EXCLUDED.google_id,name=EXCLUDED.name,picture=EXCLUDED.picture,
      phone=COALESCE(NULLIF(EXCLUDED.phone,''),users.phone),country=COALESCE(NULLIF(EXCLUDED.country,''),users.country),
      target_destination=COALESCE(NULLIF(EXCLUDED.target_destination,''),users.target_destination),
      target_university=COALESCE(NULLIF(EXCLUDED.target_university,''),users.target_university),last_login=NOW()
    RETURNING *`,[id,profile.googleId,profile.email,profile.name,profile.picture||'',profile.phone||'',profile.country||'',profile.target_destination||'',profile.target_university||'']);
  return r.rows[0];
}

async function findUser(email) { await ensureReady(); if(!pool)return readLocal().users.find(x=>x.email===email)||null; const r=await pool.query('SELECT * FROM users WHERE email=$1',[email]);return r.rows[0]||null; }

async function saveSession(email,data) {
  await ensureReady(); const id=crypto.randomUUID(); const created_at=new Date().toISOString();
  const value={id,user_email:email,...data,created_at};
  if(!pool){const d=readLocal();d.sessions.push(value);writeLocal(d);return value;}
  const r=await pool.query('INSERT INTO sessions(id,user_email,university,country,framework,practice_type,duration,score,answers) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[id,email,data.university||'',data.country||'',data.framework||'',data.practice_type,data.duration||'',data.score,JSON.stringify(data.answers)]);return r.rows[0];
}

async function getSession(id,email,isAdmin=false){await ensureReady();if(!pool){return readLocal().sessions.find(x=>x.id===id&&(isAdmin||x.user_email===email))||null;}const r=await pool.query(`SELECT * FROM sessions WHERE id=$1 ${isAdmin?'':'AND user_email=$2'}`,isAdmin?[id]:[id,email]);return r.rows[0]||null;}
async function getUsers(){await ensureReady();if(!pool)return readLocal().users;const r=await pool.query(`SELECT id,email,name,picture,phone,country,target_destination,target_university,created_at,last_login,(SELECT COUNT(*)::int FROM sessions s WHERE s.user_email=users.email) practice_count FROM users ORDER BY created_at DESC`);return r.rows;}
async function getSessions(limit=100){await ensureReady();if(!pool)return readLocal().sessions.slice(-limit).reverse();const r=await pool.query('SELECT s.*,u.name user_name,u.phone user_phone FROM sessions s JOIN users u ON u.email=s.user_email ORDER BY s.created_at DESC LIMIT $1',[limit]);return r.rows;}
async function addQuestion(q){await ensureReady();const row={id:`q_${crypto.randomUUID()}`,...q};if(!pool){const d=readLocal();d.questions.push(row);writeLocal(d);return row;}const r=await pool.query('INSERT INTO questions(id,university_id,country,category,tag,question_text,sample_answer,red_flags,recommended_points) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[row.id,row.university_id,row.country,row.category,row.tag,row.question_text,row.sample_answer||'',row.red_flags||'',row.recommended_points||'']);return r.rows[0];}
async function updateQuestion(id,q){await ensureReady();const current=(await getQuestions()).find(x=>x.id===id);if(!current)return null;const row={...current,...q,id};if(!pool){const d=readLocal();d.questions=d.questions.map(x=>x.id===id?row:x);writeLocal(d);return row;}const r=await pool.query('UPDATE questions SET university_id=$2,country=$3,category=$4,tag=$5,question_text=$6,sample_answer=$7,red_flags=$8,recommended_points=$9 WHERE id=$1 RETURNING *',[id,row.university_id,row.country,row.category,row.tag,row.question_text,row.sample_answer||'',row.red_flags||'',row.recommended_points||'']);return r.rows[0]||null;}
async function deleteQuestion(id){await ensureReady();if(!pool){const d=readLocal();d.questions=d.questions.filter(x=>x.id!==id);writeLocal(d);return;}await pool.query('DELETE FROM questions WHERE id=$1',[id]);}
async function addUniversity(u){await ensureReady();const row={id:`uni_${crypto.randomUUID()}`,...u};if(!pool){const d=readLocal();d.universities.push(row);writeLocal(d);return row;}const r=await pool.query('INSERT INTO universities(id,name,country,framework,logo) VALUES($1,$2,$3,$4,$5) RETURNING *',[row.id,row.name,row.country,row.framework,row.logo||'']);return r.rows[0];}
async function stats(){const [users,sessions,questions,universities]=await Promise.all([getUsers(),getSessions(500),getQuestions(),getUniversities()]);return{totalUsers:users.length,totalSessions:sessions.length,totalQuestions:questions.length,totalUniversities:universities.length,avgScore:sessions.length?Math.round(sessions.reduce((n,s)=>n+Number(s.score||0),0)/sessions.length):0,countryBreakdown:sessions.reduce((a,s)=>(a[s.country||'Other']=(a[s.country||'Other']||0)+1,a),{})};}

module.exports={ensureReady,getUniversities,getQuestions,upsertUser,findUser,saveSession,getSession,getUsers,getSessions,addQuestion,updateQuestion,deleteQuestion,addUniversity,stats};
