const {
  createCostCenter,
  getCostCenters,
  getCostCenterAnalytics,
  deleteCostCenter,
  updateCostCenter,
  getCostCenterById,
  getCostCenterUnits,
  getAccountsForIncome,
  getAccountsForExpense,
  getAccountsForExpenseAssets,
  getAccountsForIncomeWithCostCenter,
} = require('../../controllers/accounts/costCenterController');
const router = require('express').Router();

router.post('/create', createCostCenter);

router.get('/:orgid', getCostCenters);

router.get('/units/:orgid', getCostCenterUnits);

router.get('/accountsforincome/:orgid', getAccountsForIncome);

router.get('/accountsforexpense/:orgid', getAccountsForExpense);

router.get('/accountsforexpensenassets/:orgid', getAccountsForExpenseAssets);

router.get('/accountsforincome/:orgid', getAccountsForIncomeWithCostCenter);

router.get('/getcostcenterbyid/:id', getCostCenterById);

router.get('/analytics/:orgid', getCostCenterAnalytics);

router.delete('/:id', deleteCostCenter);

router.put('/:id', updateCostCenter);

module.exports = router;
