const {
  createFolder,
  updateFolder,
  getFolderById,
  getFolders,
  deleteFolder,
  getFolderBySlug,
  existFolderByName,
  getAgentsByOrgId,
} = require('../../controllers/docsFile/docsFolderController');

const router = require('express').Router();

router.get('/all/:orgid', getFolders);

router.post('/create', createFolder);

router.put('/update/:id', updateFolder);

router.get('/folderById/:id', getFolderById);

router.get('/exists/:name/:orgid', existFolderByName);

router.get('/slug/:slug', getFolderBySlug);

router.get('/agentsbyorgid/:id/:orgid', getAgentsByOrgId);

router.delete('/delete/:id', deleteFolder);

module.exports = router;
