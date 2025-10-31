const mongoose = require('mongoose');
// const { subscribeToTopicByAgentId } = require("../../controller/Notifier");
// const TaskNotification = require('../../models/notifications/TaskNotification');
const TaskGroup = require('../../models/task/TaskGroup');
const Task = require('../../models/task/Task');
const { asyncHandler } = require('../../middleware/errorHandler');
// const { NotFoundError } = require('../../utils/errors');

// GET /projects
const getAllTaskGroup = asyncHandler(async (req, res) => {
  const projects = await TaskGroup.find({
    organization: req.params.orgid,
  })
    .populate('createdBy', ['fullName'])
    .populate('agents', ['fullName', 'profilePic'])
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: 'Projects fetched successfully',
    data: projects,
  });
});

const getTaskGroupByAgentId = asyncHandler(async (req, res) => {
  const projects = await TaskGroup.find({
    $or: [{ agents: req.params.id }, { createdBy: req.params.id }],
  })
    .populate('createdBy', ['fullName'])
    .populate('agents', ['fullName', 'profilePic'])
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: 'Projects fetched successfully',
    data: projects,
  });
});

const getTaskGroupById = asyncHandler(async (req, res) => {
  const taskGroup = await TaskGroup.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.params.id),
      },
    },
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'taskGroup',
        as: 'tasks',
        pipeline: [
          {
            $sort: {
              due: 1,
              priority: 1,
            },
          },
          {
            $lookup: {
              from: 'agents',
              localField: 'agent',
              foreignField: '_id',
              as: 'assignee',
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    profilePic: 1,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        assignee: 1,
        tasks: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Projects fetched successfully',
    data: taskGroup?.[0] || null,
  });
});

const createTaskGroup = asyncHandler(async (req, res) => {
  const project = new TaskGroup({
    name: req.body.name,
    agents: req.body.agentids || [],
    createdBy: req.body.createdBy,
    company: req.body.company,
    organization: req.body.organization,
  });
  const savedProject = await project.save();
  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: savedProject,
  });
});

const updateTaskGroup = asyncHandler(async (req, res) => {
  const updatedProject = await TaskGroup.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        name: req.body.name,
        agents: req.body.agentids,
      },
    },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Project updated successfully',
    data: updatedProject,
  });
});

// DELETE /projects/:id
const deleteTaskGroup = asyncHandler(async (req, res) => {
  await TaskGroup.findByIdAndDelete(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Project deleted successfully',
  });
});

const updateTaskGroupStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { taskId } = req.params;

  const updatedTask = await Task.findOneAndUpdate(
    { _id: taskId },
    {
      status,
    },
    { new: true }
  );

  //   const agentId = await TaskGroup.findById(updatedTask.taskGroup).select(
  //     'createdBy'
  //   );

  // if (agentId.createdBy) {
  //   subscribeToTopicByAgentId(
  //     agentId.createdBy,
  //     'sprintchange',
  //     updatedTask._id
  //   );
  //   const noti = new TaskNotification({
  //     type: 'sprintchange',
  //     receiver: agentId.createdBy,
  //     sprintTask: updatedTask._id,
  //     date: new Date(),
  //   });
  //   await noti.save();
  // }
  res.status(201).json({
    success: true,
    message: 'Task updated successfully',
    data: updatedTask,
  });
});

const getAgentsByTaskGroupId = asyncHandler(async (req, res) => {
  const project = await TaskGroup.findById(req.params.id)
    .populate('agents')
    .select('agents');
  res.status(200).json({
    success: true,
    message: 'Agents fetched successfully',
    data: project.agents || [],
  });
});

const addTagsToTaskGroup = asyncHandler(async (req, res) => {
  const updatedTaskGroupWithTags = await TaskGroup.findByIdAndUpdate(
    req.params.id,
    { $push: { tags: req.body.tags } },
    { new: true }
  );
  res.status(201).json({
    success: true,
    message: 'Tags added successfully',
    data: updatedTaskGroupWithTags,
  });
});

const getTagsByTaskGroupId = asyncHandler(async (req, res) => {
  const taskGroup = await TaskGroup.findById(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Tags fetched successfully',
    data: taskGroup.tags,
  });
});

module.exports = {
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
};
