const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Employee = require('../../models/hrm/Employee');
const EmployeeGroup = require('../../models/hrm/EmployeeGroup');
const EmployeeCamp = require('../../models/hrm/EmployeeCamp');
const EmployeeDepartment = require('../../models/hrm/EmployeeDepartment');
const EmployeeAuth = require('../../models/hrm/EmployeeAuth');
const User = require('../../models/auth/User');
const mongoose = require('mongoose');
// const { createActivityLog } = require("../../utilities/logUtils");

const createEmployee = asyncHandler(async (req, res) => {
  const employee = req.body;

  if (employee.department === '') employee.department = null;
  if (employee.camp === '') employee.camp = null;
  if (employee.employeeGroup === '') employee.employeeGroup = null;
  if (employee.currJobSite === '') employee.currJobSite = null;

  const employeeData = await Employee.create(employee);

  if (
    employeeData &&
    employeeData.employeeGroup &&
    employeeData.employeeGroup !== ''
  ) {
    const employeeGroup = await EmployeeGroup.findById(
      employeeData.employeeGroup
    );

    if (employeeGroup) {
      const divisionIndex = employeeGroup.division.findIndex(
        (div) => div?.name?.toString() === employeeData.division
      );

      if (divisionIndex !== -1) {
        employeeGroup.division[divisionIndex].employees.push(employeeData._id);
        await employeeGroup.save();
      }
    }
  }

  if (employeeData.camp) {
    const employeeCamp = await EmployeeCamp.findById(employeeData.camp);
    if (employeeCamp) {
      employeeCamp.employees.push(employeeData._id);
      await employeeCamp.save();
    }
  }

  if (employeeData.department) {
    const department = await EmployeeDepartment.findById(
      employeeData.department
    );
    if (department) {
      const roleIndex = department.roles.findIndex(
        (role) => role?.toString() === employeeData.role
      );
      if (roleIndex !== -1) {
        employeeData.roleCode = department.roleCodes[roleIndex];
        await employeeData.save();
      }
    }
  }

  if (employeeData.hasEmployeeAppAccess) {
    const employeeAuth = new EmployeeAuth({
      employee: employeeData._id,
      company: employeeData.company,
      organization: employeeData.organization,
      username: employeeData.username,
      password: employeeData.password,
    });
    await employeeAuth.save();
  }

  if (employeeData.hasPOSAppAccess) {
    const posEmployeeAuth = new EmployeeAuth({
      employee: employeeData._id,
      company: employeeData.company,
      username: employeeData.posUsername,
      organization: employeeData.organization,
      email: employeeData.email,
      password: employeeData.posPassword,
    });
    await posEmployeeAuth.save();
  }

  // Generate embedding for search and analytics
  try {
    await employeeData.generateEmbedding();
  } catch (error) {
    console.error('Error generating embedding for employee:', error);
  }

  res.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: employeeData,
  });
});

const employeeBySearch = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const pipeline = [
    {
      $match: {
        $and: [
          {
            $or: [
              { firstName: { $regex: search, $options: 'i' } },
              { lastName: { $regex: search, $options: 'i' } },
            ],
          },
          { organization: new mongoose.Types.ObjectId(req.params.orgid) },
          { isActivated: true },
        ],
      },
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        role: 1,
      },
    },
  ];

  const employees = await Employee.aggregate(pipeline);
  res.status(200).json({
    success: true,
    message: 'Employees fetched successfully',
    data: employees,
  });
});

