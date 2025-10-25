const {
  getApprovalManagement,
  updateApprovalManagement,
} = require('../../controllers/approvals/approvalManagementController');

const router = require('express').Router();

router.get('/:orgid', getApprovalManagement);

router.put('/:orgid', updateApprovalManagement);

module.exports = router;
