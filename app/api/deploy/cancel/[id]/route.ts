import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Deployment ID is required' },
        { status: 400 }
      );
    }

    // Get from global memory store
    const deploymentStates = (global as any)._deployments || new Map();
    const state = deploymentStates.get(id);

    if (!state) {
      return NextResponse.json(
        { error: 'Deployment not found' },
        { status: 404 }
      );
    }

    if (state.status !== 'running') {
      return NextResponse.json(
        { error: 'Cannot cancel a deployment that is not running' },
        { status: 400 }
      );
    }

    // Mark as cancelled
    state.status = 'failed';
    state.error = 'Deployment cancelled by user';
    state.logs.push({
      timestamp: new Date().toISOString(),
      message: 'Deployment cancelled by user',
      level: 'warning',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cancel API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
