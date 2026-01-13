import { NextResponse } from 'next/server';
import { getContestById } from '@/lib/actions';

export async function GET(request: Request, { params }: { params: { contestId: string } }) {
  try {
    const contest = await getContestById(params.contestId);
    if (!contest) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(contest);
  } catch (err) {
    console.error('Error fetching contest:', err);
    return NextResponse.json({ error: 'Failed to fetch contest' }, { status: 500 });
  }
}
