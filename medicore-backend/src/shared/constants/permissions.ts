export const PERMISSIONS = [
  'patients.view', 'patients.create', 'patients.update', 'patients.archive',
  'doctors.view', 'doctors.manage',
  'appointments.view', 'appointments.create', 'appointments.cancel', 'appointments.check_in',
  'consultations.view', 'consultations.create', 'consultations.finalize',
  'prescriptions.view', 'prescriptions.create',
  'billing.view', 'billing.create', 'billing.refund',
  'lab.tests.view', 'lab.tests.manage',
  'lab.orders.view', 'lab.orders.create',
  'lab.samples.collect', 'lab.orders.process',
  'lab.results.enter', 'lab.results.verify',
  'reports.view', 'users.manage', 'audit.view',
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const DEFAULT_ROLES: Record<string, PermissionKey[] | 'ALL'> = {
  'Organization Administrator': 'ALL',

  Receptionist: [
    'patients.view', 'patients.create', 'patients.update', 'doctors.view',
    'appointments.view', 'appointments.create', 'appointments.cancel', 'appointments.check_in',
    'lab.tests.view', 'lab.orders.view', 'lab.orders.create',
  ],

  Doctor: [
    'patients.view', 'doctors.view', 'appointments.view',
    'consultations.view', 'consultations.create', 'consultations.finalize',
    'prescriptions.view', 'prescriptions.create',
    'lab.tests.view', 'lab.orders.view', 'lab.orders.create',
  ],

  'Laboratory Technician': [
    'lab.tests.view', 'lab.orders.view',
    'lab.samples.collect', 'lab.orders.process',
    'lab.results.enter', 'lab.results.verify',
  ],

  Accountant: [
    'patients.view', 'billing.view', 'billing.create',
    'billing.refund', 'reports.view',
  ],
};
