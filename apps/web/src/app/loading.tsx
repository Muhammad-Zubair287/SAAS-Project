import { LoadingSpinner } from '../components/feedback/loading-spinner';

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-canvas">
      <LoadingSpinner size="lg" label="Loading application..." />
    </div>
  );
}
