const Developer = require('../../models/crm/Developer');
const { asyncHandler } = require('../../middleware/errorHandler');

const createDeveloper = asyncHandler(async (req, res) => {
  const {
    name,
    thumbnail,
    address,
    phoneNo,
    email,
    description,
    company,
    organization,
  } = req.body;

  const newDeveloper = new Developer({
    name,
    thumbnail,
    address,
    phoneNo,
    email,
    description,
    company,
    organization,
  });

  const savedDeveloper = await newDeveloper.save();
  res.status(201).json({
    success: true,
    message: 'developer created successfully',
    data: savedDeveloper,
  });
});

const updatedDevloper = asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  const { name, thumbnail, address, phoneNo, email, properties } = req.body;

  // Update the Developer by ID
  const updatedDevloper = await Developer.findByIdAndUpdate(
    companyId,
    {
      $set: {
        name,
        thumbnail,
        address,
        phoneNo,
        email,
        properties,
      },
    },
    { new: true }
  );

  if (!updatedDevloper) {
    throw new Error('Developer not found');
  }

  res.status(200).json({
    success: true,
    message: 'developer updated successfully',
    data: updatedDevloper,
  });
});

const getDevelopers = asyncHandler(async (req, res) => {
  const developers = await Developer.find({ organization: req.params.orgid });

  if (!developers) {
    throw new Error('Developers not found');
  }

  res.status(200).json({
    success: true,
    message: 'developers fetched successfully',
    data: developers,
  });
});

const getdeveloperbyid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const developer = await Developer.findById(id).populate('properties', [
    'name',
    'thumbnail',
    'address',
  ]);
  res.status(200).json({
    success: true,
    message: 'developer fetched successfully',
    data: developer,
  });
});

const addNotes = asyncHandler(async (req, res) => {
  const newNote = {
    text: req.body.notes,
    date: new Date(),
  };

  const developer = await Developer.findByIdAndUpdate(
    { _id: req.params.id },
    { $push: { notes: newNote } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'developer notes updated successfully',
    data: developer,
  });
});

const deleteDeveloper = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const developer = await Developer.findById(id);

  if (!developer) {
    throw new Error('Developer not found');
  }

  if (developer.properties.length > 0) {
    throw new Error('Developer has properties');
  }

  await Developer.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'developer deleted successfully',
    data: true,
  });
});

module.exports = {
  createDeveloper,
  updatedDevloper,
  getDevelopers,
  getdeveloperbyid,
  addNotes,
  deleteDeveloper,
};
