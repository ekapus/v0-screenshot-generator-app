'use client';

import { CheckCircle, Circle, AlertCircle, Loader } from 'lucide-react';

interface Stage {
  id: string;
  label: string;
}

interface DeploymentStepperProps {
  stages: Stage[];
  currentStage: string;
  completedStages: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export default function DeploymentStepper({
  stages,
  currentStage,
  completedStages,
  status,
}: DeploymentStepperProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="bg-card rounded-lg border p-6">
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const isCompleted = completedStages.includes(stage.id);
          const isCurrent = stage.id === currentStage;
          const isUpcoming = index > currentIndex;

          return (
            <div key={stage.id} className="flex items-start gap-4">
              {/* Step Icon */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2">
                {isCompleted ? (
                  <CheckCircle className="h-6 w-6 text-green-600 border-green-600" />
                ) : isCurrent ? (
                  <Loader className="h-6 w-6 text-blue-600 border-blue-600 animate-spin" />
                ) : status === 'failed' && isUpcoming ? (
                  <Circle className="h-6 w-6 text-gray-300 border-gray-300" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300 border-gray-300" />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1">
                <p className={`font-semibold ${isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {stage.label}
                </p>
                {isCompleted && (
                  <p className="text-xs text-green-600 mt-1">Completed</p>
                )}
                {isCurrent && (
                  <p className="text-xs text-blue-600 mt-1">In progress...</p>
                )}
              </div>

              {/* Connector */}
              {index < stages.length - 1 && (
                <div className="absolute left-5 w-0.5 h-12 bg-gray-200" style={{ marginTop: '2.5rem' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
