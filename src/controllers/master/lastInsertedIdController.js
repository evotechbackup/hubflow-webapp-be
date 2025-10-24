const { asyncHandler } = require('../../middleware');
const LastInsertedId = require('../../models/master/LastInsertedID');
const { NotFoundError } = require('../../utils/errors');

const getlastInsertedId = asyncHandler(async (req, res) => {
  const allLastIds = await LastInsertedId.find();
  res.json({
    success: true,
    data: allLastIds,
  });
});

const getlastInsertedIdByOrgIdAndEntityName = asyncHandler(async (req, res) => {
  const { entityName } = req.params;
  const { orgid } = req.params;
  const lastInsertedId = await LastInsertedId.findOne({
    entity: entityName,
    organization: orgid,
  });
  if (!lastInsertedId) {
    throw new NotFoundError('Entity not found');
  }
  const { entity, lastId, prefix } = lastInsertedId;
  res.json({
    success: true,
    message: 'Last Inserted ID found',
    data: { entity, lastId, prefix },
  });
});

module.exports = {
  getlastInsertedId,
  getlastInsertedIdByOrgIdAndEntityName,
};
