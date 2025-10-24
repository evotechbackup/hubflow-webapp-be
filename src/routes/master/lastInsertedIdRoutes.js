const {
  getlastInsertedId,
  getlastInsertedIdByOrgIdAndEntityName,
} = require('../../controllers/master/lastInsertedIdController');

const express = require('express');
const router = express.Router();

router.get('/', getlastInsertedId);

router.get('/:orgid/:entityName', getlastInsertedIdByOrgIdAndEntityName);

module.exports = router;
