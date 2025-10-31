const {
  createFile,
  createSheet,
  updateFile,
  getFilesheets,
  getFileById,
  getFileByfolder,
  getFiles,
  getFilesByfolder,
  getArchiveFile,
  getTrashFile,
  updateSheet,
} = require('../../controllers/sheets/sheetFilesController');

const router = require('express').Router();

router.get('/files/:orgid', getFiles);
router.get('/filesByfolder/:folderid', getFilesByfolder);
router.get('/archiveFile/:orgid', getArchiveFile);
router.get('/trashFile/:orgid', getTrashFile);

router.post('/file/create', createFile);
router.post('/sheet/create', createSheet);

router.put('/file/update', updateFile);
router.put('/sheet/update', updateSheet);

router.get('/filesheets/:id', getFilesheets);
router.get('/file/:id', getFileById);

router.get('/fileByfolder/:id', getFileByfolder);

// router.delete('/delete/:id', deleteFile);

module.exports = router;
