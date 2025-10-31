const { asyncHandler } = require('../../middleware/errorHandler');
const DocsTamplate = require('../../models/docfile/DocsTamplate');
const TemplateFile = require('../../models/docfile/TemplateFile');

const createFile = asyncHandler(async (req, res) => {
  const { name, fileSize, company, organization, createdBy } = req.body;
  const newFile = new TemplateFile({
    name,
    fileSize,
    company,
    organization,
    createdBy,
    lastOpenedAt: new Date(),
  });

  await newFile.save();

  res.status(201).json({
    status: true,
    message: 'File created successfully',
    data: {
      fileId: newFile._id,
      filename: newFile.name,
    },
  });
});

const updateFile = asyncHandler(async (req, res) => {
  const { id, file } = req.body;
  const updateFile = await TemplateFile.findByIdAndUpdate(
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

  res.status(201).json({
    status: true,
    message: 'File updated successfully',
    data: {
      fileId: updateFile._id,
      filename: updateFile.name,
    },
  });
});

const createTemplate = asyncHandler(async (req, res) => {
  const { title, content, order, file } = req.body;
  const newTemplate = new DocsTamplate({
    title,
    file,
    content,
    order,
  });
  await newTemplate.save();
  if (content) {
    const match = content.match(/<div class="page">([\s\S]*?)<\/div>/);
    if (match) {
      const firstPageHtml = `<div class="page">${match[1]}</div>`;

      await TemplateFile.findByIdAndUpdate(file, {
        thumbnail: firstPageHtml,
      });
    }
  }

  res.status(201).json({
    status: true,
    message: 'Template created successfully',
  });
});

const getTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const template = await DocsTamplate.findById(id);
  if (!template) {
    throw new Error('Template not found');
  }
  res.status(200).json({
    status: true,
    message: 'Template retrieved successfully',
    data: template,
  });
});

const getAllTemplates = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const templates = await TemplateFile.find({ organization: orgid })
    .select('name _id thumbnail')
    .lean();

  const templatesIds = templates.map((t) => t._id);

  const templatesData = await DocsTamplate.find({
    file: { $in: templatesIds },
  })
    .select('_id title content file')
    .lean();

  const combined = templates.map((template) => {
    const docs = templatesData.filter(
      (doc) => doc.file.toString() === template._id.toString()
    );
    return { ...template, docs };
  });

  res.status(200).json({
    status: true,
    message: 'Templates retrieved successfully',
    data: combined,
  });
});

const updateTemplate = asyncHandler(async (req, res) => {
  const { id, title, content, order } = req.body;
  const updatedTemplate = await DocsTamplate.findByIdAndUpdate(
    id,
    { title, content, order },
    { new: true }
  );

  if (content) {
    const match = content.match(/<div class="page">([\s\S]*?)<\/div>/);
    if (match) {
      const firstPageHtml = `<div class="page">${match[1]}</div>`;

      await TemplateFile.findByIdAndUpdate(updatedTemplate.file, {
        thumbnail: firstPageHtml,
      });
    }
  }
  res.status(200).json({
    status: true,
    message: 'Template updated successfully',
    data: updatedTemplate,
  });
});

const deleteTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await DocsTamplate.findByIdAndDelete(id);
  res.status(200).json({
    status: true,
    message: 'Template deleted successfully',
  });
});

module.exports = {
  createTemplate,
  updateFile,
  getTemplate,
  getAllTemplates,
  updateTemplate,
  createFile,
  deleteTemplate,
};
