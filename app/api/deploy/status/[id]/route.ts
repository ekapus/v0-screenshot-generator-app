import { NextRequest, NextResponse } from 'next/server';

export async function GET(
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

    // Return status without sensitive data
    return NextResponse.json({
      deploymentId: id,
      status: state.status,
      stage: state.stage,
      progress: state.progress,
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      logs: state.logs,
      stackOutput: state.stackOutput,
      error: state.error,
      config: {
        region: state.config.region,
        stackName: state.config.stackName,
      },
    });
  } catch (error) {
    console.error('[Status API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
