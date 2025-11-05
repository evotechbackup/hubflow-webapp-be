const CRMTasks = require('../../models/crm/CRMTasks');
const TaskNotification = require('../../models/notifications/TaskNotification');
const { asyncHandler } = require('../../middleware/errorHandler');

const createTask = asyncHandler(async (req, res) => {
  const date = new Date();

  const reminderSet = new Date(req.body.start);

  if (req.body.reminder === '' || req.body.reminder === '60') {
    reminderSet.setHours(reminderSet.getHours() - 1);
  } else {
    if (req.body.reminder === '5') {
      reminderSet.setMinutes(reminderSet.getMinutes() - 5);
    } else if (req.body.reminder === '15') {
      reminderSet.setMinutes(reminderSet.getMinutes() - 15);
    } else if (req.body.reminder === '30') {
      reminderSet.setMinutes(reminderSet.getMinutes() - 30);
    } else {
      reminderSet.setDate(reminderSet.getDate() - 1);
    }
  }

  const newEvent = new CRMTasks({
    title: req.body.title,
    start: req.body.start,
    end: req.body.end,
    color: req.body.color,
    priority: req.body.priority,
    type: req.body.type,
    leads: req.body.leads,
    contacts: req.body.contacts,
    createdBy: req.params.agentId,
    description: req.body.description,
    company: req.body.company,
    organization: req.body.organization,
    reminder: reminderSet,
  });

  const newevent = await newEvent.save();

  const noti = new TaskNotification({
    type: 'crmtaskadd',
    receiver: req.params.agentId,
    crmTask: newEvent._id,
    date,
  });

  await noti.save();

  res.status(201).json({
    success: true,
    message: 'task created successfully',
    data: newevent,
  });
});

const getAgentTaskById = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  const events = await CRMTasks.find({ createdBy: agentId })
    .populate('leads', ['displayName'])
    .populate('contacts', ['displayName']);

  res.status(200).json({
    success: true,
    message: 'task fetched successfully',
    data: events,
  });
});

const getAllTask = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const events = await CRMTasks.find({ organization: orgId })
    .populate('leads', ['displayName'])
    .populate('contacts', ['displayName']);

  res.status(200).json({
    success: true,
    message: 'task fetched successfully',
    data: events,
  });
});

const getTodoTask = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await CRMTasks.find({
    createdBy: agentId,
    start: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
  }).populate('leads', ['displayName']);

  res.status(200).json({
    success: true,
    message: 'task fetched successfully',
    data: events,
  });
});

const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const updateFields = req.body;

  const updatedEvent = await CRMTasks.findByIdAndUpdate(
    taskId,
    { $set: updateFields },
    { new: true }
  );

  if (!updatedEvent) {
    throw new Error('Task not found');
  }

  res.status(200).json({
    success: true,
    message: 'task updated successfully',
    data: updatedEvent,
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  // Check if the event exists
  const event = await CRMTasks.findOneAndDelete({ id: eventId });
  if (!event) {
    throw new Error('Event not found');
  }

  res
    .status(200)
    .json({ success: true, message: 'Event deleted successfully', data: true });
});

const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  const task = await CRMTasks.findOneAndDelete({ _id: taskId });
  if (!task) {
    throw new Error('Task not found');
  }

  res
    .status(200)
    .json({ success: true, message: 'Task deleted successfully', data: true });
});

const getEventByAgentId = asyncHandler(async (req, res) => {
  const event = await CRMTasks.find({ createdBy: req.params.agentid })
    .populate('leads', ['displayName'])
    .populate('contacts', ['displayName'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'task fetched successfully',
    data: event,
  });
});

const getMeetingByAgentId = asyncHandler(async (req, res) => {
  const event = await CRMTasks.find({
    createdBy: req.params.agentid,
    type: 'meeting',
  })
    .populate('leads', ['displayName'])
    .populate('contacts', ['displayName'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'task fetched successfully',
    data: event,
  });
});

const getTaskByAgentId = asyncHandler(async (req, res) => {
  const event = await CRMTasks.find({
    createdBy: req.params.agentid,
    type: 'task',
  })
    .populate('leads', ['displayName'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'task fetched successfully',
    data: event,
  });
});

const getEventByCompanyId = asyncHandler(async (req, res) => {
  const event = await CRMTasks.find({ organization: req.params.orgid })
    .populate('leads', ['displayName'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'task fetched successfully',
    data: event,
  });
});

const getMeetingByOrg = asyncHandler(async (req, res) => {
  const event = await CRMTasks.find({
    organization: req.params.orgid,
    type: 'meeting',
  })
    .populate('leads', ['displayName'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'task fetched successfully',
    data: event,
  });
});

const tasksbyorg = asyncHandler(async (req, res) => {
  const event = await CRMTasks.find({
    organization: req.params.orgid,
    type: 'task',
  })
    .populate('leads', ['displayName'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'task fetched successfully',
    data: event,
  });
});

const updateMeetingStatus = asyncHandler(async (req, res) => {
  const eventId = req.params.eventid;
  const { status } = req.body;
  const updatedEvent = await CRMTasks.findByIdAndUpdate(
    eventId,
    {
      $set: {
        status,
      },
    },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'task updated successfully',
    data: updatedEvent,
  });
});

module.exports = {
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
};
