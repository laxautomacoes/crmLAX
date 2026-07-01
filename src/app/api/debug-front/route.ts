import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const logPath = path.join(process.cwd(), 'debug_front.txt');
        
        fs.writeFileSync(logPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            ...body
        }, null, 2));
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
