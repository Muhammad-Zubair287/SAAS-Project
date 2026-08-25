import { ShiftEditClient } from './shift-edit-client';

interface PageProps {
  params: { shiftId: string };
}

export default function EditShiftPage({ params }: PageProps) {
  return <ShiftEditClient shiftId={params.shiftId} />;
}
