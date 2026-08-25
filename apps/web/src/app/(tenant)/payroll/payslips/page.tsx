import { getTranslations } from 'next-intl/server';
import { PayrollPayslipsPageClient } from './payslips-page-client';

export default async function PayrollPayslipsPage() {
  const t = await getTranslations('tenant.payroll.payslips');
  return <PayrollPayslipsPageClient title={t('title')} description={t('description')} />;
}
