const CRMProperties = require('../../models/crm/CRMProperties');
const Developer = require('../../models/crm/Developer');
const User = require('../../models/auth/User');
const mongoose = require('mongoose');
const { asyncHandler } = require('../../middleware/errorHandler');

const createProperties = asyncHandler(async (req, res) => {
  const {
    name,
    thumbnail,
    media,
    units,
    startingPrice,
    descriptor,
    description,
    email,
    phone,
    address,
    lat,
    lng,
    projectType,
    area,
    status,
    handOver,
    amenities,
    developer,
    company,
    organization,
    agent,
  } = req.body;

  // Create a new property
  const newProperty = new CRMProperties({
    name,
    thumbnail,
    media,
    units,
    startingPrice,
    descriptor,
    description,
    email,
    phone,
    address,
    lat,
    lng,
    projectType,
    area,
    status,
    handOver,
    amenities,
    developer,
    company,
    organization,
    agent,
  });

  const savedProperty = await newProperty.save();
  await Developer.findByIdAndUpdate(
    { _id: developer },
    { $push: { properties: savedProperty._id } }
  );

  await User.findByIdAndUpdate(
    { _id: agent },
    { $push: { properties: savedProperty._id } }
  );

  res.status(201).json({
    success: true,
    message: 'property created successfully',
    data: savedProperty,
  });
});

const addAgentToProperty = asyncHandler(async (req, res) => {
  const { propertyId, agentIds } = req.body;

  const property = await CRMProperties.findById(propertyId);

  if (!property) {
    throw new Error('Property not found');
  }

  // get agentsids which are not in the agentIds array
  const pastAgents = property.agent.filter(
    (agent) => !agentIds.includes(agent)
  );

  // remove property from pastAgents
  const updatedPastAgents = await User.updateMany(
    { _id: { $in: pastAgents }, profileType: { $ne: 'superadmin' } },
    { $pull: { properties: propertyId } }
  );

  if (!updatedPastAgents.modifiedCount) {
    console.log('No agents updated');
  }

  // Add agents to property and property to agents
  const updatedAgents = await User.updateMany(
    { _id: { $in: agentIds } },
    { $addToSet: { properties: propertyId } }
  );

  const updatedProperty = await CRMProperties.findOneAndUpdate(
    { _id: propertyId },
    {
      $set: {
        agent: agentIds,
      },
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: '',
    data: {
      property: updatedProperty,
      agentsUpdated: updatedAgents.modifiedCount,
    },
  });
});

const updateProperty = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;
  const {
    name,
    address,
    thumbnail,
    startingPrice,
    lat,
    lng,
    projectType,
    area,
    status,
    handOver,
    media,
  } = req.body;

  // Update the Property by ID
  const updatedProperty = await CRMProperties.findByIdAndUpdate(
    propertyId,
    {
      $set: {
        name,
        thumbnail,
        startingPrice,
        address,
        lat,
        lng,
        projectType,
        area,
        status,
        handOver,
        media,
      },
    },
    { new: true }
  );

  if (!updatedProperty) {
    throw new Error('Property not found');
  }

  res.status(200).json({
    success: true,
    message: '',
    data: updatedProperty,
  });
});

const getAllProperties = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { filter_projecttype, filter_developer, search } = req.query;

  const query = {
    organization: orgid,
    isDeleted: false,
  };

  if (
    filter_developer &&
    filter_developer !== '' &&
    mongoose.Types.ObjectId.isValid(filter_developer)
  ) {
    query.developer = filter_developer;
  } else if (
    filter_projecttype &&
    filter_projecttype !== '' &&
    ['primary', 'secondary'].includes(filter_projecttype)
  ) {
    query.projectType = filter_projecttype;
  }

  if (search && search !== '') {
    query.name = { $regex: search, $options: 'i' };
  }

  const properties = await CRMProperties.find(query);

  res.status(200).json({
    success: true,
    message: '',
    data: properties,
  });
});

const getPropertiesByAgent = asyncHandler(async (req, res) => {
  const { agentId } = req.params;
  const { filter_projecttype, search } = req.query;

  const query = {
    agent: agentId,
    isDeleted: false,
  };

  if (
    filter_projecttype &&
    filter_projecttype !== '' &&
    ['primary', 'secondary'].includes(filter_projecttype)
  ) {
    query.projectType = filter_projecttype;
  }

  if (search && search !== '') {
    query.name = { $regex: search, $options: 'i' };
  }

  const properties = await CRMProperties.find(query);

  res.status(200).json({
    success: true,
    message: '',
    data: properties,
  });
});

const getPropertyById = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;
  const property = await CRMProperties.findById(propertyId).populate(
    'developer',
    'name'
  );
  res.status(200).json({
    success: true,
    message: 'property retrived successfully',
    data: property,
  });
});

const getPropertiesByDeveloper = asyncHandler(async (req, res) => {
  const { developerId } = req.params;
  const properties = await CRMProperties.find({ developer: developerId });
  res.status(200).json({
    success: true,
    message: 'properties retrived successfully',
    data: properties,
  });
});

const getAgentByPropertyId = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;
  const property = await CRMProperties.findById(propertyId).populate('agent', [
    'fullName',
    'email',
    'phone',
    'profilePic',
    'profileType',
    'employeeId',
  ]);
  res.status(200).json({
    success: true,
    message: 'property retrived successfully',
    data: property?.agent || [],
  });
});

const deleteProperty = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;

  const deletedProperty = await CRMProperties.findByIdAndUpdate(
    propertyId,
    { $set: { isDeleted: true } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'property deleted successfully',
    data: deletedProperty,
  });
});

module.exports = {
  createProperties,
  addAgentToProperty,
  updateProperty,
  getAllProperties,
  getPropertiesByAgent,
  getPropertyById,
  getPropertiesByDeveloper,
  getAgentByPropertyId,
  deleteProperty,
};