const getAllEmployees = asyncHandler(async (req, res) => {
  const {
    search,
    filter_status,
    filter_dept,
    filter_role,
    filter_contract,
    filter_employeeGroup,
    filter_division,
    filter_employeeStatus,
    page = 1,
    limit = 100,
  } = req.query;

  const filter = { organization: req.params.orgid };
  if (filter_status !== undefined) {
    filter.isActivated = filter_status === 'true';
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { employeeId: searchRegex },
      { idNumber: searchRegex },
    ];
  }

  if (filter_dept) {
    filter.department = filter_dept;
  }

  if (filter_employeeGroup) {
    filter.employeeGroup = filter_employeeGroup;
  }

  if (filter_division) {
    filter.division = filter_division;
  }

  if (filter_role) {
    filter.role = filter_role;
  }

  if (filter_contract) {
    filter.contractType = filter_contract;
  }

  if (filter_employeeStatus) {
    filter.employeeStatus = filter_employeeStatus;
  }

  const employee = await Employee.paginate(filter, {
    page: parseInt(page),
    limit: parseInt(limit),
    select: [
      'firstName',
      'lastName',
      'employeeId',
      'email',
      'department',
      'designation',
      'role',
      'roleCode',
      'employmentType',
      'employeeGroup',
      'division',
      'camp',
      'currJobSite',
      'currJobStatus',
      'isActivated',
      'createdAt',
      'monthlyPay',
      'overtimePay',
      'hourlyPay',
      'idNumber',
      'maxLeaves',
      'invoiceRate',
      'dailyPay',
      'employeeStatus',
      'activeDate',
      'inactiveDate',
      'ctc',
      'projectHistory',
    ],
    sort: { createdAt: -1 },
    populate: [{ path: 'department', select: 'name' }],
    lean: true,
  });
  res.status(200).json({
    success: true,
    message: 'Employees fetched successfully',
    data: employee,
  });
});

const getEmployeeId = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employee = await Employee.findById(id)
    .populate('department')
    .populate('reportingManager', ['firstName', 'lastName']);
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  res.status(200).json({
    success: true,
    message: 'Employee retrieved successfully',
    data: employee,
  });
});

const getEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const agent = await User.findById(id);

  if (!agent) {
    throw new NotFoundError('User not found');
  }

  const employee = await Employee.findOne({
    $or: [
      { email: agent.email },
      { optionalUserId: agent.userid },
      { employeeId: agent.employeeId },
    ],
    organization: agent.organization,
  }).populate('department', 'name');

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  res.status(200).json({
    success: true,
    message: 'Employee retrieved successfully',
    data: employee,
  });
});

const getEmployeeByfilter = asyncHandler(async (req, res) => {
  const {
    search,
    filter_status,
    filter_dept,
    filter_role,
    filter_contract,
    filter_employeeGroup,
    filter_division,
    filter_employeeStatus,
  } = req.query;
  // const filter = {};
  const filter = { organization: req.params.orgid };
  if (filter_status !== undefined) {
    filter.isActivated = filter_status === 'true';
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    filter.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { employeeId: searchRegex },
      { idNumber: searchRegex },
    ];
  }

  if (filter_dept) {
    filter.department = filter_dept;
  }

  if (filter_employeeGroup) {
    filter.employeeGroup = filter_employeeGroup;
  }

  if (filter_division) {
    filter.division = filter_division;
  }

  if (filter_role) {
    filter.role = filter_role;
  }

  if (filter_contract) {
    filter.contractType = filter_contract;
  }

  if (filter_employeeStatus) {
    filter.employeeStatus = filter_employeeStatus;
  }

  const employee = await Employee.find(filter)
    .select([
      'firstName',
      'lastName',
      'employeeId',
      'email',
      'department',
      'designation',
      'role',
      'roleCode',
      'employmentType',
      'employeeGroup',
      'division',
      'camp',
      'currJobSite',
      'currJobStatus',
      'isActivated',
      'createdAt',
      'monthlyPay',
      'overtimePay',
      'hourlyPay',
      'idNumber',
      'maxLeaves',
      'invoiceRate',
      'dailyPay',
      'employeeStatus',
      'activeDate',
      'inactiveDate',
      'ctc',
      'dateOfJoining',
    ])
    .sort({ createdAt: -1 })
    .populate('department', 'name')
    .lean();
  res.status(200).json({
    success: true,
    message: 'Employees fetched successfully',
    data: employee,
  });
});

