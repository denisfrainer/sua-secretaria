import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect(new URL('/api/auth/google', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
}
