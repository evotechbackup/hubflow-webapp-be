const Storage = require('../../models/task/Storage');
// const User = require('../../models/auth/User');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const { UUID } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// const multer = require('multer');

const bucketname = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey,
  },
  region: bucketRegion,
});

const getAllStorage = asyncHandler(async (req, res) => {
  const { id, path } = req.query;
  const storageItem = await Storage.find({
    agent: id,
    path,
    organization: req.params.orgid,
  });
  if (!storageItem) {
    throw new NotFoundError('Storage item not found');
  }
  res.status(200).json({
    success: true,
    message: 'Storage item fetched successfully',
    data: storageItem,
  });
});

const createFolder = asyncHandler(async (req, res) => {
  try {
    if (req.body.type === 'file') {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: 'No file uploaded' });
      }

      const filename = new UUID() + req.body.name;
      const params = {
        Bucket: bucketname,
        Key: filename,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };

      const command = new PutObjectCommand(params);
      await s3.send(command);

      const newStorage = new Storage({
        name: req.body.name,
        type: 'file',
        path: req.body.path,
        agent: req.body.agent,
        filename,
        company: req.body.company,
        organization: req.body.organization,
        date: new Date(),
        notify: req.body.notify,
        expiryDate: req.body.expiryDate,
        reminderDate: req.body.reminderDate,
      });
      await newStorage.save();

      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: true,
      });
    }

    if (req.body.type === 'folder') {
      const newStorage = new Storage({
        name: req.body.name,
        type: 'folder',
        path: req.body.path,
        agent: req.body.agent,
        company: req.body.company,
        organization: req.body.organization,
      });
      await newStorage.save();

      return res.status(201).json({
        success: true,
        message: 'Folder created successfully',
        data: true,
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Invalid element type. Must be either "file" or "folder"',
    });
  } catch (error) {
    console.error('Error in createFolder:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request',
      details:
        process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

const renameFolder = asyncHandler(async (req, res) => {
  const { name, path } = req.body;
  await Storage.findOneAndUpdate(
    { path, agent: req._id },
    { name },
    { new: true }
  );

  res.status(201).json({
    success: true,
    message: 'Folder updated successfully',
    data: true,
  });
});

module.exports = {
  getAllStorage,
  createFolder,
  renameFolder,
};
