import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Deployment Regions
// ---------------------------------------------------------------------------
const DEPLOYMENT_REGIONS = [
  {
    code: 'ap-south-1',
    name: 'Asia Pacific — South (Mumbai)',
    cloudProvider: 'AWS',
    cloudRegion: 'ap-south-1',
    countryCode: 'IN',
    status: 'ACTIVE',
  },
  {
    code: 'me-south-1',
    name: 'Middle East — South (Bahrain)',
    cloudProvider: 'AWS',
    cloudRegion: 'me-south-1',
    countryCode: 'BH',
    status: 'ACTIVE',
  },
  {
    code: 'eu-west-2',
    name: 'Europe — West (London)',
    cloudProvider: 'AWS',
    cloudRegion: 'eu-west-2',
    countryCode: 'GB',
    status: 'ACTIVE',
  },
  {
    code: 'us-east-1',
    name: 'US East — North Virginia',
    cloudProvider: 'AWS',
    cloudRegion: 'us-east-1',
    countryCode: 'US',
    status: 'ACTIVE',
  },
  {
    code: 'ap-southeast-2',
    name: 'Asia Pacific — Southeast (Sydney)',
    cloudProvider: 'AWS',
    cloudRegion: 'ap-southeast-2',
    countryCode: 'AU',
    status: 'ACTIVE',
  },
] as const;

// ---------------------------------------------------------------------------
// Commercial Plans
// ---------------------------------------------------------------------------
const PLANS = [
  {
    code: 'essential',
    name: 'Essential',
    description: 'Core HR, attendance and leave for growing businesses.',
    billingModel: 'PER_SEAT',
    status: 'ACTIVE',
  },
  {
    code: 'growth',
    name: 'Growth',
    description: 'Everything in Essential plus payroll, shifts and advanced reports.',
    billingModel: 'PER_SEAT',
    status: 'ACTIVE',
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    description: 'Full platform with SSO, dedicated support, custom SLAs and analytics.',
    billingModel: 'PER_SEAT',
    status: 'ACTIVE',
  },
] as const;

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------
// data_type values: INTEGER | BOOLEAN | STRING | DECIMAL
// default_value is stored as JSONB — use JSON-native types.

