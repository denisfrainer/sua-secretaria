import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function getGoogleAuthClient(businessConfigId: number, contextJson: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
  );

  // 1. Fetch the central profile to get the most up-to-date refresh token
  // This is better than relying on the contextJson which might be stale
  const { data: config } = await supabaseAdmin
    .from('business_config')
    .select('owner_id')
    .eq('id', businessConfigId)
    .single();

  if (!config) throw new Error('Business config not found');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('google_refresh_token')
    .eq('id', config.owner_id)
    .single();

  const googleCal = contextJson.google_calendar;
  const refreshToken = profile?.google_refresh_token || googleCal?.refresh_token;

  if (!googleCal || !googleCal.access_token) {
    throw new Error('Google Calendar not integrated');
  }

  oauth2Client.setCredentials({
    access_token: googleCal.access_token,
    refresh_token: refreshToken,
    expiry_date: googleCal.expiry_date,
  });

  // Check if token is expired (or close to it)
  const isExpired = googleCal.expiry_date ? Date.now() >= googleCal.expiry_date : true;

  if (isExpired && refreshToken) {
    console.log('[GCAL_SYNC] Access token expired, attempting refresh...');
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log('[GCAL_SYNC] Access token refreshed successfully');

      // Update BOTH the profile (central) and business_config context (instance-local)
      await Promise.all([
        supabaseAdmin
          .from('profiles')
          .update({ 
            google_refresh_token: credentials.refresh_token || refreshToken,
            updated_at: new Date().toISOString()
          })
          .eq('id', config.owner_id),
        
        supabaseAdmin
          .from('business_config')
          .update({ 
            context_json: {
              ...contextJson,
              google_calendar: {
                ...googleCal,
                access_token: credentials.access_token,
                refresh_token: credentials.refresh_token || refreshToken,
                expiry_date: credentials.expiry_date,
                updated_at: new Date().toISOString(),
              },
            }
          })
          .eq('id', businessConfigId)
      ]);

      oauth2Client.setCredentials(credentials);
    } catch (error) {
      console.error('[GCAL_SYNC] Error refreshing token:', error);
      throw error;
    }
  }

  return oauth2Client;
}