const getEmployeeForExport = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const filter = {
    organization: orgid,
    isActivated: true,
  };

  const employees = await Employee.find(filter)
    .select(
      'firstName lastName employeeId email department role contractType idNumber nationality passportNumber dateOfJoining dateOfBirth workPhoneNo personalMobile createdAt'
    )
    .populate('department', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const formattedCustomers = employees.map((employee) => ({
    'Employee ID': employee.employeeId || '',
    Name: employee.firstName + employee.lastName || '',
    Department: employee.department?.name || '',
    Role: employee.role || '',
    Contract: employee.contractType || '',
    'National ID': employee.idNumber || '',
    Email: employee.email || '',
    Phone: employee.workPhoneNo || employee.personalMobile || '',
    DOJ: employee.dateOfJoining
      ? new Date(employee.dateOfJoining).toLocaleDateString()
      : '',
    DOB: employee.dateOfBirth
      ? new Date(employee.dateOfBirth).toLocaleDateString()
      : '',
    Nationality: employee.nationality || '',
    Passport: employee.passportNumber || '',
  }));
  res.status(200).json({
    success: true,
    message: 'Employees fetched successfully',
    data: formattedCustomers,
  });
});

const updateEmployee = asyncHandler(async (req, res) => {
  const employee = req.body;

  ['department', 'camp', 'employeeGroup', 'currJobSite'].forEach((field) => {
    if (employee[field] === '') employee[field] = null;
  });

  const updatedEmployee = await Employee.findByIdAndUpdate(
    req.params.id,
    employee
  );
  if (!updatedEmployee) {
    throw new NotFoundError('Employee not found');
  }

  if (
    updatedEmployee.employeeGroup &&
    updatedEmployee.employeeGroup?.toString() !== ''
  ) {
    const previousGroup = await EmployeeGroup.findById(
      updatedEmployee.employeeGroup
    );
    if (previousGroup) {
      const previousDivisionIndex = previousGroup.division.findIndex((div) =>
        div.employees.includes(updatedEmployee._id)
      );
      if (previousDivisionIndex !== -1) {
        previousGroup.division[previousDivisionIndex].employees =
          previousGroup.division[previousDivisionIndex].employees.filter(
            (empId) => empId.toString() !== updatedEmployee._id.toString()
          );
        await previousGroup.save();
      }
    }
  }

  if (updatedEmployee.camp) {
    const employeeCamp = await EmployeeCamp.findById(updatedEmployee.camp);
    if (employeeCamp) {
      employeeCamp.employees = employeeCamp.employees.filter(
        (empId) => empId.toString() !== updatedEmployee._id.toString()
      );
      await employeeCamp.save();
    }
  }

  if (req.body.employeeGroup && req.body.division) {
    const employeeGroup = await EmployeeGroup.findById(req.body.employeeGroup);
    if (employeeGroup) {
      const divisionIndex = employeeGroup.division.findIndex(
        (div) => div?.name?.toString() === req.body.division
      );
      if (divisionIndex !== -1) {
        employeeGroup.division[divisionIndex].employees.push(
          updatedEmployee._id
        );
        await employeeGroup.save();
      }
    }
  }

  if (req.body.camp) {
    const employeeCamp = await EmployeeCamp.findById(req.body.camp);
    if (employeeCamp) {
      employeeCamp.employees.push(updatedEmployee._id);
      await employeeCamp.save();
    }
  }

  if (req.body.department) {
    const department = await EmployeeDepartment.findById(req.body.department);
    if (department) {
      const roleIndex = department.roles.findIndex(
        (role) => role?.toString() === req.body.role
      );
      if (roleIndex !== -1) {
        updatedEmployee.roleCode = department.roleCodes[roleIndex];
      }
    }
  }

  if (
    req.body.hasEmployeeAppAccess &&
    req.body.hasEmployeeAppAccess !== updatedEmployee.hasEmployeeAppAccess
  ) {
    if (req.body.hasEmployeeAppAccess) {
      const employeeAuth = await EmployeeAuth.findOne({
        employee: updatedEmployee._id,
      });
      if (employeeAuth) {
        employeeAuth.deactivated = false;
        await employeeAuth.save();
      } else {
        const employeeAuth = new EmployeeAuth({
          employee: updatedEmployee._id,
          company: updatedEmployee.company,
          organization: updatedEmployee.organization,
          username: employee.username,
          password: employee.password,
        });
        await employeeAuth.save();
      }
    } else {
      await EmployeeAuth.findOneAndUpdate(
        { employee: updatedEmployee._id },
        { deactivated: true }
      );
    }
  }

  if (
    req.body.hasPOSAppAccess &&
    req.body.hasPOSAppAccess !== updatedEmployee.hasPOSAppAccess
  ) {
    if (req.body.hasPOSAppAccess) {
      const posEmployeeAuth = await EmployeeAuth.findOne({
        employee: updatedEmployee._id,
      });
      if (posEmployeeAuth) {
        posEmployeeAuth.deactivated = false;
        await posEmployeeAuth.save();
      } else {
        const posEmployeeAuth = new EmployeeAuth({
          employee: updatedEmployee._id,
          company: updatedEmployee.company,
          organization: updatedEmployee.organization,
          username: employee.posUsername,
          password: employee.posPassword,
        });
        await posEmployeeAuth.save();
      }
    } else {
      await EmployeeAuth.findOneAndUpdate(
        { employee: updatedEmployee._id },
        { deactivated: true }
      );
    }
  }

  const finalEmployee = await Employee.findById(req.params.id);

  try {
    await finalEmployee.generateEmbedding();
  } catch (error) {
    console.error('Error generating embedding for employee:', error);
  }

  res.status(200).json({
    success: true,
    message: 'Employee updated successfully',
    data: updatedEmployee,
  });
});

