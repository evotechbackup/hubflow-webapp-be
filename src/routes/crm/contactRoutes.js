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
  bulkEdit,
  bulkassign,
  getCRMContactsDeals,
  getCRMContactsMeeting,
  editComment,
} = require('../../controllers/crm/contactController');
const { authenticate } = require('../../middleware');

const router = require('express').Router();

router.get('/:orgid', getAllContacts);

router.get('/getcontactByid/:id', authenticate, getContact);

router.post('/create', authenticate, createContact);

router.put('/bulk-edit', authenticate, bulkEdit);

router.put('/bulk-assign', authenticate, bulkassign);

router.put('/update/:id', updateContact);

router.delete('/delete/:id', deleteContact);

router.get('/without-customers/:orgid', getContactsWithoutCustomers);

router.delete('/deleteFiles/:id/:documentId', deleteFiles);

router.put('/assignedTo/:id', assignedTo);

router.put('/updateFiles/:id/:documentId', updateFiles);

router.get('/getFiles/:id', getFiles);

router.put('/addComment/:id', addComment);

router.put('/editComment/:id', editComment);

router.get('/deals/:id', authenticate, getCRMContactsDeals);

router.get('/meeting/:id', authenticate, getCRMContactsMeeting);

router.put('/changePipeline/:id', changePipeline);

module.exports = router;
