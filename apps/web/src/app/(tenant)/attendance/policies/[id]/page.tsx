import { PolicyDetailPageClient } from './policy-detail-page-client';

interface Props { params: Promise<{ id: string }> }

export default async function PolicyDetailPage({ params }: Props) {
  const { id } = await params;
  return <PolicyDetailPageClient id={id} />;
}
