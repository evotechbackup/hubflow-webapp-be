const {
  createTask,
  getTaskByAgentId,
  getEventByAgentId,
  getMeetingByAgentId,
  getEventByCompanyId,
  getMeetingByOrg,
  tasksbyorg,
  updateMeetingStatus,
  getAgentTaskById,
  deleteTask,
  getAllTask,
  getTodoTask,
  updateTask,
  deleteEvent,
} = require('../../controllers/crm/crmTaskConroller');

const router = require('express').Router();

router.post('/:agentId', createTask);

router.get('/:agentId', getAgentTaskById);

router.get('/all/:orgId', getAllTask);

router.get('/todo/:agentId', getTodoTask);

router.put('/:taskId', updateTask);

router.delete('/events/:eventId', deleteEvent);

router.delete('/:taskId', deleteTask);

router.get('/eventbyagentid/:agentid', getEventByAgentId);

router.get('/eventbycompanyid/:orgid', getEventByCompanyId);

router.get('/meetingsbyagentid/:agentid', getMeetingByAgentId);

router.get('/tasksbyagentid/:agentid', getTaskByAgentId);

router.get('/meetingsbyorg/:orgid', getMeetingByOrg);

router.get('/tasksbyorg/:orgid', tasksbyorg);

router.put('/meeting/status/:eventid', updateMeetingStatus);

module.exports = router;
