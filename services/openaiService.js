const fs = require('fs');
const path = require('path');
const db = require('../db');

async function getApiKey() {
  const settings = db.getSettings();
  return settings.openai_api_key || process.env.OPENAI_API_KEY || '';
}

async function getModel() {
  const settings = db.getSettings();
  return settings.openai_model || 'gpt-4o-mini';
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeAudio(audioFilePath, mimeType = 'audio/webm') {
  const apiKey = await getApiKey();
  if (!apiKey) {
    return {
      success: false,
      transcript: '',
      message: 'OpenAI API key not configured. Using client-side speech recognition.'
    };
  }

  try {
    const fileData = fs.readFileSync(audioFilePath);
    const fileName = path.basename(audioFilePath);

    // Using native global FormData and fetch in Node 18+
    const formData = new FormData();
    const blob = new Blob([fileData], { type: mimeType });
    formData.append('file', blob, fileName);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Whisper API Error:', res.status, errText);
      return {
        success: false,
        transcript: '',
        error: `Whisper API failed with code ${res.status}`
      };
    }

    const data = await res.json();
    return {
      success: true,
      transcript: data.text || ''
    };
  } catch (err) {
    console.error('Whisper Transcription Error:', err);
    return {
      success: false,
      transcript: '',
      error: err.message
    };
  }
}

/**
 * Evaluate spoken transcript against official credibility rubric
 */
async function evaluateAnswer({
  question,
  transcript,
  university = 'Target University',
  country = 'Target Destination',
  category = 'General Credibility',
  sampleAnswer = '',
  redFlags = '',
  recommendedPoints = ''
}) {
  const cleanTranscript = (transcript || '').trim();

  // Audio Sanity Check: empty or too short
  const wordCount = cleanTranscript.split(/\s+/).filter(Boolean).length;
  if (wordCount < 4) {
    return {
      score: 15,
      status: 'HIGH_RISK',
      what_heard: cleanTranscript || '(Silence / Mumbled audio)',
      better_way: sampleAnswer || 'I chose this university because its focused modules and hands-on laboratory environment match my long-term career goals.',
      strengths: [],
      risks: ['Audio was too short or inaudible to evaluate.', 'Consular officers will treat silence or under-answering as lack of credibility.'],
      quick_tip: 'Speak in full sentences and aim for at least 30 to 45 seconds of clear, spoken detail.'
    };
  }

  const apiKey = await getApiKey();
  const model = await getModel();

  if (apiKey) {
    try {
      const systemPrompt = `You are a senior credibility interviewer evaluating an international student for university admissions (Pre-CAS) and student visa credibility (e.g. UKVI, US F-1 Section 214(b), Canada SDS, Germany APS, Australia GS).
Your task is to analyze the student's exact spoken words and provide honest, practical, non-robotic feedback.

Rules:
1. "what_heard": Return what the student said verbatim.
2. "better_way": Provide a simple, spoken English alternative (2-4 sentences). It must sound like natural, confident human speech — NOT a memorized formal essay or robotic template.
3. "score": Integer between 0 and 100 based on factual clarity, presence of specific evidence (modules, tuition, funding, home ties), and regulatory credibility.
4. "status": "PASS" (score >= 75), "NEEDS_REVISION" (55-74), or "HIGH_RISK" (below 55).
5. "strengths": Array of 1-2 specific positive elements they mentioned.
6. "risks": Array of 1-2 critical omissions or red flags (e.g. inability to name modules, working hour limits violation, vague sponsor finances, expressing immigrant intent instead of returning home).
7. "quick_tip": Exactly one punchy, memorable sentence on what to fix.

Format strictly as JSON. No markdown code blocks, just pure JSON:
{
  "score": 82,
  "status": "PASS",
  "what_heard": "...",
  "better_way": "...",
  "strengths": ["..."],
  "risks": ["..."],
  "quick_tip": "..."
}`;

      const userPrompt = `Interview Context:
- Destination Country: ${country}
- University / Consular Track: ${university}
- Category: ${category}
- Question Asked: "${question}"
- Regulatory Red Flags to Watch For: ${redFlags}
- Key Points Expected: ${recommendedPoints}

Candidate's Spoken Answer:
"${cleanTranscript}"

Evaluate this answer and output JSON now.`;

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices[0].message.content;
        const parsed = JSON.parse(content);
        return {
          score: Math.min(100, Math.max(0, parseInt(parsed.score) || 75)),
          status: parsed.status || (parsed.score >= 75 ? 'PASS' : 'NEEDS_REVISION'),
          what_heard: cleanTranscript,
          better_way: parsed.better_way || sampleAnswer,
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Spoke clearly without prolonged stalling.'],
          risks: Array.isArray(parsed.risks) ? parsed.risks : [],
          quick_tip: parsed.quick_tip || 'Keep practicing with concrete numbers and names.'
        };
      } else {
        console.warn('OpenAI Chat Completion API non-200, falling back to heuristic engine.');
      }
    } catch (err) {
      console.error('OpenAI Evaluation Error:', err);
    }
  }

  // Built-in Intelligent Heuristic Evaluator (Runs when API key is missing or network fails)
  return fallbackHeuristicEvaluation(question, cleanTranscript, university, country, category, sampleAnswer);
}

