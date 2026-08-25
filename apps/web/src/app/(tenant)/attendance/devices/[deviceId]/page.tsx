import { DeviceDetailClient } from './device-detail-client';

interface DeviceDetailPageProps {
  params: Promise<{ deviceId: string }>;
}

export default async function DeviceDetailPage({ params }: DeviceDetailPageProps) {
  const { deviceId } = await params;
  return <DeviceDetailClient deviceId={deviceId} />;
}
