import { GeofenceEditClient } from './geofence-edit-client';

interface Props {
  params: Promise<{ geofenceId: string }>;
}

export default async function GeofenceEditPage({ params }: Props) {
  const { geofenceId } = await params;
  return <GeofenceEditClient geofenceId={geofenceId} />;
}
