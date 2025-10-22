const {
  getAllActivityMaster,
  getActivityMaster,
  createActivityMaster,
  updateActivityMaster,
  deleteActivityMaster,
} = require('../../controllers/master/activityMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllActivityMaster);

router.get('/:id', getActivityMaster);

router.post('/create', createActivityMaster);

router.put('/update/:id', updateActivityMaster);

router.delete('/delete/:id', deleteActivityMaster);

module.exports = router;
