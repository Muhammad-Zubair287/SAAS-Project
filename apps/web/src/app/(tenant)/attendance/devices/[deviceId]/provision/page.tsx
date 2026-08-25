import { ProvisionDeviceClient } from './provision-device-client';

interface Props {
  params: Promise<{ deviceId: string }>;
}

export default async function ProvisionDevicePage({ params }: Props) {
  const { deviceId } = await params;
  return <ProvisionDeviceClient deviceId={deviceId} />;
}
