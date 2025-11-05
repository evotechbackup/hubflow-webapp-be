const mongoose = require('mongoose');
const CRMProjects = require('../../models/crm/CRMProjects');
const { asyncHandler } = require('../../middleware/errorHandler');

const createCrmProject = asyncHandler(async (req, res) => {
  const { project, company, organization } = req.body;

  const newCRMProjects = await CRMProjects.findOneAndUpdate(
    { company, organization },
    {
      $set: {
        project,
        company,
        organization,
      },
    },
    { upsert: true, new: true }
  );
  res.status(201).json({
    success: true,
    message: 'created project successfully ',
    data: newCRMProjects,
  });
});

const getallProjects = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const crmProjects = await CRMProjects.aggregate([
    {
      $match: { organization: new mongoose.Types.ObjectId(orgid) },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'project',
        pipeline: [
          {
            $project: {
              _id: 1,
              target: 1,
              projectName: 1,
              projectIcon: 1,
              startDate: 1,
              acknowledgedAte: 1,
              progress: 1,
              budgetAmount: 1,
            },
          },
          {
            $lookup: {
              from: 'targets',
              localField: 'target',
              foreignField: '_id',
              as: 'target',
              pipeline: [
                {
                  $project: {
                    targetBudget: 1,
                  },
                },
              ],
            },
          },
          {
            $project: {
              _id: 1,
              projectName: 1,
              projectIcon: 1,
              startDate: 1,
              acknowledgedAte: 1,
              progress: 1,
              budgetAmount: 1,
              totalBudgetOfTargets: {
                $sum: '$target.targetBudget',
              },
            },
          },
        ],
      },
    },
    {
      $project: {
        project: 1,
      },
    },
  ]);
  res.status(200).json({
    success: true,
    message: 'retried successfully',
    data: crmProjects?.length > 0 ? crmProjects[0]?.project : [],
  });
});

const addProject = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { project } = req.body;

  const crmProjects = await CRMProjects.findOne({
    organization: orgid,
  });

  // check if project already exists
  if (crmProjects?.project?.includes(project)) {
    throw new Error('Project already exists');
  }

  crmProjects.project.push(project);
  await crmProjects.save();

  res.status(200).json({
    success: true,
    message: 'project added successfully',
    data: crmProjects,
  });
});

module.exports = {
  createCrmProject,
  getallProjects,
  addProject,
};