const ENTITLEMENTS = [
  // Capacity limits
  {
    code: 'max_employees',
    label: 'Max Employees',
    description: 'Maximum number of active employees allowed.',
    dataType: 'INTEGER',
    defaultValue: 50,
    unit: 'employees',
    status: 'ACTIVE',
  },
  {
    code: 'max_legal_entities',
    label: 'Max Legal Entities',
    description: 'Maximum number of legal entities a tenant can create.',
    dataType: 'INTEGER',
    defaultValue: 1,
    unit: 'entities',
    status: 'ACTIVE',
  },
  {
    code: 'max_branches',
    label: 'Max Branches',
    description: 'Maximum number of branches across all legal entities.',
    dataType: 'INTEGER',
    defaultValue: 3,
    unit: 'branches',
    status: 'ACTIVE',
  },
  {
    code: 'max_departments',
    label: 'Max Departments',
    description: 'Maximum number of departments.',
    dataType: 'INTEGER',
    defaultValue: 10,
    unit: 'departments',
    status: 'ACTIVE',
  },
  // Storage
  {
    code: 'storage_limit_gb',
    label: 'Storage Limit (GB)',
    description: 'Document and file storage limit in gigabytes.',
    dataType: 'INTEGER',
    defaultValue: 5,
    unit: 'GB',
    status: 'ACTIVE',
  },
  // API
  {
    code: 'api_rate_limit_rpm',
    label: 'API Rate Limit (req/min)',
    description: 'Maximum API requests per minute per tenant.',
    dataType: 'INTEGER',
    defaultValue: 60,
    unit: 'req/min',
    status: 'ACTIVE',
  },
  // Payroll
  {
    code: 'max_payroll_runs_per_month',
    label: 'Payroll Runs Per Month',
    description: 'Maximum number of payroll runs per calendar month.',
    dataType: 'INTEGER',
    defaultValue: 1,
    unit: 'runs',
    status: 'ACTIVE',
  },
  // Features (boolean)
  {
    code: 'feature_core_hr',
    label: 'Core HR',
    description: 'Enables the core employee and organisation HR module.',
    dataType: 'BOOLEAN',
    defaultValue: true,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_attendance',
    label: 'Attendance',
    description: 'Enables attendance capture and calculation.',
    dataType: 'BOOLEAN',
    defaultValue: true,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_leave',
    label: 'Leave',
    description: 'Enables leave policies, balances and requests.',
    dataType: 'BOOLEAN',
    defaultValue: true,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_payroll',
    label: 'Payroll Module',
    description: 'Enables the full payroll module.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_shifts',
    label: 'Shifts & Roster Module',
    description: 'Enables shift scheduling and roster management.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_advanced_reports',
    label: 'Advanced Reports & Dashboards',
    description: 'Enables custom report builder and advanced analytics.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_sso',
    label: 'Single Sign-On (SSO)',
    description: 'Enables enterprise SSO via SAML / OIDC.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_custom_branding',
    label: 'Custom Branding',
    description: 'Enables tenant logo, colours, and domain.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_api_access',
    label: 'Public API Access',
    description: 'Enables tenant API key generation and webhook configuration.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_dedicated_support',
    label: 'Dedicated Support',
    description: 'Assigns a dedicated customer success manager.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_taskops',
    label: 'TaskOps',
    description: 'Enables task and operations management.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_performance',
    label: 'Performance Management',
    description: 'Enables performance reviews and goals.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_assets',
    label: 'Assets',
    description: 'Enables asset tracking and assignment.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_benefits',
    label: 'Benefits',
    description: 'Enables employee benefits administration.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_ai_insights',
    label: 'AI Insights',
    description: 'Enables AI-powered workforce analytics.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_compliance_packs',
    label: 'Compliance Packs',
    description: 'Enables regional compliance policy packs.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_webhooks',
    label: 'Webhooks',
    description: 'Enables outbound webhook integrations.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_on_prem_connector',
    label: 'On-Prem Connector',
    description: 'Enables on-premises data connector.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  {
    code: 'feature_custom_fields',
    label: 'Custom Fields',
    description: 'Enables tenant-defined custom fields.',
    dataType: 'BOOLEAN',
    defaultValue: false,
    unit: null,
    status: 'ACTIVE',
  },
  // Commercial pricing (per currency unit — PKR primary market)
  {
    code: 'pricing_per_employee_monthly',
    label: 'Per-Employee Monthly Fee',
    description: 'Commercial per-seat monthly rate in tenant base currency minor units.',
    dataType: 'DECIMAL',
    defaultValue: 0,
    unit: 'currency',
    status: 'ACTIVE',
  },
  {
    code: 'pricing_minimum_platform_fee',
    label: 'Minimum Platform Fee',
    description: 'Minimum monthly platform fee in tenant base currency minor units.',
    dataType: 'DECIMAL',
    defaultValue: 0,
    unit: 'currency',
    status: 'ACTIVE',
  },
  // Audit retention
  {
    code: 'audit_log_retention_days',
    label: 'Audit Log Retention (days)',
    description: 'Number of days audit events are retained and searchable.',
    dataType: 'INTEGER',
    defaultValue: 90,
    unit: 'days',
    status: 'ACTIVE',
  },
] as const;

// ---------------------------------------------------------------------------
// Plan Entitlement values (override default_value per plan)
// ---------------------------------------------------------------------------

type PlanCode = 'essential' | 'growth' | 'enterprise';
type EntitlementCode = (typeof ENTITLEMENTS)[number]['code'];

