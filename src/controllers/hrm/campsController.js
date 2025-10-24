const { asyncHandler } = require('../../middleware/errorHandler');
const Employee = require('../../models/hrm/Employee');
const EmployeeCamp = require('../../models/hrm/EmployeeCamp');

const createEmployeeCamp = asyncHandler(async (req, res) => {
  const { name, company, organization } = req.body;

  const newEmployeeCamp = new EmployeeCamp({
    name,
    company,
    organization,
  });

  await newEmployeeCamp.save();
  // await createActivityLog({
  //   userId: req._id,
  //   action: "create",
  //   type: "employeeCamp",
  //   actionId: newEmployeeCamp.name,
  //   organization,
  //   company,
  // });

  res.status(201).json({
    success: true,
    message: 'Employee Camp created successfully',
    data: newEmployeeCamp,
  });
});

const updateEmployeeCamp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  const updatedEmployeeCamp = await EmployeeCamp.findByIdAndUpdate(
    id,
    { name },
    { new: true }
  );

  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'update',
  //     type: 'employeeCamp',
  //     actionId: name,
  //     organization: updatedEmployeeCamp.organization,
  //     company: updatedEmployeeCamp.company,
  //   });

  res.status(201).json({
    success: true,
    message: 'Employee Camp updated successfully',
    data: updatedEmployeeCamp,
  });
});

const updateEmployeeCampEmployees = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { employees } = req.body;

  const employeeCamp = await EmployeeCamp.findByIdAndUpdate(
    id,
    { employees },
    { new: true }
  );

  await Employee.updateMany(
    { _id: { $in: employees } },
    { $set: { camp: id } }
  );

  // Generate embeddings for all updated employees
  const updatedEmployees = await Employee.find({ _id: { $in: employees } });
  for (const employee of updatedEmployees) {
    try {
      await employee.generateEmbedding();
    } catch (error) {
      console.error('Error generating embedding for employee:', error);
    }
  }

  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'update',
  //     type: 'employeeCamp',
  //     actionId: employeeCamp.name,
  //     organization: employeeCamp.organization,
  //     company: employeeCamp.company,
  //   });

  res.status(201).json({
    success: true,
    message: 'Employee Camp updated successfully',
    data: employeeCamp,
  });
});

const getEmployeeCamps = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const employeeCamps = await EmployeeCamp.find({
    organization: orgid,
  }).sort({
    createdAt: -1,
  });

  res.status(201).json({
    success: true,
    message: 'Employee Camp retrieved successfully',
    data: employeeCamps,
  });
});

const getEmployeeCampById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employeeCamp = await EmployeeCamp.findById(id).populate({
    path: 'employees',
    select:
      'firstName lastName department role employeeId contractType employeeStatus',
    populate: {
      path: 'department',
      select: 'name',
    },
  });

  res.status(201).json({
    success: true,
    message: 'Employee Camp retrieved successfully',
    data: employeeCamp,
  });
});

const getEmployeeCampsCount = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const totalCamps = await EmployeeCamp.countDocuments({
    organization: orgid,
  });
  res.status(201).json({
    success: true,
    message: 'Employee Camp count retrieved successfully',
    data: totalCamps,
  });
});

const deleteEmployeeCamp = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employeeCamp = await EmployeeCamp.findByIdAndDelete(id);

  res.status(201).json({
    success: true,
    message: 'Employee Camp deleted successfully',
    data: employeeCamp,
  });
});

module.exports = {
  createEmployeeCamp,
  updateEmployeeCamp,
  getEmployeeCamps,
  getEmployeeCampById,
  getEmployeeCampsCount,
  updateEmployeeCampEmployees,
  deleteEmployeeCamp,
};
