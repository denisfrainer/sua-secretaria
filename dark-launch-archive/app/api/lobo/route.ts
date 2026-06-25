import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

export async function POST(req: Request) {
    return NextResponse.json({ 
        status: 'deprecated', 
        message: 'Legacy Wolf Prospector is disabled. Use the Profiles-driven funnel.' 
    }, { status: 410 });
}

export async function GET(req: Request) {
    return POST(req);
}
