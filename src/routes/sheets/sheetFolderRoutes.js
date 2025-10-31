const {
  createFolder,
  updateFolder,
  getFolderById,
  getAllFolders,
  deleteFolder,
  getFolderBySlug,
  existFolderByName,
  getAgentsByOrgId,
} = require('../../controllers/sheets/sheetFolderController');

const router = require('express').Router();

router.get('/all/:orgid', getAllFolders);
router.get('/folderById/:id', getFolderById);
router.get('/exists/:name/:orgid', existFolderByName);
router.get('/slug/:slug', getFolderBySlug);
router.get('/agentsbyorgid/:id/:orgid', getAgentsByOrgId);

router.post('/create', createFolder);

router.put('/update/:id', updateFolder);

router.delete('/delete/:id', deleteFolder);

module.exports = router;
