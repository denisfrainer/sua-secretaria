import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
  );

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.freebusy',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh_token
    scope: scopes,
    prompt: 'consent', // Force consent to ensure refresh_token is provided
  });

  console.log('[GCAL_SYNC] Generating Google OAuth URL');
  return NextResponse.redirect(url);
}
