import { Suspense } from 'react';
import SuccessPageContent from './success-content';

export const dynamic = 'force-dynamic';

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SuccessPageContent />
    </Suspense>
  );
}
