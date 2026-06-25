import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const startTime = Date.now();
    console.log(`[AVATAR_UPLOAD_START] User ${user.id} starting avatar upload.`);

    // 1. Upload to Supabase Storage
    // Using user.id as filename to ensure one photo per user and prevent collisions
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(user.id, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('[STORAGE_UPLOAD_ERROR] Supabase storage error:', {
        message: uploadError.message,
        name: uploadError.name,
      });
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 });
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(user.id);

    console.log(`[STORAGE_UPLOAD_SUCCESS] Avatar generated for user ${user.id} in ${Date.now() - startTime}ms. URL: ${publicUrl}`);

    // 3. Update 'profiles' table
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (dbError) {
      console.error('[DB_UPDATE_ERROR] Failed to update profile with new avatar:', dbError.message);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ publicUrl });
  } catch (error: any) {
    console.error('[AVATAR_UPLOAD_EXCEPTION] Unhandled exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
