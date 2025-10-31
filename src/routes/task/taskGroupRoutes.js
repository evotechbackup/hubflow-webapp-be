const {
  getAllTaskGroup,
  getTaskGroupByAgentId,
  getTaskGroupById,
  createTaskGroup,
  updateTaskGroup,
  deleteTaskGroup,
  updateTaskGroupStatus,
  getAgentsByTaskGroupId,
  addTagsToTaskGroup,
  getTagsByTaskGroupId,
} = require('../../controllers/task/taskGroupController');

const router = require('express').Router();

router.get('/:orgid', getAllTaskGroup);
router.get('/agent/:id', getTaskGroupByAgentId);
router.get('/get/:id', getTaskGroupById);
router.post('/', createTaskGroup);
router.put('/:id', updateTaskGroup);
router.delete('/:id', deleteTaskGroup);

router.put('/change/:taskId', updateTaskGroupStatus);
router.get('/getagents/:id', getAgentsByTaskGroupId);
router.get('/gettasks/:id', getTagsByTaskGroupId);
router.get('/gettags/:id', getTagsByTaskGroupId);
router.post('/addtags/:id', addTagsToTaskGroup);

module.exports = router;