function fallbackHeuristicEvaluation(question, transcript, university, country, category, sampleAnswer) {
  const words = transcript.toLowerCase().split(/\s+/);
  const count = words.length;

  // Key regulatory flags
  const redFlagTerms = ['full time work', 'stay forever', 'green card', 'agent chose', 'agent told', 'cheap', 'easy visa', 'permanent residence'];
  const caughtRedFlags = redFlagTerms.filter(t => transcript.toLowerCase().includes(t));

  const positiveTerms = ['module', 'laboratory', 'syllabus', 'credits', 'tuition', 'savings', 'sponsor', 'return', 'career', 'degree', 'family', 'statement'];
  const caughtPositives = positiveTerms.filter(t => transcript.toLowerCase().includes(t));

  let score = 70;
  if (count > 25) score += 8;
  if (count > 45) score += 6;
  if (caughtPositives.length >= 2) score += 8;
  if (caughtPositives.length >= 4) score += 5;
  if (caughtRedFlags.length > 0) score -= 25;

  score = Math.min(95, Math.max(35, score));

  let status = 'PASS';
  if (score < 55) status = 'HIGH_RISK';
  else if (score < 75) status = 'NEEDS_REVISION';

  const strengths = [];
  if (count >= 30) strengths.push('Good answer length and reasonable volume of detail provided.');
  if (caughtPositives.length > 0) strengths.push(`Referred directly to key academic/financial terms (${caughtPositives.slice(0, 3).join(', ')}).`);
  if (strengths.length === 0) strengths.push('Attempted to answer the prompt directly.');

  const risks = [];
  if (caughtRedFlags.length > 0) {
    risks.push(`High risk phrase flagged: "${caughtRedFlags.join(', ')}". Never suggest immigration intent or unauthorized employment.`);
  }
  if (count < 25) {
    risks.push('Answer was quite brief. Consular and university officers expect concrete supporting examples.');
  }
  if (!transcript.toLowerCase().includes('because') && !transcript.toLowerCase().includes('which')) {
    risks.push('Lacks connecting logic or justification for the choices made.');
  }

  return {
    score,
    status,
    what_heard: transcript,
    better_way: sampleAnswer || `I chose ${university} because its syllabus directly incorporates the practical modules and industry laboratory tools I need for my career upon returning to my home country.`,
    strengths,
    risks: risks.length > 0 ? risks : ['Ensure you can cite exact dates, tuition numbers, and module leaders seamlessly.'],
    quick_tip: 'Name at least two specific facts (like exact modules or sponsor accounts) to prove you didn’t memorize a generic script.'
  };
}

module.exports = {
  transcribeAudio,
  evaluateAnswer,
  getApiKey,
  getModel
};
