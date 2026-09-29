const fs = require('fs');
const path = require('path');

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'melete_db.json');
const BUNDLED_DB = path.join(__dirname, 'data', 'melete_db.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch(e) {}
}

const defaultData = {
  settings: {
    openai_api_key: process.env.OPENAI_API_KEY || '',
    openai_model: 'gpt-4o-mini',
    whisper_enabled: true,
    free_tier_questions: 15
  },
  universities: [
    // UK Universities
    { id: 'coventry', name: 'Coventry University', country: 'United Kingdom', framework: 'Pre-CAS Interview', logo: 'assets/universities/coventry.svg' },
    { id: 'bpp', name: 'BPP University', country: 'United Kingdom', framework: 'Pre-CAS Interview', logo: 'assets/universities/bpp.svg' },
    { id: 'uel', name: 'University of East London', country: 'United Kingdom', framework: 'Pre-CAS Interview', logo: 'assets/universities/uel.svg' },
    { id: 'uwl', name: 'University of West London', country: 'United Kingdom', framework: 'Pre-CAS Interview', logo: 'assets/universities/uwl.svg' },
    { id: 'wolverhampton', name: 'University of Wolverhampton', country: 'United Kingdom', framework: 'Pre-CAS Interview', logo: 'assets/universities/wolverhampton.svg' },
    { id: 'hertfordshire', name: 'University of Hertfordshire', country: 'United Kingdom', framework: 'Pre-CAS Interview', logo: 'assets/universities/hertfordshire.svg' },
    { id: 'ravensbourne', name: 'Ravensbourne University London', country: 'United Kingdom', framework: 'Pre-CAS Interview', logo: 'assets/universities/ravensbourne.svg' },
    { id: 'ukvi-general', name: 'UKVI Home Office (General)', country: 'United Kingdom', framework: 'UKVI Credibility Interview', logo: '' },
    // US Universities
    { id: 'nyu', name: 'New York University (NYU)', country: 'United States', framework: 'US Student Visa Interview', logo: '' },
    { id: 'northeastern', name: 'Northeastern University', country: 'United States', framework: 'US Student Visa Interview', logo: '' },
    { id: 'us-consular', name: 'US Consular F-1 Visa Drill', country: 'United States', framework: 'US Student Visa Interview', logo: '' },
    // Canada
    { id: 'toronto', name: 'University of Toronto', country: 'Canada', framework: 'Canada Study Permit Interview', logo: '' },
    { id: 'conestoga', name: 'Conestoga College', country: 'Canada', framework: 'Canada Study Permit Interview', logo: '' },
    // Germany
    { id: 'tum', name: 'Technical University of Munich (TUM)', country: 'Germany', framework: 'Germany APS & Visa Interview', logo: '' },
    { id: 'rwth', name: 'RWTH Aachen University', country: 'Germany', framework: 'Germany APS & Visa Interview', logo: '' },
    // Australia
    { id: 'melbourne', name: 'University of Melbourne', country: 'Australia', framework: 'Australia Genuine Student (GS)', logo: '' },
    { id: 'deakin', name: 'Deakin University', country: 'Australia', framework: 'Australia Genuine Student (GS)', logo: '' }
  ],
  questions: [
    // UK Pre-CAS & Credibility
    {
      id: 'q_uk_1',
      university_id: 'all_uk',
      country: 'United Kingdom',
      category: 'Course & University Choice',
      tag: 'WHY THIS UNIVERSITY',
      question_text: 'Why did you choose this university specifically over other institutions in the UK that offer the same course?',
      sample_answer: 'I chose this university because its MSc curriculum offers specific practical modules like Applied Data Architectures and Cloud Computing labs that align directly with my career goals. In addition, its location and university industry partnerships provide strong industry exposure compared to more theoretical programs elsewhere.',
      red_flags: 'Generic praise (e.g., "it is high ranked" without knowing the ranking), unable to name course modules, saying "my agent told me to apply".',
      recommended_points: 'Specific module names, laboratory/faculty expertise, comparison with 2 other UK universities, campus facilities.'
    },
    {
      id: 'q_uk_2',
      university_id: 'all_uk',
      country: 'United Kingdom',
      category: 'Course & University Choice',
      tag: 'COURSE MODULES & SYLLABUS',
      question_text: 'Can you name at least two core modules you will study in your course, and explain what you will learn in them?',
      sample_answer: 'Yes, in semester one I will take Advanced System Architecture, focusing on distributed microservices and load balancing. In semester two, I will study Cloud Security and DevOps, where we conduct hands-on automated deployment and container security tests.',
      red_flags: 'Hesitating on module titles, giving names of modules not on the university syllabus, reciting irrelevant undergraduate subjects.',
      recommended_points: 'Accurate module titles, credits per module, practical assessment methods (dissertation vs coursework).'
    },
    {
      id: 'q_uk_3',
      university_id: 'all_uk',
      country: 'United Kingdom',
      category: 'Finance & Maintenance',
      tag: 'TUITION & LIVING COSTS',
      question_text: 'How much are your total tuition fees, how much have you already paid, and how will you pay the remaining balance and living expenses?',
      sample_answer: 'My total tuition fee is £16,500. I have paid a deposit of £5,000, leaving a remaining balance of £11,500. For living costs outside London, the UKVI requirement is £9,207. My parents are funding my studies through family savings held in an approved commercial bank for over 28 consecutive days.',
      red_flags: 'Not knowing the exact tuition fee or deposit paid, relying on unofficial funds, saying you will work in the UK to pay fees.',
      recommended_points: 'Exact figures for tuition fee, deposit paid, remaining fee, UKVI maintenance requirement (£1,023/month outside London or £1,334/month in London), 28-day rule compliance.'
    },
    {
      id: 'q_uk_4',
      university_id: 'all_uk',
      country: 'United Kingdom',
      category: 'Visa Rules & Immigration Compliance',
      tag: 'VISA WORK RESTRICTIONS',
      question_text: 'Are you allowed to work in the UK while studying on a Student Visa, and what are the specific restrictions?',
      sample_answer: 'Yes, on a UK Student Visa for degree-level studies, I am allowed to work a maximum of 20 hours per week during term time, and full-time during official vacations. I cannot be self-employed, run a business, or work as a professional sportsperson or entertainer.',
      red_flags: 'Saying you can work full-time to cover tuition fees, not knowing the 20 hours per week limit, mentioning freelancing or self-employment.',
      recommended_points: '20 hours/week limit in term time, full-time in holidays, strictly prohibited from business/self-employment.'
    },
    {
      id: 'q_uk_5',
      university_id: 'all_uk',
      country: 'United Kingdom',
      category: 'Career & Post-Study Intent',
      tag: 'POST-STUDY CAREER PLANS',
      question_text: 'What job do you intend to secure in your home country upon graduation, and what salary do you expect?',
      sample_answer: 'Upon completing my MSc, I intend to return to my home country to work as a Cloud Solutions Architect at established IT firms like Deerwalk or F1Soft. Based on current industry reports, entry salaries for UK master’s graduates in these roles start around 90,000 to 120,000 NPR per month.',
      red_flags: 'Saying you intend to remain in the UK permanently with no plan for returning, not knowing realistic job titles or salaries in your home country.',
      recommended_points: 'Specific target companies in home country, designated job title, realistic local salary range showing ROI on study costs.'
    },
    // US F-1 Visa Credibility (INA 214(b))
    {
      id: 'q_us_1',
      university_id: 'all_us',
      country: 'United States',
      category: 'Visa Intent (214b)',
      tag: 'SECTION 214(B) TIES TO HOME COUNTRY',
      question_text: 'Why should the consular officer believe you will return to your home country after completing your degree in the United States?',
      sample_answer: 'My entire family, including my parents and our family properties, are in my home country. Furthermore, with the rapid expansion of digital infrastructure locally, acquiring an American STEM degree gives me a direct competitive advantage for senior engineering roles at top domestic tech enterprises.',
      red_flags: 'Mentioning wanting an H-1B visa, saying you will seek permanent residency (green card), expressing hesitation about returning.',
      recommended_points: 'Strong familial, property, and economic ties to home country; clear immediate career plan back home.'
    },
    {
      id: 'q_us_2',
      university_id: 'all_us',
      country: 'United States',
      category: 'Financial Sponsor',
      tag: 'FORM I-20 FUNDING',
      question_text: 'Who is sponsoring your education in the US, what do they do, and what is their annual income?',
      sample_answer: 'My father is my primary sponsor. He has been running a licensed wholesale business for over 15 years with documented annual net income exceeding $35,000 USD, verified by tax clearance documents and liquid bank savings sufficient to cover my full first year costs on Form I-20.',
      red_flags: 'Vague answers like "my uncle helps", sponsor having insufficient liquid funds, not knowing sponsor\'s exact business or income.',
      recommended_points: 'Sponsor identity, occupation/business nature, documented annual income, liquid funds matching Form I-20.'
    },
    // Canada SDS & GIC
    {
      id: 'q_ca_1',
      university_id: 'all_ca',
      country: 'Canada',
      category: 'Study Permit & GIC',
      tag: 'CANADA GIC & TIES',
      question_text: 'How will you support yourself financially in Canada, and what evidence have you provided of your funds?',
      sample_answer: 'I have paid my full first-year tuition fee of CAD 18,200 directly to the institution. For living expenses, I have purchased a Guaranteed Investment Certificate (GIC) of CAD 20,635 with Scotiabank under the SDS stream, ensuring guaranteed monthly payouts.',
      red_flags: 'Unaware of the GIC requirement amount, lack of proof for tuition payment, relying on informal promises of support.',
      recommended_points: 'Proof of paid tuition receipt, CAD GIC certificate confirmation, family assets in home country.'
    },
    // Germany APS & Blocked Account
    {
      id: 'q_de_1',
      university_id: 'all_de',
      country: 'Germany',
      category: 'APS & Blocked Account',
      tag: 'SPERRKONTO & CURRICULUM',
      question_text: 'Why did you choose Germany over other tuition-free or low-cost European countries, and how is your blocked account organized?',
      sample_answer: 'Germany’s dual-system higher education combines theoretical depth with mandatory industrial internships. I have deposited the required €11,208 into a verified Sperrkonto (blocked account) with Expatrio, which dispenses €934 monthly for living maintenance.',
      red_flags: 'Not knowing the monthly disbursement amount of Sperrkonto, applying to German-taught programs without German B1/B2 skills.',
      recommended_points: 'Knowledge of Sperrkonto amount (€11,208/year), exact modular credit points (ECTS), reason for choosing public research university.'
    },
    // Australia Genuine Student (GS)
    {
      id: 'q_au_1',
      university_id: 'all_au',
      country: 'Australia',
      category: 'Genuine Student (GS)',
      tag: 'GENUINE STUDENT REQUIREMENT',
      question_text: 'How does this Australian qualification add economic value to your career compared to studying in your home country?',
      sample_answer: 'An Australian degree accredited by Engineers Australia provides globally recognized certifications not available locally. Upon return, my expected starting remuneration is nearly three times higher than that of domestic graduates, allowing me to fully recover my educational investment within 3 years.',
      red_flags: 'Mentioning PR pathways or migration as primary motivation, unable to articulate the economic return on investment (ROI).',
      recommended_points: 'Accreditation details, comparative local vs international salary data, realistic employment timeline in home country.'
    }
  ],
  users: [
    {
      id: 'demo_student_1',
      name: 'Bikash Shrestha',
      email: 'bikash.shrestha@example.com',
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      country: 'Nepal',
      target_destination: 'United Kingdom',
      practice_count: 4,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      last_login: new Date().toISOString()
    }
  ],
  sessions: []
};

