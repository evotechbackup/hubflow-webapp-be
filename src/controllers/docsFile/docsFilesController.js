const Tab = require('../../models/docfile/Tab');
const DocsFile = require('../../models/docfile/DocsFile');
const { asyncHandler } = require('../../middleware/errorHandler');

const createFile = asyncHandler(async (req, res) => {
  const { name, fileSize, company, organization, createdBy, agentids, folder } =
    req.body;
  const newFile = new DocsFile({
    name,
    fileSize,
    agents: agentids || [],
    company,
    organization,
    createdBy,
    lastOpenedAt: new Date(),
    folder,
  });

  await newFile.save();

  res.status(201).json({
    success: true,
    message: 'Tabs created successfully',
    data: {
      status: true,
      fileId: newFile._id,
      filename: newFile.name,
    },
  });
});

const createTab = asyncHandler(async (req, res) => {
  const { title, file, content, createdBy } = req.body;
  if (!title || !file) {
    throw new Error('Sheet name and file ID are required');
  }
  const newSheet = new Tab({
    title,
    file,
    content,
    createdBy,
  });
  await newSheet.save();

  res.status(201).json({
    success: true,
    message: 'Tabs created successfully',
    data: {
      status: true,
      sheet: newSheet,
    },
  });
});

const updateTabs = asyncHandler(async (req, res) => {
  const { id, content, updatedBy, title } = req.body;
  if (!id) {
    throw new Error('id is required');
  }

  const update = {};
  if (typeof content === 'string') update.content = content;
  if (title) update.title = title;
  if (updatedBy) update.updatedBy = updatedBy;

  const updatedSheet = await Tab.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  );

  if (!updatedSheet) {
    throw new Error('Sheet not found');
  }

  res.status(201).json({
    success: true,
    message: 'Tabs created successfully',
    data: {
      sheet: updatedSheet,
    },
  });
});
const deleteTab = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    throw new Error('id is required');
  }
  await Tab.findByIdAndDelete(id);

  res.status(201).json({
    success: true,
    message: 'Tabs deleted successfully',
    data: {
      sheet: id,
    },
  });
});

const fileUpdate = asyncHandler(async (req, res) => {
  const { id, file } = req.body;
  const updateFile = await DocsFile.findByIdAndUpdate(
    id,
    {
      ...file,
      lastOpenedAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updateFile) {
    throw new Error('Sheet not found');
  }

  res.status(200).json({
    success: true,
    message: 'File updated successfully',
    data: {
      file: updateFile,
    },
  });
});

const docsTabs = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const file = await DocsFile.findById(id);

  let tabs = await Tab.find({ file: file._id });
  if (tabs.length === 0) {
    const newTab = await Tab.create({
      title: 'tab 1',
      file: file._id,
    });
    tabs = [newTab];
  }

  res.status(200).json({
    success: true,
    message: 'Tabs retrieved successfully',
    data: {
      file,
      tabs,
    },
  });
});

const getAllFiles = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { search, page = 1, limit = 20 } = req.query;

  const query = {
    organization: orgid,
    isDeleted: false,
    isArchived: false,
  };
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const files = await DocsFile.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('agents', ['fullName', 'profilePic'])
    .populate('folder', ['name'])
    .populate('createdBy', ['fullName']);

  const total = await DocsFile.countDocuments(query);

  res.status(200).json({
    success: true,
    message: 'Files retrieved successfully',
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

const getFilesByFolderId = asyncHandler(async (req, res) => {
  const { folderId } = req.params;
  const { search, page = 1, limit = 20 } = req.query;

  const query = {
    folder: folderId,
    isDeleted: false,
    isArchived: false,
  };
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const files = await DocsFile.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('agents', ['fullName', 'profilePic'])
    .populate('createdBy', ['fullName']);

  const total = await DocsFile.countDocuments(query);

  res.status(200).json({
    success: true,
    message: 'Files retrieved successfully',
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

const getArchiveFiles = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { search, page = 1, limit = 20 } = req.query;

  const query = {
    organization: orgid,
    isDeleted: false,
    isArchived: true,
  };
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const files = await DocsFile.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('agents', ['fullName', 'profilePic'])
    .populate('createdBy', ['fullName']);

  const total = await DocsFile.countDocuments(query);

  res.status(200).json({
    success: true,
    message: 'Files retrieved successfully',
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

const getTrashFiles = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { search, page = 1, limit = 20 } = req.query;

  const query = {
    organization: orgid,
    isDeleted: true,
    isArchived: false,
  };
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const files = await DocsFile.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('agents', ['fullName', 'profilePic'])
    .populate('createdBy', ['fullName']);

  const total = await DocsFile.countDocuments(query);

  res.status(200).json({
    success: true,
    message: 'Files retrieved successfully',
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
  const file = await DocsFile.findById(id);
  res.status(200).json({
    success: true,
    message: 'File retrieved successfully',
    data: file,
  });
});

module.exports = {
  createFile,
  createTab,
  updateTabs,
  deleteTab,
  fileUpdate,
  docsTabs,
  getAllFiles,
  getFilesByFolderId,
  getArchiveFiles,
  getTrashFiles,
  getFileById,
};
