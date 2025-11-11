const Job = require('../../models/operations/Jobs');
const Shipment = require('../../models/operations/Shipment');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Booking = require('../../models/sales/Booking');

const createJob = asyncHandler(async (req, res) => {
  const jobData = req.body;

  const job = new Job({
    shipmentType: jobData.shipmentType,
    customer: jobData.customer,
    contactPerson: jobData.contactPerson,
    date: jobData.date,
    company: jobData.company,
    organization: jobData.organization,
    user: req.id,
  });

  const shipment = new Shipment({
    ...jobData,
    jobId: job._id,
    user: req.id,
  });

  await shipment.save();

  await job.save();

  await Booking.findByIdAndUpdate(job.booking, { jobCreated: true });

  res.status(201).json({
    success: true,
    message: 'Job created successfully',
    data: job,
  });
});

const getJobs = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { page = 1, limit = 10, search = '' } = req.query;

  const query = {
    organization: orgId,
    valid: true,
  };

  if (search) {
    query.$or = [
      { id: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
    ];
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [{ path: 'customer', select: 'displayName' }],
  };

  const jobs = await Job.paginate(query, options);

  res.status(200).json({
    success: true,
    message: 'Jobs fetched successfully',
    data: {
      jobs: jobs.docs,
      currentPage: jobs.page,
      totalPages: jobs.totalPages,
      totalJobs: jobs.totalDocs,
    },
  });
});

const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id)
    .populate('customer', 'displayName contactPersons')
    .populate('shipments', 'id');

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  res.status(200).json({
    success: true,
    message: 'Job fetched successfully',
    data: job,
  });
});

const getJobByIdWithShipments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id).populate(
    'shipments',
    'items invoiceCreated'
  );

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const shipments = job.shipments?.map((shipment) => {
    return {
      ...shipment,
      invoiceCreated: shipment.invoiceCreated,
    };
  });

  res.status(200).json({
    success: true,
    message: 'Job fetched successfully',
    data: shipments,
  });
});

const getJobsByCustomer = asyncHandler(async (req, res) => {
  const { customerId } = req.params;

  const jobs = await Job.find({
    customer: customerId,
    invoiceCreated: false,
    valid: true,
  })
    .select('id shipments')
    .populate('shipments', 'id invoiceCreated')
    .lean();

  const result = jobs?.map((job) => {
    return {
      ...job,
      shipments: job.shipments?.filter((shipment) => !shipment.invoiceCreated),
    };
  });

  res.status(200).json({
    success: true,
    message: 'Jobs fetched successfully',
    data: result,
  });
});

module.exports = {
  createJob,
  getJobs,
  getJobById,
  getJobByIdWithShipments,
  getJobsByCustomer,
};