const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employee = await Employee.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
    },
    { new: true }
  );

  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  res.status(200).json({
    success: true,
    message: 'Employee deleted successfully',
    data: employee,
  });
});

const deleteFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentId } = req.params;

  const employee = await Employee.findById(id);
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }
  const documentIndex = employee.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError('Files not found for the lead');
  }

  employee.files.splice(documentIndex, 1);

  await employee.save();
  res.status(200).json({
    success: true,
    message: 'Files deleted successfully',
    data: employee,
  });
});

const updateFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentId } = req.params;

  const { name, notify, expiryDate, reminderDate } = req.body;

  const employee = await Employee.findById(id);
  if (!employee) {
    throw new NotFoundError('Employee not found');
  }

  const documentIndex = employee.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError('Files not found for the lead');
  }

  employee.files[documentIndex].name = name;
  employee.files[documentIndex].notify = notify;
  employee.files[documentIndex].expiryDate = expiryDate;
  employee.files[documentIndex].reminderDate = reminderDate;

  await employee.save();
  res.status(200).json({
    success: true,
    message: 'Files upadted successfully',
    data: employee,
  });
});

const getFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existingEmployee = await Employee.findById(id);
  const documents = existingEmployee.files;
  res.status(200).json({
    success: true,
    message: 'Files fetched successfully',
    data: documents,
  });
});

const changeBulkEmployeeStatus = asyncHandler(async (req, res) => {
  const { employeeIds, status, date } = req.body;

  const updateObj = {
    employeeStatus: status,
    ...(status === 'inactive' && { inactiveDate: date }),
    ...(status === 'active' && { activeDate: date }),
  };

  const updatedEmployees = await Employee.updateMany(
    { _id: { $in: employeeIds } },
    { $set: updateObj }
  );

  res.status(200).json({
    success: true,
    message: 'Employees updated successfully',
    data: updatedEmployees,
  });
});

const employeeByemail = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const employee = await Employee.findOne({ email });
  res.status(200).json({
    success: true,
    message: 'Employee fetched successfully',
    data: employee,
  });
});

const totalEmployee = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const totalEmployee = await Employee.countDocuments({
    organization: orgid,
    isActivated: true,
  });
  const totalEmployeeInactive = await Employee.countDocuments({
    organization: orgid,
    isActivated: true,
    employeeStatus: 'active',
  });
  res
    .status(200)
    .json({ success: true, data: { totalEmployee, totalEmployeeInactive } });
});

const getAllEmployee = asyncHandler(async (req, res) => {
  try {
    const { orgid } = req.params;
    const employees = await Employee.find({
      organization: orgid,
      isActivated: true,
    })
      .select('firstName lastName employeeId')
      .sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = {
  createEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  getEmployee,
  deleteFiles,
  updateFiles,
  getFiles,
  getEmployeeForExport,
  getEmployeeByfilter,
  employeeBySearch,
  getEmployeeId,
  changeBulkEmployeeStatus,
  employeeByemail,
  totalEmployee,
  getAllEmployee,
};
