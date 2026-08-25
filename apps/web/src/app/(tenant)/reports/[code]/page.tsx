import { redirect } from 'next/navigation';
import { ROUTES } from '../../../../constants/routes.constants';
import { REPORT_CATALOGUE } from '../../../../modules/reports/constants/reports.constants';

export default async function ReportViewerPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const item = REPORT_CATALOGUE.find((r) => r.code === code);
  redirect(item?.href ?? ROUTES.TENANT.REPORTS.ROOT);
}
