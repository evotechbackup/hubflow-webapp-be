const {
  createEvent,
  getEventById,
  getAllEvents,
  getTodoByAgentId,
  updateEvent,
  deleteEvent,
  deleteTodo,
  getEventByAgentId,
  getMeetingByAgentId,
  tasksbyagentid,
  eventbycompanyid,
  meetingsbyorg,
  tasksbyorg,
  updateMeetingStatus,
} = require('../../controllers/task/taskController');

const router = require('express').Router();

router.get('/events/all/:orgid', getAllEvents);
router.get('/events/:agentId', getEventById);
router.get('/todo/:agentId', getTodoByAgentId);
router.get('/eventbyagentid/:agentid', getEventByAgentId);
router.get('/meetingsbyagentid/:agentid', getMeetingByAgentId);
router.get('/tasksbyagentid/:agentid', tasksbyagentid);
router.get('/eventbycompanyid/:orgid', eventbycompanyid);
router.get('/meetingsbyorg/:orgid', meetingsbyorg);
router.get('/tasksbyorg/:orgid', tasksbyorg);

router.post('/events/:agentId', createEvent);

router.put('/events/:eventId', updateEvent);
router.put('/meeting/status/:eventId', updateMeetingStatus);

router.delete('/events/:eventId', deleteEvent);
router.delete('/todo/:todoId', deleteTodo);

module.exports = router;
