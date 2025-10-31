const ExcelFile = require('../../models/sheets/ExcelFile');
const SheetFolder = require('../../models/sheets/SheetFolder');
const User = require('../../models/auth/User');
const { asyncHandler } = require('../../middleware/errorHandler');

const createFolder = asyncHandler(async (req, res) => {
  const { name, slug, company, organization, agent, agents } = req.body;
  const newFile = new SheetFolder({
    name,
    slug,
    agent,
    company,
    organization,
    agents,
  });

  await newFile.save();

  res.status(201).json({
    success: true,
    message: 'Folder created successfully',
    data: {
      folderId: newFile._id,
      folderName: newFile.name,
    },
  });
});

const updateFolder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedSheet = await SheetFolder.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedSheet) {
    throw new Error('Sheet not found');
  }

  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: {
      sheet: updatedSheet,
    },
  });
});

const getFolderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const folder = await SheetFolder.findById(id).populate('agents');
  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: {
      folder,
    },
  });
});

const getAllFolders = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { search, agentid, page = 1, limit = 20 } = req.query;

  const query = {
    organization: orgid,
  };
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  if (
    agentid &&
    agentid !== '' &&
    agentid !== 'null' &&
    agentid !== 'undefined'
  ) {
    query.$or = [{ agents: agentid }, { createdBy: agentid }];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const folders = await SheetFolder.find(query)
    .populate('agents', 'profilePic fullName')
    .sort({ createdAt: -1 })
    .skip(skip);
  //   .limit(parseInt(limit));

  const total = await SheetFolder.countDocuments(query);

  res.status(200).json({
    success: true,
    message: 'Folders retrieved successfully',
    data: {
      folders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

const deleteFolder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const folder = await SheetFolder.findById(id);
  if (!folder) {
    throw new Error('Folder not found');
  }

  if (folder) {
    await ExcelFile.deleteMany({ folder: folder._id });
  }

  await SheetFolder.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Folder and its Excel files deleted successfully',
  });
});

const getFolderBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const folder = await SheetFolder.findOne({ slug }).select('_id');
  if (!folder) {
    throw new Error('Folder not found');
  }

  res.status(200).json({
    success: true,
    message: 'Folder retrieved successfully',
    data: folder,
  });
});

const existFolderByName = asyncHandler(async (req, res) => {
  const { name, orgid } = req.params;
  const files = await SheetFolder.findOne({
    name,
    organization: orgid,
  });
  if (files) {
    res.status(200).json({
      success: true,
      message: 'Folder successfully',
      data: true,
    });
  }
  res.status(200).json({
    success: true,
    message: 'Folder not found',
    data: false,
  });
});

const getAgentsByOrgId = asyncHandler(async (req, res) => {
  const { id, orgid } = req.params;

  const sheetFolder = await SheetFolder.findById(id);
  const sheetFolderIds = sheetFolder.agents;

  const query = {
    deactivated: false,
    organization: orgid,
    _id: { $in: sheetFolderIds },
  };

  const agents = await User.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: agents,
  });
});

module.exports = {
  createFolder,
  updateFolder,
  getFolderById,
  getAllFolders,
  deleteFolder,
  getFolderBySlug,
  existFolderByName,
  getAgentsByOrgId,
};
