const {
  createJournal,
  updateJournal,
  updateJournalRevised,
  getJournals,
  getJournalslipbyid,
  getJournalsFilterByDate,
} = require('../../controllers/accounts/journalController');

const router = require('express').Router();

router.post('/', createJournal);
router.put('/:id', updateJournal);
router.put('/revised/:id', updateJournalRevised);
router.get('/getjournals/:orgid', getJournals);
router.get('/getjournalslipbyid/:id', getJournalslipbyid);
router.get('/getjournals/filterbydate/:orgid', getJournalsFilterByDate);

module.exports = router;
