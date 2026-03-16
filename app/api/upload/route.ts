import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const video = formData.get('video') as File;
    const coachName = formData.get('coachName') as string;
    const athleteId = formData.get('athleteId') as string;

    if (!video || !coachName || !athleteId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Only allow .mp4 and .mov
    const ext = video.name.split('.').pop()?.toLowerCase();
    if (ext !== 'mp4' && ext !== 'mov') {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 400 });
    }

    const dataDir = join(process.cwd(), 'data', 'pending_audits');
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    const timestamp = Date.now();
    const sanitizedCoach = coachName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedAthlete = athleteId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const fileName = `${sanitizedCoach}_${sanitizedAthlete}_${timestamp}.${ext}`;
    const filePath = join(dataDir, fileName);

    const bytes = await video.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await writeFile(filePath, buffer);

    console.log(`[UPLOAD] Captured vector for ${sanitizedAthlete} (Coach: ${sanitizedCoach})`);

    return NextResponse.json({ 
      success: true, 
      path: fileName,
      message: 'Movement captured. Vectors secured.' 
    });

  } catch (error) {
    console.error('[UPLOAD_ERROR]', error);
    return NextResponse.json({ error: 'Intake System Failure' }, { status: 500 });
  }
}
