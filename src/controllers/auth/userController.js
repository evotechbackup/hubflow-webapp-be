/**
 * User Management Controller
 * Handles user management operations
 */

const bcryptjs = require('bcryptjs');
const { asyncHandler } = require('../../middleware/errorHandler');
const Company = require('../../models/auth/Company');
const User = require('../../models/auth/User');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const createUser = asyncHandler(async (req, res) => {
  const {
    email,
    fullName,
    role,
    password,
    hierarchy,
    company,
    organization,
    userName,
  } = req.body;
  const newUser = new User({
    email,
    password,
    fullName,
    userName,
    role,
    hierarchy: hierarchy || 4,
    company,
    organization,
  });

  const savedUser = await newUser.save();
  res.status(201).json(savedUser);
});

/**
 * Get all users (admin only)
 * @route GET /api/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, items_per_page = 10, search } = req.query;
    const { orgid, departmentid } = req.params;

    const skip = (page - 1) * items_per_page;

    // Build search query
    const query = {
      deactivated: false,
      $and: [{ department: departmentid }, { organization: orgid }],
    };
    if (search) {
      query.fullName = { $regex: new RegExp(search, 'i') };
    }

    // Get users with pagination
    const users = await User.find(query)
      .skip(skip)
      .limit(parseInt(items_per_page))
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        data: users,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

const searchUsers = asyncHandler(async (req, res) => {
  try {
    const searchQuery = req.query.search;

    const query = {
      organization: req.params.orgid,
      deactivated: false,
      profileType: { $nin: ['admin', 'superadmin'] },
    };

    if (searchQuery && searchQuery !== 'null' && searchQuery !== '') {
      query.$or = [
        { userName: { $regex: searchQuery, $options: 'i' } },
        { fullName: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    const users = await User.find(query);

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const searchUser = asyncHandler(async (req, res) => {
  try {
    const searchQuery = req.query.search;

    const users = await User.find({
      $or: [
        { userName: { $regex: searchQuery, $options: 'i' } },
        { fullName: { $regex: searchQuery, $options: 'i' } },
      ],
    });

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const deactivateUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  // Find the Agent by ID
  const user = await User.findById(userId);

  // If the agent is not found
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Set deactivated to false
  user.deactivated = true;

  // Save the updated Agent
  await user.save();

  // Respond with the updated Agent
  res.json({
    success: true,
    message: 'User deactivated successfully',
    data: 'deactivated',
  });
});

const activateUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  try {
    // Find the Agent by ID
    const user = await User.findById(userId);

    // If the agent is not found
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const company = await Company.findById(user.company);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const totalActiveUsers = await User.countDocuments({
      company: company._id,
      deactivated: false,
    });

    if (
      company.subscriptionPlan !== 'free' &&
      totalActiveUsers >= Number(company.allowedUsers)
    ) {
      throw new ValidationError('You have reached the maximum number of users');
    }

    // Set deactivated to false
    user.deactivated = false;

    // Save the updated Agent
    await user.save();

    // Respond with the updated Agent
    res.json({
      success: true,
      message: 'User activated successfully',
      data: 'activated',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  try {
    const updateFields = {
      email: req.body.email,
      userName: req.body.userName,
      fullName: req.body.fullName,
      phone: req.body.phone,
      profilePic: req.body.profilePic,
      signature: req.body.signature,
      emirateId: req.body.emirateId,
      userid: req.body.userid,
      profileType: req.body.role,
      twoFactor: req.body.twoFactor,
      hierarchy: req.body.hierarchy,
      employeeId: req.body.employeeId,
    };

    if (req.body.password) {
      updateFields.password = await bcryptjs.hash(req.body.password, 12);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

const updateUserHierarchy = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  try {
    const updateFields = {
      email: req.body.email,
      userName: req.body.userName,
      fullName: req.body.fullName,
      phone: req.body.phone,
      profilePic: req.body.profilePic,
      signature: req.body.signature,
      emirateid: req.body.emirateid,
      userid: req.body.userid,
      profileType: req.body.role,
      twoFactor: req.body.twoFactor,
      hierarchy: req.body.hierarchy,
      employeeId: req.body.employeeId,
    };

    if (req.body.password) {
      updateFields.password = await bcryptjs.hash(req.body.password, 12);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    );
    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// const updateUserEmailCredentials = asyncHandler(async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       organizationId,
//       emailAccount,
//       authMethod,
//       imap,
//       smtp,
//       oauth2,
//       encryptionKeyId,
//     } = req.body;
//     const emailCredentials = await EmailCredentials.findOne({ user: id });
//     if (!emailCredentials) {
//       const newEmailCredential = new EmailCredentials({
//         user: id,
//         organizationId,
//         emailAccount,
//         authMethod,
//         imap,
//         smtp,
//         oauth2,
//         encryptionKeyId,
//       });
//       await newEmailCredential.save();
//       return res.json(newEmailCredential);
//     }
//     emailCredentials.organizationId = organizationId;
//     emailCredentials.emailAccount = emailAccount;
//     emailCredentials.authMethod = authMethod;
//     emailCredentials.imap = imap;
//     emailCredentials.smtp = smtp;
//     emailCredentials.oauth2 = oauth2;
//     emailCredentials.encryptionKeyId = encryptionKeyId;
//     await emailCredentials.save();
//     res.json(emailCredentials);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

const getActiveUsersByDepartment = asyncHandler(async (req, res) => {
  const { search, filter_role, filter_deactivated = false } = req.query;

  // Building the query object based on the parameters
  const query = {
    deactivated: false,
    department: req.params.departmentid,
    organization: req.params.orgid,
  };

  if (search) {
    query.fullName = { $regex: new RegExp(search, 'i') };
  }
  if (filter_role) {
    query.profileType = filter_role;
  }
  if (filter_deactivated) {
    query.deactivated = filter_deactivated;
  }

  // Using the skip and limit options for pagination
  const users = await User.find(query);

  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    data: users,
  });
});

const addUser = asyncHandler(async (req, res) => {
  try {
    const {
      email,
      fullName,
      role,
      password,
      emirateid,
      phone,
      userid,
      hierarchy,
      userName,
      employeeId,
    } = req.body;
    const { companyid, orgid, departmentid } = req.params;

    const company = await Company.findById(companyid);

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const users = await User.countDocuments({
      company: companyid,
      deactivated: false,
    });

    if (
      company.subscriptionPlan !== 'free' &&
      users >= Number(company.allowedUsers)
    ) {
      throw new ValidationError('You have reached the maximum number of users');
    }

    const newUser = new User({
      email,
      password,
      fullName,
      userName,
      profileType: role,
      emirateid,
      phone,
      userid,
      company: companyid,
      department: departmentid,
      organization: orgid,
      hierarchy: hierarchy || 4,
      employeeId,
    });

    const savedUser = await newUser.save();
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: savedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

const getAgentsByOrgId = asyncHandler(async (req, res) => {
  try {
    const { orgid } = req.params;

    // Building the query object based on the parameters
    const query = {
      deactivated: false,
      organization: orgid,
    };

    const users = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: users,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ Error: 'An error occurred while fetching the Agent data' });
  }
});

const getUserByEmail = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const user = await User.findOne({ email });

  if (user) {
    throw new ValidationError('User already exists');
  }

  res.status(200).json({
    success: true,
    message: 'User fetched successfully',
    data: user,
  });
});

const getUserByUserId = asyncHandler(async (req, res) => {
  const { userid } = req.params;
  const user = await User.findOne({ userid });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.status(200).json({
    success: true,
    message: 'User fetched successfully',
    data: user,
  });
});

const getAgentsByOrgIdAndDepartment = asyncHandler(async (req, res) => {
  try {
    // Extracting query parameters
    const { orgid, departmentid } = req.params;

    // Building the query object based on the parameters
    const query = {
      $and: [{ department: departmentid }, { organization: orgid }],
    };

    // Using the skip and limit options for pagination
    const agents = await User.find(query);

    res.status(200).json({
      success: true,
      message: 'Users fetched successfully',
      data: agents,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ Error: 'An error occurred while fetching the Agent data' });
  }
});

const getSuperAdminByCompany = asyncHandler(async (req, res) => {
  const { companyid } = req.params;

  const agents = await User.find({
    company: companyid,
    profileType: 'superadmin',
  });

  if (!agents) {
    throw new NotFoundError('No superadmin found');
  }

  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    data: agents,
  });
});

const getActives = asyncHandler(async (req, res) => {
  const users = await User.find({ deactivated: false });

  res.status(200).json({
    success: true,
    message: 'Users fetched successfully',
    data: users,
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;

    const existingUser = await User.findByIdAndDelete(userId);

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = {
  createUser,
  getUsers,
  getUserById,
  searchUsers,
  searchUser,
  deactivateUser,
  activateUser,
  updateUser,
  updateUserHierarchy,
  getActiveUsersByDepartment,
  addUser,
  getAgentsByOrgId,
  getUserByEmail,
  getUserByUserId,
  getAgentsByOrgIdAndDepartment,
  getSuperAdminByCompany,
  getActives,
  deleteUser,
};
