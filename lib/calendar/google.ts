import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function getGoogleAuthClient(businessConfigId: number, contextJson: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
  );

  const googleCal = contextJson.google_calendar;

  if (!googleCal || !googleCal.access_token) {
    throw new Error('Google Calendar not integrated');
  }

  oauth2Client.setCredentials({
    access_token: googleCal.access_token,
    refresh_token: googleCal.refresh_token,
    expiry_date: googleCal.expiry_date,
  });

  // Check if token is expired (or close to it)
  const isExpired = googleCal.expiry_date ? Date.now() >= googleCal.expiry_date : true;

  if (isExpired && googleCal.refresh_token) {
    console.log('[GCAL_SYNC] Access token expired, attempting refresh...');
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log('[GCAL_SYNC] Access token refreshed successfully');

      // Update Supabase with new tokens in both JSON and dedicated column
      await supabaseAdmin
        .from('business_config')
        .update({ 
          google_refresh_token: credentials.refresh_token || googleCal.refresh_token,
          context_json: {
            ...contextJson,
            google_calendar: {
              ...googleCal,
              access_token: credentials.access_token,
              refresh_token: credentials.refresh_token || googleCal.refresh_token,
              expiry_date: credentials.expiry_date,
              updated_at: new Date().toISOString(),
            },
          }
        })
        .eq('id', businessConfigId);

      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('[GCAL_SYNC] Error refreshing token:', error);
      throw error;
    }
  }

  return oauth2Client;
}
