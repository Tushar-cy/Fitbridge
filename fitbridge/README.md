# FitBridge Mobile Application

FitBridge is a React Native (Expo) application.

## Required Supabase Dashboard Setup (Must Do Before Launch)

### 1. Enable Extensions
Go to Database → Extensions and enable:
- pg_cron (for scheduled GDPR deletion jobs)
- pg_net (for HTTP calls from database functions)

### 2. Run Schema SQL
Go to SQL Editor → New Query → paste contents of `supabase/schema.sql` → Run

### 3. Run RLS Policies
Go to SQL Editor → New Query → paste contents of `supabase/rls_policies.sql` → Run

### 4. Configure Auth
Go to Auth → URL Configuration:
- Site URL: https://your-vercel-app.vercel.app
- Redirect URLs: fitbridge://auth/callback, fitbridge://auth/reset-password

### 5. Enable Auth Providers
Go to Auth → Providers:
- Enable Google OAuth (add Client ID + Secret from Google Cloud Console)
- Enable Phone (add Twilio credentials for OTP)

## Environment Variables
Ensure you copy `.env.example` to `.env` in both the `fitbridge` and `fitbridge-api` directories before starting. Never commit real `.env` files.

## Admin Dashboard
The admin dashboard is a standalone Next.js app located in the `fitbridge-admin` directory.
- Features: Real-time user management, booking tracking, and analytics.
- Tech Stack: Next.js App Router, Supabase Realtime, CSS Modules, Lucide React.
- To run: `cd fitbridge-admin && npm i && npm run dev`
