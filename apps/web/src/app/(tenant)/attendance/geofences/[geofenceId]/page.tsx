import { GeofenceDetailClient } from './geofence-detail-client';

interface Props {
  params: Promise<{ geofenceId: string }>;
}

export default async function GeofenceDetailPage({ params }: Props) {
  const { geofenceId } = await params;
  return <GeofenceDetailClient geofenceId={geofenceId} />;
}
