import { EssRequestDetailPageClient } from '../../ess-pages-client';

interface EmployeeRequestDetailPageProps {
  params: { id: string };
}

export default function EmployeeRequestDetailPage({ params }: EmployeeRequestDetailPageProps) {
  return <EssRequestDetailPageClient id={params.id} />;
}
