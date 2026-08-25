import { EditPolicyPageClient } from './edit-policy-page-client';

interface Props { params: Promise<{ id: string }> }

export default async function EditPolicyPage({ params }: Props) {
  const { id } = await params;
  return <EditPolicyPageClient id={id} />;
}