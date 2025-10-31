const {
  getAllStorage,
  renameFolder,
  createFolder,
} = require('../../controllers/task/storageController');
const multer = require('multer');
const { authenticate } = require('../../middleware');

const router = require('express').Router();

const storage = multer.memoryStorage();

const upload = multer({ storage });

router.get('/:orgid', authenticate, getAllStorage);
router.post('/renamefolder', authenticate, renameFolder);
router.post('/storageupload/', upload.single('file'), createFolder);

module.exports = router;
