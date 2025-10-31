const {
  createFile,
  createTab,
  updateTabs,
  deleteTab,
  fileUpdate,
  docsTabs,
  getAllFiles,
  getFilesByFolderId,
  getArchiveFiles,
  getTrashFiles,
  getFileById,
} = require('../../controllers/docsFile/docsFilesController');

const router = require('express').Router();

router.get('/files/:orgid', getAllFiles);

router.post('/file/create', createFile);

router.post('/tabs/create', createTab);

router.put('/file/update', fileUpdate);

router.get('/docstabs/:id', docsTabs);

router.get('/file/:id', getFileById);

router.get('/filesByFolderId/:folderId', getFilesByFolderId);

router.get('/archiveFile/:orgid', getArchiveFiles);

router.get('/trashFile/:orgid', getTrashFiles);

router.put('/tabs/update', updateTabs);

router.delete('/deletetab/:id', deleteTab);

module.exports = router;