function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
    if (fs.existsSync(BUNDLED_DB)) {
      const raw = fs.readFileSync(BUNDLED_DB, 'utf-8');
      const parsed = JSON.parse(raw);
      if (isVercel) {
        try { fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8'); } catch(e){}
      }
      return parsed;
    }
    return defaultData;
  } catch (err) {
    return defaultData;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

const db = {
  getSettings() {
    const data = readDb();
    const s = data.settings || defaultData.settings;
    if (process.env.OPENAI_API_KEY) {
      s.openai_api_key = process.env.OPENAI_API_KEY;
    }
    return s;
  },
  updateSettings(newSettings) {
    const data = readDb();
    data.settings = { ...data.settings, ...newSettings };
    writeDb(data);
    return data.settings;
  },
  getUniversities(country = null) {
    const data = readDb();
    if (!country) return data.universities;
    return data.universities.filter(u => u.country.toLowerCase() === country.toLowerCase());
  },
  addUniversity(uni) {
    const data = readDb();
    const id = uni.id || 'uni_' + Date.now();
    const newUni = { id, ...uni };
    data.universities.push(newUni);
    writeDb(data);
    return newUni;
  },
  getQuestions(filter = {}) {
    const data = readDb();
    let res = data.questions || [];
    if (filter.country) {
      res = res.filter(q => q.country.toLowerCase() === filter.country.toLowerCase());
    }
    if (filter.university_id) {
      res = res.filter(q => q.university_id === filter.university_id || q.university_id.startsWith('all_'));
    }
    if (filter.category) {
      res = res.filter(q => q.category.toLowerCase() === filter.category.toLowerCase());
    }
    return res;
  },
  addQuestion(q) {
    const data = readDb();
    const id = 'q_' + Date.now();
    const newQ = { id, ...q };
    data.questions.push(newQ);
    writeDb(data);
    return newQ;
  },
  updateQuestion(id, updates) {
    const data = readDb();
    const idx = data.questions.findIndex(q => q.id === id);
    if (idx === -1) return null;
    data.questions[idx] = { ...data.questions[idx], ...updates };
    writeDb(data);
    return data.questions[idx];
  },
  deleteQuestion(id) {
    const data = readDb();
    data.questions = data.questions.filter(q => q.id !== id);
    writeDb(data);
    return true;
  },
  getUsers() {
    const data = readDb();
    return data.users || [];
  },
  findOrCreateUser(profile) {
    const data = readDb();
    if (!data.users) data.users = [];
    let user = data.users.find(u => u.email === profile.email);
    if (user) {
      user.last_login = new Date().toISOString();
      if (profile.name) user.name = profile.name;
      if (profile.phone) user.phone = profile.phone;
      if (profile.picture) user.picture = profile.picture;
      if (profile.country) user.country = profile.country;
      if (profile.target_destination) user.target_destination = profile.target_destination;
      if (profile.target_university) user.target_university = profile.target_university;
    } else {
      user = {
        id: 'usr_' + Date.now(),
        name: profile.name || 'International Student',
        email: profile.email,
        phone: profile.phone || '',
        picture: profile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        country: profile.country || 'Global',
        target_destination: profile.target_destination || 'United Kingdom',
        target_university: profile.target_university || 'Coventry University',
        practice_count: 0,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
      };
      data.users.push(user);
    }
    writeDb(data);
    return user;
  },
  getSessions(limit = 100) {
    const data = readDb();
    return (data.sessions || []).slice(-limit).reverse();
  },
  getSessionById(id) {
    const data = readDb();
    return (data.sessions || []).find(s => s.id === id);
  },
  saveSession(sessionData) {
    const data = readDb();
    const id = 'sess_' + Date.now();
    const newSession = {
      id,
      created_at: new Date().toISOString(),
      ...sessionData
    };
    if (!data.sessions) data.sessions = [];
    data.sessions.push(newSession);

    if (sessionData.user_id || sessionData.user_email) {
      const user = (data.users || []).find(u => u.id === sessionData.user_id || u.email === sessionData.user_email);
      if (user) {
        user.practice_count = (user.practice_count || 0) + 1;
      }
    }

    writeDb(data);
    return newSession;
  }
};

module.exports = db;
