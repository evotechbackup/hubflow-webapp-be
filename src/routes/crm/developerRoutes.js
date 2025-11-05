const {
  createDeveloper,
  updatedDevloper,
  getDevelopers,
  getdeveloperbyid,
  addNotes,
  deleteDeveloper,
} = require('../../controllers/crm/developerContoller');

const router = require('express').Router();

router.get('/:orgid', getDevelopers);

router.get('/developerbyid/:id', getdeveloperbyid);

router.post('/create', createDeveloper);

router.put('/:id', updatedDevloper);

router.post('/notes/:id', addNotes);

router.delete('/:id', deleteDeveloper);

module.exports = router;
