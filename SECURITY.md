# Melete security and deployment

Melete treats identity, interview transcripts, scores, and contact details as private data. Production startup requires a PostgreSQL `DATABASE_URL`; the local JSON store exists only for development. Audio uploads remain in memory for transcription and are not written to the public filesystem. Reports are created from server-signed evaluations and can be read only by their owner or an administrator.

## Required production configuration

Configure `APP_ORIGIN`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `OPENAI_API_KEY`, `DATABASE_URL`, and `ADMIN_EMAILS` as encrypted Vercel environment variables. For Supabase on Vercel, use the Transaction pooler connection string from the Supabase Connect dialog. Generate `SESSION_SECRET` with at least 32 random characters. Restrict the Google OAuth web client to the production origin and its exact authorized redirect/origin settings. Give the database account only the permissions required for this application and enable provider backups, encryption, and connection TLS.

Do not paste API keys into issues, chat, source files, or the browser admin page. Rotate any key that has ever appeared in those locations. The application never returns an API key through its API.

## Deployment checks

Run `npm ci`, `npm run check`, and `npm test`. Verify that `/server.js`, `/data/melete_db.json`, and unlisted HTML files return 404; `/admin.html` redirects an unauthenticated visitor to login; admin APIs return 401 or 403 without an authorized session; and cross-origin state-changing requests are rejected.

## Remaining operational duties

Use the hosting provider's access logs and database audit logs for monitoring, set spending limits for the OpenAI project, and define a documented retention/deletion period before accepting real candidates. Security headers and rate limits reduce common abuse but do not replace ongoing dependency updates, incident response, and periodic penetration testing.
