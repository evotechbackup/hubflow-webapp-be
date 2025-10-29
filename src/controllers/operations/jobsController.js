const Job = require('../../models/operations/Jobs');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Booking = require('../../models/sales/Booking');

const createJob = asyncHandler(async (req, res) => {
  const jobData = req.body;

  const job = new Job({ ...jobData, user: req.id });
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
      { mblNo: { $regex: search, $options: 'i' } },
      { vesselName: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
    ];
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: { createdAt: -1 },
    populate: [
      { path: 'customer', select: 'displayName' },
      { path: 'booking', select: 'id' },
    ],
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
    .populate('booking', 'id')
    .populate('items.vendor', 'displayName');

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  res.status(200).json({
    success: true,
    message: 'Job fetched successfully',
    data: job,
  });
});

module.exports = {
  createJob,
  getJobs,
  getJobById,
};
