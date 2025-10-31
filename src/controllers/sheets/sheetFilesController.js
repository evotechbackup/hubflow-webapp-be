const Sheet = require('../../models/sheets/Sheet');
const ExcelFile = require('../../models/sheets/ExcelFile');
const { asyncHandler } = require('../../middleware/errorHandler');

const createFile = asyncHandler(async (req, res) => {
  const { name, fileSize, company, folder, organization, createdBy, agentids } =
    req.body;
  const newFile = new ExcelFile({
    name,
    fileSize,
    agents: agentids || [],
    company,
    folder,
    organization,
    createdBy,
    lastOpenedAt: new Date(),
  });

  await newFile.save();
  res.status(200).json({
    success: true,
    message: 'Agents retrieved successfully',
    data: {
      fileId: newFile._id,
      filename: newFile.name,
    },
  });
});

const createSheet = asyncHandler(async (req, res) => {
  const { name, index, order, status, row, column, celldata, config, file } =
    req.body;
  if (!name || !file) {
    throw new Error('Sheet name and file ID are required');
  }
  const newSheet = new Sheet({
    name,
    index,
    order,
    status,
    row,
    column,
    celldata,
    config,
    file,
  });
  await newSheet.save();

  res.status(201).json({
    success: true,
    message: 'Sheet created successfully',
    data: {
      sheet: newSheet,
    },
  });
});

const updateSheet = asyncHandler(async (req, res) => {
  const { id, sheet } = req.body;
  const updatedSheet = await Sheet.findByIdAndUpdate(id, sheet, {
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

const updateFile = asyncHandler(async (req, res) => {
  const { id, file } = req.body;
  const updateFile = await ExcelFile.findByIdAndUpdate(id, file, {
    new: true,
    runValidators: true,
  });

  if (!updateFile) {
    throw new Error('Sheet not found');
  }

  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: {
      file: updateFile,
    },
  });
});

const getFilesheets = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = await ExcelFile.findById(id);

  const sheets = await Sheet.find({ file: file._id });

  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: {
      file,
      sheets,
    },
  });
});

const getFiles = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { search, agentid, page = 1, limit = 20 } = req.query;

  const query = {
    organization: orgid,
    isDeleted: false,
    isArchived: false,
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

  const files = await ExcelFile.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('agents', ['fullName', 'profilePic'])
    .populate('folder', ['name'])
    .populate('createdBy', ['fullName']);

  const total = await ExcelFile.countDocuments(query);

  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: {
      files,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

const getFilesByfolder = asyncHandler(async (req, res) => {
  const { folderid } = req.params;
  const { search, agentid, page = 1, limit = 20 } = req.query;

  const query = {
    folder: folderid,
    isDeleted: false,
    isArchived: false,
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

  const files = await ExcelFile.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('agents', ['fullName', 'profilePic'])
    .populate('createdBy', ['fullName']);

  const total = await ExcelFile.countDocuments(query);

  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: {
      files,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

const getArchiveFile = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { search, agentid, page = 1, limit = 20 } = req.query;

  const query = {
    organization: orgid,
    isDeleted: false,
    isArchived: true,
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

  const files = await ExcelFile.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('agents', ['fullName', 'profilePic'])
    .populate('createdBy', ['fullName']);

  const total = await ExcelFile.countDocuments(query);

  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: {
      files,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

const getTrashFile = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { search, agentid, page = 1, limit = 20 } = req.query;

  const query = {
    organization: orgid,
    isDeleted: true,
    isArchived: false,
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

  const files = await ExcelFile.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('agents', ['fullName', 'profilePic'])
    .populate('createdBy', ['fullName']);

  const total = await ExcelFile.countDocuments(query);

  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: {
      files,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    },
  });
});

const getFileById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = await ExcelFile.findById(id);
  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: files,
  });
});

const getFileByfolder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = await ExcelFile.find({ folder: id });
  res.status(200).json({
    success: true,
    message: 'Sheet updated successfully',
    data: files,
  });
});

module.exports = {
  createFile,
  createSheet,
  updateFile,
  getFilesheets,
  getFileById,
  getFileByfolder,
  getFiles,
  getFilesByfolder,
  getArchiveFile,
  getTrashFile,
  updateSheet,
};
