const Logs = require('../models/approvals/Logs');

/**
 * Creates an activity log entry
 * @param {Object} params - Log parameters
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.action - Type of action (create, update, delete, etc.)
 * @param {string} params.type - Entity type the action is performed on
 * @param {string} params.actionId - ID of the entity being acted upon
 * @param {string} params.organization - Organization ID
 * @param {string} params.company - Company ID
 * @returns {Promise<Object|null>} The saved log entry, or null if validation fails
 */
async function createActivityLog({
  userId,
  action,
  type,
  actionId,
  organization,
  company,
}) {
  if (!userId || !action || !type || !actionId || !organization || !company) {
    return null;
  }

  const log = new Logs({
    user: userId,
    action,
    type,
    actionId,
    organization,
    company,
  });
  return await log.save();
}

module.exports = {
  createActivityLog,
};
