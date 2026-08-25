import { OfflineSessionDetailClient } from './offline-session-detail-client';

interface Props {
  params: Promise<{ sessionId: string }>;
}

export default async function OfflineSessionDetailPage({ params }: Props) {
  const { sessionId } = await params;
  return <OfflineSessionDetailClient sessionId={sessionId} />;
}
