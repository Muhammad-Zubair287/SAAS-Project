import { EssLeaveDetailPageClient } from '../../ess-pages-client';

export default function LeaveRequestDetailPage({ params }: { params: { id: string } }) {
  return <EssLeaveDetailPageClient id={params.id} />;
}
