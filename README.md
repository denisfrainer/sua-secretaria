# 🐺 Wolf Agent Boilerplate 

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com/)
[![Evolution API](https://img.shields.io/badge/Evolution%20API-v2-25D366?logo=whatsapp)](https://evolution-api.com/)

An **epic, autonomous AI WhatsApp Agent system** built for ultimate scaling and growth hacking. This boilerplate combines the power of Next.js, Netlify serverless/cron functions, Supabase, Apify, and the WhatsApp Evolution API v2 into a relentless, self-sustaining lead generation and conversion machine.

---

## 🏗️ System Architecture: The 4 Pillars

The Wolverine Agent system is orchestrated around four highly specialized pillars—*The Holy Trinity + The Hunter*:

1. 🧠 **Eliza (Inbound - `/api/webhook`)**
   - Receives incoming WhatsApp messages via the Evolution API v2 webhook.
   - Leverages AI to instantly qualify the lead, dig into their pain points, and save the interaction context into Supabase.
   
2. 🚀 **Lobo (Outbound - `/api/lobo`)**
   - Fetches `pending` leads directly from the database.
   - Uses AI to craft hyper-personalized cold-outbound messages tailored to the lead's niche and sends them automatically via WhatsApp using Evolution API v2.

3. ⏱️ **Lobo-Cron (The Manager - `/api/lobo-cron`)**
   - A Netlify Scheduled Function governing the system.
   - Automatically wakes up daily at **18:00 BRT**, triggers the Lobo Outbound route, and dispatches a comprehensive Daily Execution Report to your email via **Resend**.

4. 👁️ **The Hunter (Lead Scraper - `/api/hunt-leads`)**
   - Connects to Apify's Google Maps Scraper to hunt local businesses (e.g., "Clothing stores in Florianópolis").
   - Impeccably cleans and formats Brazilian phone numbers (auto-injecting standard `55` prefixes).
   - UPSERTS fresh, deduplicated leads into your Supabase `leads_lobo` table, marking them as ready (`pending`) for Lobo's next strike.

---

## ⚡ Features
- **Evolution API v2 Ready:** Native, out-of-the-box WhatsApp connection handling text injections and seamless webhooks.
- **AI-Powered Qualification:** Advanced conversational flows ensuring leads are genuinely qualified.
- **Automated Local Scraping:** Build endless localized lead lists without manual prospecting.
- **Zero-Maintenance Cron & Reporting:** Full "Fire and Forget" email reporting logic ensuring you only need to read your daily summaries.

---

## 🛠️ Prerequisites

To run the Wolf Agent, you will need the following accounts and API keys:
1. **[Supabase](https://supabase.com/)**: For PostgreSQL database and real-time.
2. **[Evolution API v2](https://evolution-api.com/)**: Deployed instance for WhatsApp Automation.
3. **[Apify](https://apify.com/)**: To utilize the Google Maps Scraper Actor.
4. **[Resend](https://resend.com/)**: For sending HTML reports.
5. **[Netlify](https://netlify.com/)**: For Edge deployments and Crons.

---

## 🗄️ Database Setup (Supabase)

Run the following exact SQL query in your Supabase SQL Editor to spawn the `leads_lobo` table:

```sql
CREATE TABLE leads_lobo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  niche TEXT,
  city TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
> **Note:** The `phone` column is enforced as `UNIQUE`, enabling the Hunter's safe UPSERT functionality without duplicating leads.

---

## 🚀 Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Populate the `.env.local` using the keys gathered from your prerequisites. Pay special attention to:
   - `SUPABASE_SERVICE_ROLE_KEY`: Required to bypass RLS securely from the server.
   - `WOLF_SECRET_TOKEN`: A strong custom password you invent to guard the manual API triggers.

---

## 📡 API Routes Reference

You can securely trigger the agent's manual routes using your `WOLF_SECRET_TOKEN`.

### 1. Trigger The Hunter (Google Maps Scraper)
*Use this to fill your database with fresh leads.*
```bash
curl -X POST https://your-site.netlify.app/api/hunt-leads \
  -H "Content-Type: application/json" \
  -H "x-wolf-token: YOUR_WOLF_SECRET_TOKEN" \
  -d "{\"query\": \"Lojas de Surf em Garopaba\", \"limit\": 30}"
```

### 2. Trigger Lobo manually (Outbound)
*Use this to test the outbound pipeline outside of the 18:00 BRT Cron schedule.*
```bash
# General Trigger (Pulls pending leads from Supabase)
curl -X POST https://your-site.netlify.app/api/lobo \
  -H "Content-Type: application/json" \
  -H "x-wolf-token: YOUR_WOLF_SECRET_TOKEN" \
  -d "{}"

# Manual Targeted Test (Bypasses DB and fires directly at a single number)
curl -X POST https://your-site.netlify.app/api/lobo \
  -H "Content-Type: application/json" \
  -H "x-wolf-token: YOUR_WOLF_SECRET_TOKEN" \
  -d "{\"testPhone\": \"5548998097754\", \"testName\": \"Denis Teste\"}"
```

---

## ☁️ Deployment

1. Make sure your `netlify.toml` file is pushed. It contains the exact instructions for the routing and the cron schedule:
   ```toml
   # 🐺 Lobo Prospectador — Cron Job (Segunda a Sexta às 18h BRT / 21h UTC)
   [functions."api/lobo-cron"]
     schedule = "0 21 * * 1-5"
   ```
2. Connect your GitHub repository to **Netlify**.
3. Add all your `.env` variables to the Netlify Dashboard (**Site settings > Environment variables**).
4. Hit **Deploy Site**!

---
*Built for absolute growth hacking. Vibe coding energy. Stay relentless.* 🐺
