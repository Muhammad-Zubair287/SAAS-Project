import { EssPayslipDetailPageClient } from '../../ess-pages-client';

export default function PayslipDetailPage({ params }: { params: { id: string } }) {
  return <EssPayslipDetailPageClient id={params.id} />;
}
