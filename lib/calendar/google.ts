import { google } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function getGoogleAuthClient(businessConfigId: number, contextJson: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
  );

  // 1. Fetch the central profile to get the most up-to-date refresh token
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

  const googleCal = contextJson?.google_calendar || {};
  const refreshToken = profile?.google_refresh_token || googleCal?.refresh_token;

  // CRITICAL: If we have a refresh token but no access token, or vice versa, 
  // we must normalize the client state.
  if (!refreshToken) {
    throw new Error('Google Calendar not integrated');
  }

  oauth2Client.setCredentials({
    access_token: googleCal.access_token || undefined,
    refresh_token: refreshToken,
    expiry_date: googleCal.expiry_date || undefined,
  });

  // Check if token is expired (or close to it)
  // If we don't have an access token at all, we consider it expired to trigger a refresh
  const isExpired = !googleCal.access_token || (googleCal.expiry_date ? Date.now() >= googleCal.expiry_date : true);

  if (isExpired && refreshToken) {
    console.log('[GCAL_SYNC] Access token missing or expired. Attempting refresh with Profile token...');
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      console.log('[GCAL_SYNC] Access token refreshed successfully using central profile token');

      // Update BOTH the profile (central) and business_config context (instance-local cache)
      const updatedAt = new Date().toISOString();
      await Promise.all([
        supabaseAdmin
          .from('profiles')
          .update({ 
            google_refresh_token: credentials.refresh_token || refreshToken,
            updated_at: updatedAt
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
                updated_at: updatedAt,
              },
            }
          })
          .eq('id', businessConfigId)
      ]);

      oauth2Client.setCredentials(credentials);
    } catch (error: any) {
      console.error('[GCAL_SYNC] Error refreshing token:', error.message);
      // If the refresh token itself is invalid/revoked, we should treat as not integrated
      if (error.message.includes('invalid_grant')) {
        throw new Error('Google Calendar not integrated');
      }
      throw error;
    }
  }

  return oauth2Client;
}
