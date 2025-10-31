const Task = require('../../models/task/Task');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
// const { subscribeToTopicByAgentId } = require("../../controller/Notifier");

const createEvent = asyncHandler(async (req, res) => {
  const agentIds = req.body.agentids || [];
  //   const date = new Date();

  const paramAgentId = req.params.agentId;
  const allagentIds = [...agentIds];
  if (paramAgentId && !allagentIds.includes(paramAgentId)) {
    allagentIds.push(paramAgentId);
  }

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

  const newEvent = new Task({
    title: req.body.title,
    start: req.body.start,
    end: req.body.end,
    color: req.body.color,
    priority: req.body.priority,
    type: req.body.type,
    agent: allagentIds,
    customer: req.body.customer,
    company: req.body.company,
    createdBy: paramAgentId,
    description: req.body.description,
    reminder: reminderSet,
    organization: req.body.organization,
    taskGroup: req.body.taskGroup,
    due: req.body.due,
    tags: req.body.tags,
    tagColor: req.body.tagColor,
    status: req.body.type === 'meeting' ? 'pending' : 'new',
  });

  const newevent = await newEvent.save();

  //   for (let i = 0; i < allagentIds.length; i++) {
  //     subscribeToTopicByAgentId(allagentIds[i], 'eventadd', newEvent._id);

  //     const noti = new TaskNotification({
  //       type: 'eventadd',
  //       receiver: allagentIds[i],
  //       task: newEvent._id,
  //       date,
  //     });
  //     const not = await noti.save();
  //   }

  res.status(201).json({
    success: true,
    message: 'Event created successfully',
    data: newevent,
  });
});

const getEventById = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const events = await Task.find({ agent: agentId })
    .populate('customer', ['displayName'])
    .populate('agent', ['fullName']);

  res.status(200).json({
    success: true,
    message: 'Event created successfully',
    data: events,
  });
});

const getAllEvents = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  const events = await Task.find({ organization: orgId })
    .populate('customer', ['displayName'])
    .populate('agent', ['fullName']);

  res.status(200).json({
    success: true,
    message: 'Event created successfully',
    data: events,
  });
});

const getTodoByAgentId = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await Task.find({
    agent: agentId,
    start: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    },
  }).populate('customer', ['displayName']);

  res.status(200).json({
    success: true,
    message: 'Event created successfully',
    data: events,
  });
});

const updateEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

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

  const updateFields = req.body;
  updateFields.reminder = reminderSet;

  const updatedEvent = await Task.findByIdAndUpdate(
    eventId,
    { $set: updateFields },
    { new: true }
  );

  if (!updatedEvent) {
    throw new NotFoundError('Event not found');
  }

  res.status(200).json({
    success: true,
    message: 'Event updated successfully',
    data: updatedEvent,
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await Task.findOneAndDelete({ _id: eventId });
  if (!event) {
    throw new NotFoundError('Event not found');
  }

  res.status(200).json({
    success: true,
    message: 'Event deleted successfully',
  });
});

const deleteTodo = asyncHandler(async (req, res) => {
  const { todoId } = req.params;

  const todo = await Task.findOneAndDelete({ _id: todoId });
  if (!todo) {
    throw new NotFoundError('Todo not found');
  }

  res.status(200).json({
    success: true,
    message: 'Todo deleted successfully',
  });
});

const getEventByAgentId = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  const event = await Task.find({ agent: agentId })
    .populate('customer', ['displayName'])
    .populate('agent', ['fullName', 'profilePic'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'Event fetched successfully',
    data: event,
  });
});

const getMeetingByAgentId = asyncHandler(async (req, res) => {
  const { agentId } = req.params;

  const event = await Task.find({ agent: agentId })
    .populate('customer', ['displayName'])
    .populate('agent', ['fullName', 'profilePic'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'Event fetched successfully',
    data: event,
  });
});

const tasksbyagentid = asyncHandler(async (req, res) => {
  const event = await Task.find({
    agent: req.params.agentid,
    type: 'todo',
  })
    .populate('customer', ['displayName'])
    .populate('agent', ['fullName', 'profilePic'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'Event fetched successfully',
    data: event,
  });
});

const eventbycompanyid = asyncHandler(async (req, res) => {
  const event = await Task.find({ organization: req.params.orgid })
    .populate('customer', ['displayName'])
    .populate('agent', ['fullName', 'profilePic'])
    .sort({ start: 1 });
  res.status(200).json(event);
});

const meetingsbyorg = asyncHandler(async (req, res) => {
  const event = await Task.find({
    organization: req.params.orgid,
    type: 'meeting',
  })
    .populate('customer', ['displayName'])
    .populate('agent', ['fullName', 'profilePic'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'Event fetched successfully',
    data: event,
  });
});

const tasksbyorg = asyncHandler(async (req, res) => {
  const event = await Task.find({
    organization: req.params.orgid,
    type: 'todo',
  })
    .populate('customer', ['displayName'])
    .populate('agent', ['fullName', 'profilePic'])
    .sort({ start: 1 });
  res.status(200).json({
    success: true,
    message: 'Event fetched successfully',
    data: event,
  });
});

const updateMeetingStatus = asyncHandler(async (req, res) => {
  const eventId = req.params.eventid;
  const { status } = req.body;
  const updatedEvent = await Task.findByIdAndUpdate(
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
    message: 'Event updated successfully',
    data: updatedEvent,
  });
});

module.exports = {
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
};
