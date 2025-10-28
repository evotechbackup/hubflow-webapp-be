const APPROVAL_STATUSES = [
  'none',
  'pending',
  'reviewed',
  'verified',
  'acknowledged',
  'correction',
  'rejected',
  'approved1',
  'approved2',
];

const PF = 'https://hub-flow-assets.s3.me-central-1.amazonaws.com/';

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const PAYROLL_LIST_TYPES = {
  full: 'Salary-Payment',
  advance: 'Advance-Payment',
  timesheet: 'Attendance-Timesheet-Payment',
  loan: 'Loan-Payment',
};

module.exports = {
  APPROVAL_STATUSES,
  PF,
  MONTH_NAMES,
  PAYROLL_LIST_TYPES,
};
