const {
  getAllContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  getContactsWithoutCustomers,
  updateFiles,
  getFiles,
  assignedTo,
  deleteFiles,
  addComment,
  changePipeline,
} = require('../../controllers/crm/contactController');

const router = require('express').Router();

router.get('/all/:orgid', getAllContacts);

router.get('/:id', getContact);

router.post('/create', createContact);

router.put('/update/:id', updateContact);

router.delete('/delete/:id', deleteContact);

router.get('/without-customers/:orgid', getContactsWithoutCustomers);

router.delete('/deleteFiles/:id/:documentId', deleteFiles);

router.put('/assignedTo/:id', assignedTo);

router.put('/updateFiles/:id/:documentId', updateFiles);

router.get('/getFiles/:id', getFiles);

router.put('/addComment/:id', addComment);

router.put('/changePipeline/:id', changePipeline);

module.exports = router;
