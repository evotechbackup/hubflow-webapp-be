const {
  getAllLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  getLeadsWithoutCustomers,
  updateFiles,
  getFiles,
  assignedTo,
  deleteFiles,
  changepipeline,
  uploadFile,
} = require('../../controllers/crm/leadController');
const { authenticate } = require('../../middleware');
const multer = require('multer');
const router = require('express').Router();

const storage = multer.memoryStorage();

const upload = multer({ storage });

router.get('/all/:orgid', authenticate, getAllLeads);

router.get('/:id', authenticate, getLead);

router.post('/create', authenticate, createLead);

router.put('/addComment/:id', authenticate, createLead);

router.put('/update/:id', authenticate, updateLead);

router.put('/changepipeline/:id', authenticate, changepipeline);

router.delete('/delete/:id', authenticate, deleteLead);

router.get('/without-customers/:orgid', authenticate, getLeadsWithoutCustomers);

router.delete('/deleteFiles/:id', authenticate, deleteFiles);

router.post('/assignedTo/:id', authenticate, assignedTo);

router.put('/updateFiles/:id', authenticate, updateFiles);

router.get('/getFiles/:id', authenticate, getFiles);

router.post('/uploaddocs/:type/:id', upload.single('file'), uploadFile);

module.exports = router;
