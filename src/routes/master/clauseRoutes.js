const {
  getAllClauseMaster,
  getClauseMaster,
  createClauseMaster,
  updateClauseMaster,
  deleteClauseMaster,
} = require('../../controllers/master/clauseMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllClauseMaster);

router.get('/:id', getClauseMaster);

router.post('/create', createClauseMaster);

router.put('/update/:id', updateClauseMaster);

router.delete('/delete/:id', deleteClauseMaster);

module.exports = router;
