# Melete

Melete is a study-abroad interview practice application. Candidates authenticate with Google, record or dictate practice answers, receive AI-assisted educational feedback, and access their own saved reports. It does not make admission or immigration decisions.

## Local development

1. Install Node.js 20 or newer and run `npm ci`.
2. Copy `.env.example` to `.env` and replace the development placeholders.
3. Run `npm start` and open `http://localhost:8080`.

Local development may use `.local/melete_db.json`. Production deliberately fails if `DATABASE_URL` is missing, preventing candidate data from being written to an ephemeral filesystem.

## Production

The Vercel function is `api/index.js`; only files under `public/` are served to browsers. Configure every variable listed in `.env.example` in Vercel. Do not put secrets in source, browser JavaScript, or the admin page. See [SECURITY.md](SECURITY.md) for deployment and operational checks.

Run these checks before deployment:

```sh
npm ci
npm run check
npm test
```

## Data flow

- Google verifies identity and Melete issues a signed, HttpOnly session cookie.
- Audio is accepted into server memory, sent to OpenAI for transcription, and discarded by the application after the request.
- AI feedback is signed server-side. Session scores are calculated only from verified evaluation tokens.
- PostgreSQL stores users, transcripts, evaluations, and reports. Owner and administrator checks protect access.

## License

Proprietary — All rights reserved © 2026 Melete.
