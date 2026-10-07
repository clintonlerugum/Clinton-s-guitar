# Clinton's Guitar

An online store for guitar tabs and arrangements built with Next.js, TypeScript, Tailwind CSS and Prisma (PostgreSQL). The existing custom authentication, admin dashboard, protected downloads, and M-Pesa payment flow use the configured Supabase project.

## What I created
- Next.js app (app dir) with TypeScript
- Prisma schema and seed script for Postgres
- JWT-based authentication (register / login)
- Admin dashboard skeleton: add/list products
- Supabase Storage: public product media and private full PDFs
- Protected download endpoint that validates ownership
- Sample products seeded
- Tailwind CSS styles

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Configure `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `JWT_SECRET` in the local server environment. The Supabase secret key is server-only.

3. Initialize Prisma and migrate (this will create DB tables):

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

4. Run development server:

```bash
npm run dev
```

Open http://localhost:3000

## Admin Dashboard
- Visit `/admin` after creating an admin user via the seed script or registering and then updating the user role to `ADMIN` in the database.

## Adding a Tab
1. Go to `/admin/products/new`.
2. Fill the form, upload cover image, preview PDF (public), and full PDF (protected).
3. Click `Create & Publish Tab` — the product will be created and available in `/shop`.

## Files & Important paths
- App source: `app/`
- Components: `components/`
- Prisma schema: `prisma/schema.prisma`
- Prisma seed: `prisma/seed.ts`
- Supabase Storage buckets: `clintons-guitar-public` for public media and `clintons-guitar-private` for protected full PDFs
- Public placeholder assets: `public/placeholders/`

## Environment variables
Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` — PostgreSQL connection string for the existing Supabase database
- `SUPABASE_URL` — existing Supabase project URL
- `SUPABASE_SECRET_KEY` — server-only Supabase key used for Storage uploads and private PDF reads
- `JWT_SECRET` — secure secret used to sign auth tokens
- `AUTH_BASE_URL` — optional public origin used for authentication redirects behind a reverse proxy or tunnel; leave unset for localhost development

## Payment & Production Notes
- M-Pesa STK Push and callback handling are implemented. Keep `PAYMENT_MODE=demo` and `MPESA_ENVIRONMENT=sandbox` until live credentials, a public HTTPS callback, provider-side payment-status verification, and failure/reconciliation handling have been tested. A successful callback is only finalized after a server-to-server Daraja STK status query confirms the same checkout ID, successful result, amount, phone, and receipt. If verification is unavailable or incomplete, the payment stays pending. Callbacks themselves are not signed; non-success callbacks retain their existing correlated failure handling.
- Pending payments with a known CheckoutRequestID can be reconciled by an authenticated server-side M-Pesa STK status query. Unclear provider results remain pending; the status query never trusts browser-provided payment outcomes.
- Run `npm run test:mpesa` for local-only payment simulations. The command starts a temporary local app and mocked provider, refuses production/live configuration or preconfigured M-Pesa credentials, uses SQLite and fake credentials, and cleans up its temporary order/user records. No request is sent to Safaricom.
- Stripe and PayPal are not integrated; their environment variable placeholders are unused.
- Full PDFs are stored in a private Supabase Storage bucket and streamed server-side only after the existing authentication and paid-order checks.

## Create the first admin
The seed script creates an admin using `ADMIN_EMAIL` (or `admin@example.com` when unset). When that account does not already exist, set `ADMIN_PASSWORD` to a unique, securely generated password of at least 16 characters before running the seed. The seed does not change an existing account's password.

## Next steps / TODO
- Test the reconciliation behavior against Safaricom's sandbox before configuring production credentials; add operational monitoring and support/refund handling before accepting real payments.
- Add a delete confirmation and clearer error feedback to the admin product tools.
