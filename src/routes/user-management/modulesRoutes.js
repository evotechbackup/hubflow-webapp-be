const router = require('express').Router();

const {
  createModule,
  getAllModules,
  assignModulesToCompany,
  editModule,
  assignModuleToCompany,
  getModulesFromCompany,
  getActiveModulesFromCompany,
  getActiveModuleIdsFromCompany,
  getAllModulesForMasterAdmin,
  createModuleForMasterAdmin,
} = require('../../controllers/user-management/modulesController');

// Create a module
router.post('/', createModule);

// Get all modules
router.get('/', getAllModules);

//Assign modules to company but not active
router.put('/assign', assignModulesToCompany);

// Edit a module
router.put('/master/:id', editModule);

// Assign a module to a company
router.put('/:id/assign', assignModuleToCompany);

// get modules from company
router.get('/:companyId', getModulesFromCompany);

// get active modules from company
router.get('/active/:companyId', getActiveModulesFromCompany);

//get active module id from company
router.get('/active/ids/:companyId', getActiveModuleIdsFromCompany);

// modules for master admin
router.get('/master/all', getAllModulesForMasterAdmin);

// modules for master admin
router.post('/master', createModuleForMasterAdmin);

module.exports = router;