const PLAN_ENTITLEMENT_VALUES: Record<PlanCode, Partial<Record<EntitlementCode, unknown>>> = {
  essential: {
    max_employees: 200,
    max_legal_entities: 1,
    max_branches: 5,
    max_departments: 20,
    storage_limit_gb: 10,
    api_rate_limit_rpm: 60,
    max_payroll_runs_per_month: 0,
    feature_core_hr: true,
    feature_attendance: true,
    feature_leave: true,
    feature_payroll: false,
    feature_shifts: false,
    feature_advanced_reports: false,
    feature_sso: false,
    feature_custom_branding: false,
    feature_api_access: false,
    feature_dedicated_support: false,
    feature_taskops: true,
    feature_performance: false,
    feature_assets: false,
    feature_benefits: false,
    feature_ai_insights: false,
    feature_compliance_packs: false,
    feature_webhooks: false,
    feature_on_prem_connector: false,
    feature_custom_fields: false,
    pricing_per_employee_monthly: 350,
    pricing_minimum_platform_fee: 10000,
    audit_log_retention_days: 90,
  },
  growth: {
    max_employees: 2000,
    max_legal_entities: 3,
    max_branches: 20,
    max_departments: 100,
    storage_limit_gb: 50,
    api_rate_limit_rpm: 300,
    max_payroll_runs_per_month: 2,
    feature_core_hr: true,
    feature_attendance: true,
    feature_leave: true,
    feature_payroll: true,
    feature_shifts: true,
    feature_advanced_reports: true,
    feature_sso: false,
    feature_custom_branding: true,
    feature_api_access: true,
    feature_dedicated_support: false,
    feature_taskops: true,
    feature_performance: true,
    feature_assets: true,
    feature_benefits: false,
    feature_ai_insights: false,
    feature_compliance_packs: true,
    feature_webhooks: true,
    feature_on_prem_connector: false,
    feature_custom_fields: true,
    pricing_per_employee_monthly: 450,
    pricing_minimum_platform_fee: 15000,
    audit_log_retention_days: 365,
  },
  enterprise: {
    max_employees: 999999,
    max_legal_entities: 999,
    max_branches: 999,
    max_departments: 9999,
    storage_limit_gb: 500,
    api_rate_limit_rpm: 1000,
    max_payroll_runs_per_month: 10,
    feature_core_hr: true,
    feature_attendance: true,
    feature_leave: true,
    feature_payroll: true,
    feature_shifts: true,
    feature_advanced_reports: true,
    feature_sso: true,
    feature_custom_branding: true,
    feature_api_access: true,
    feature_dedicated_support: true,
    feature_taskops: true,
    feature_performance: true,
    feature_assets: true,
    feature_benefits: true,
    feature_ai_insights: true,
    feature_compliance_packs: true,
    feature_webhooks: true,
    feature_on_prem_connector: true,
    feature_custom_fields: true,
    pricing_per_employee_monthly: 600,
    pricing_minimum_platform_fee: 25000,
    audit_log_retention_days: 2555, // 7 years
  },
};

// ---------------------------------------------------------------------------
// Seed runner
// ---------------------------------------------------------------------------

export async function seedM01Catalogues(): Promise<void> {
  console.log('Seeding M01 global catalogues…');

  // 1. Deployment regions
  for (const region of DEPLOYMENT_REGIONS) {
    await prisma.deploymentRegion.upsert({
      where: { code: region.code },
      update: {
        name: region.name,
        cloudProvider: region.cloudProvider,
        cloudRegion: region.cloudRegion,
        countryCode: region.countryCode,
        status: region.status,
      },
      create: region,
    });
  }
  console.log(`  ✓ ${DEPLOYMENT_REGIONS.length} deployment regions`);

  // 2. Plans
  const planRecords: Record<string, { id: string }> = {};
  for (const plan of PLANS) {
    const record = await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        billingModel: plan.billingModel,
        status: plan.status,
      },
      create: plan,
    });
    planRecords[plan.code] = record;
  }
  console.log(`  ✓ ${PLANS.length} plans`);

  // 3. Entitlements
  const entitlementRecords: Record<string, { id: string }> = {};
  for (const ent of ENTITLEMENTS) {
    const record = await prisma.entitlement.upsert({
      where: { code: ent.code },
      update: {
        label: ent.label,
        description: ent.description,
        dataType: ent.dataType,
        defaultValue: ent.defaultValue,
        unit: ent.unit ?? undefined,
        status: ent.status,
      },
      create: {
        code: ent.code,
        label: ent.label,
        description: ent.description,
        dataType: ent.dataType,
        defaultValue: ent.defaultValue,
        unit: ent.unit ?? undefined,
        status: ent.status,
      },
    });
    entitlementRecords[ent.code] = record;
  }
  console.log(`  ✓ ${ENTITLEMENTS.length} entitlements`);

  // 4. Plan entitlements
  let planEntitlementCount = 0;
  for (const [planCode, overrides] of Object.entries(PLAN_ENTITLEMENT_VALUES) as [PlanCode, Record<string, unknown>][]) {
    const planId = planRecords[planCode]?.id;
    if (!planId) continue;

    for (const [entCode, value] of Object.entries(overrides)) {
      const entitlementId = entitlementRecords[entCode]?.id;
      if (!entitlementId) continue;

      await prisma.planEntitlement.upsert({
        where: {
          planId_entitlementId: { planId, entitlementId },
        },
        update: { defaultValue: value as Prisma.InputJsonValue },
        create: { planId, entitlementId, defaultValue: value as Prisma.InputJsonValue },
      });
      planEntitlementCount++;
    }
  }
  console.log(`  ✓ ${planEntitlementCount} plan entitlements`);

  console.log('M01 global catalogues seeded successfully.');
}

// Allow running directly: `ts-node m01-catalogue.seed.ts`
if (require.main === module) {
  seedM01Catalogues()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
