const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const RecruitmentResponse = require('../../models/recruit/RecruitmentResponse');
const RecruitmentForm = require('../../models/recruit/RecruitmentForm');
// const {
//   subscribeToTopicByAgentId,
//   sendInterviewScheduledEmailNotification,
//   sendInterviewScheduledEmailNotificationToAgent,
// } = require('../../controller/Notifier');
// const TaskNotification = require('../../models/TaskNotification');
// const User = require('../../models/auth/User');
const mongoose = require('mongoose');
const axios = require('axios');
const pdf = require('pdf-parse');

const PF = `https://hub-flow-assets.s3.me-central-1.amazonaws.com/`;

async function extractPdfText(buffer, maxPages = 1) {
  try {
    const data = await pdf(buffer, {
      max: maxPages,
    });

    return data.text || '';
  } catch (err) {
    console.error('PDF extraction error:', err);
    return '';
  }
}

const getRecruitmentResponses = asyncHandler(async (req, res) => {
  const recruitmentResponses = await RecruitmentResponse.find({
    organization: req.params.orgid,
  }).populate('form', ['roleName']);
  res.status(201).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: recruitmentResponses,
  });
});

const getRecruitmentResponsesWithCount = asyncHandler(async (req, res) => {
  const recruitmentForms = await RecruitmentResponse.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(req.params.orgid),
      },
    },
    {
      $project: {
        form: 1,
      },
    },
    {
      $group: {
        _id: '$form',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'recruitmentforms',
        localField: '_id',
        foreignField: '_id',
        as: 'form',
      },
    },
    {
      $unwind: '$form',
    },
    {
      $match: {
        'form.isActive': true,
      },
    },
    {
      $project: {
        _id: '$form._id',
        count: 1,
        roleName: '$form.roleName',
        createdAt: '$form.createdAt',
      },
    },
  ]);
  res.status(201).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: recruitmentForms,
  });
});

const createRecruitmentResponse = asyncHandler(async (req, res) => {
  const { form, email, fullName, answers, file, note, organization, company } =
    req.body;
  const recruitmentResponse = new RecruitmentResponse({
    form,
    email,
    fullName,
    answers,
    file,
    note,
    logs: [
      {
        status: 'applied',
        agent: null,
        date: new Date(),
      },
    ],
    organization,
    company,
  });
  const savedRecruitmentResponse = await recruitmentResponse.save();

  // await createActivityLog({
  //   userId: null,
  //   action: 'create',
  //   type: 'recruitmentResponse',
  //   actionId: '',
  //   organization: savedRecruitmentResponse.organization,
  //   company: savedRecruitmentResponse.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Recruitment response created successfully',
    data: savedRecruitmentResponse,
  });
});

const getResponseBySubmissionId = asyncHandler(async (req, res) => {
  const recruitmentResponse = await RecruitmentResponse.findById(req.params.id)
    .populate('form', ['roleName'])
    .populate('logs.agent', ['fullName']);
  res.status(201).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: recruitmentResponse,
  });
});

const getResponseSubmissionByFormId = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const { email, fullName, answers, file, note, organization, company, phone } =
    req.body;

  const existingReport = await RecruitmentForm.findById(formId);
  if (!existingReport) {
    throw new NotFoundError('Recruitment form not found');
  }

  const cvUrl = PF + file;
  console.log('cvUrl', cvUrl);

  const pdfResponse = await axios.get(cvUrl, { responseType: 'arraybuffer' });

  const cvText = await extractPdfText(pdfResponse.data, 2);

  console.log('cvText', cvText);

  const recruitmentResponse = new RecruitmentResponse({
    form: formId,
    email,
    fullName,
    phone: phone || '',
    answers,
    cvText,
    file,
    note,
    logs: [
      {
        status: 'applied',
        agent: null,
        date: new Date(),
      },
    ],
    organization,
    company,
  });

  const savedRecruitmentResponse = await recruitmentResponse.save();

  // await createActivityLog({
  //   userId: null,
  //   action: 'create',
  //   type: 'recruitmentResponse',
  //   actionId: '',
  //   organization: savedRecruitmentResponse.organization,
  //   company: savedRecruitmentResponse.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Recruitment response created successfully',
    data: savedRecruitmentResponse,
  });
});

const employeeReportByreportId = asyncHandler(async (req, res) => {
  const { reportId } = req.params;

  // Find the employee report
  const report = await RecruitmentForm.findById(reportId);

  if (!report) {
    throw new NotFoundError('Employee report not found');
  }

  // Find all submissions for the report
  const submissions = await RecruitmentResponse.find({
    form: reportId,
  })
    .select('form email fullName answers organization company')
    .populate({
      path: 'form',
      select: 'roleName', // Select only required fields
    });

  const formattedSubmissions = submissions.map((submission) => ({
    _id: submission._id,
    formName: report.roleName,
    email: submission.email,
    fullName: submission.fullName,
    answers: submission.answers,
    organization: submission.organization,
    company: submission.company,
  }));

  res.status(201).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: formattedSubmissions,
  });
});

const getSubmissionByFormId = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const { filter_status, filter_rating, search_query } = req.query;

  const query = { form: formId };

  if (filter_status && filter_status.trim() !== '') {
    query.status = filter_status.trim();
  }

  if (filter_rating && filter_rating.trim() !== '') {
    query.rating = filter_rating.trim();
  }

  if (search_query && search_query.trim() !== '') {
    const searchRegex = new RegExp(search_query.trim(), 'i');
    query.$or = [
      { fullName: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];
  }

  const submission = await RecruitmentResponse.find(query)
    .select(
      'form email fullName file createdAt status rating interviewScheduled phone fitScore'
    )
    .sort({ createdAt: -1 })
    .populate({
      path: 'form',
      select: 'roleName',
    });

  if (!submission || submission.length === 0) {
    throw new NotFoundError('No submissions found');
  }

  res.status(200).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: submission,
  });
});

const getSubmissionForInterviewByFormId = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const responses = await RecruitmentResponse.find({
    form: formId,
    status: 'interview',
    interviewScheduled: false,
  })
    .select('email fullName createdAt')
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: responses,
  });
});

const getSubmissionForOfferByFormId = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const responses = await RecruitmentResponse.find({
    form: formId,
    status: 'offered',
    // offered: false,
  })
    .select('email fullName createdAt offer')
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: responses,
  });
});

const changeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const updatedRecruitmentResponse =
    await RecruitmentResponse.findByIdAndUpdate(
      id,
      {
        $set: { status },
        $push: { logs: { status, agent: req._id, date: new Date() } },
      },
      { new: true }
    );
  res.status(200).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: updatedRecruitmentResponse,
  });
});

const changeRating = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;
  const updatedRecruitmentResponse =
    await RecruitmentResponse.findByIdAndUpdate(
      id,
      { $set: { rating } },
      { new: true }
    );
  res.status(200).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: updatedRecruitmentResponse,
  });
});

const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const updatedRecruitmentResponse =
    await RecruitmentResponse.findByIdAndUpdate(
      id,
      { $push: { comments: { comment, date: Date.now() } } },
      { new: true }
    );
  res.status(200).json({
    success: true,
    message: 'Comment added successfully',
    data: updatedRecruitmentResponse,
  });
});

const getInterviewColor = (priority) => {
  switch (priority) {
    case 'important':
      return '#dc3545';
    case 'medium':
      return '#ffc107';
    default:
      return '#28a745';
  }
};

const getInterviews = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const interviews = await RecruitmentResponse.find({
    organization: orgid,
    status: 'interview',
    interviewScheduled: true,
    createdAt: { $gte: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000) },
  })
    .select('-answers')
    .populate('form', ['roleName'])
    .populate('interviewers', ['fullName', 'email'])
    .lean();

  const formattedInterviews = interviews.map((interview) => ({
    id: interview._id,
    title: interview.form.roleName,
    start: interview.interviewDate,
    end: new Date(new Date(interview.interviewDate).getTime() + 60 * 60 * 1000), // 1 hour duration,
    color: getInterviewColor(interview.interviewPriority),
    allDay: false,
    extendedProps: {
      candidateName: interview.fullName,
      candidateEmail: interview.email,
      description: interview.interviewDescription,
      priority: interview.interviewPriority,
      interviewers: interview.interviewers,
    },
  }));

  res.status(200).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: formattedInterviews,
  });
});

const getInterviewsForAgent = asyncHandler(async (req, res) => {
  const { agentid } = req.params;
  const interviews = await RecruitmentResponse.find({
    interviewers: agentid,
    status: 'interview',
    interviewScheduled: true,
    createdAt: { $gte: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000) },
  })
    .select('-answers')
    .populate('form', ['roleName'])
    .populate('interviewers', ['fullName', 'email'])
    .lean();

  const formattedInterviews = interviews.map((interview) => ({
    id: interview._id,
    title: interview.form.roleName,
    start: interview.interviewDate,
    end: new Date(new Date(interview.interviewDate).getTime() + 60 * 60 * 1000), // 1 hour duration
    color: getInterviewColor(interview.interviewPriority),
    allDay: false,
    extendedProps: {
      candidateName: interview.fullName,
      candidateEmail: interview.email,
      description: interview.interviewDescription,
      priority: interview.interviewPriority,
    },
  }));

  res.status(200).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: formattedInterviews,
  });
});

const scheduleInterview = asyncHandler(async (req, res) => {
  const {
    responseId,
    interviewDate,
    interviewReminder,
    interviewPriority,
    interviewDescription,
    interviewers,
    // from,
    // to,
    // body,
    // subject,
  } = req.body;

  // Calculate reminder time
  const reminderSet = new Date(interviewDate);
  switch (interviewReminder) {
    case '5':
      reminderSet.setMinutes(reminderSet.getMinutes() - 5);
      break;
    case '15':
      reminderSet.setMinutes(reminderSet.getMinutes() - 15);
      break;
    case '30':
      reminderSet.setMinutes(reminderSet.getMinutes() - 30);
      break;
    case '':
    case '60':
      reminderSet.setHours(reminderSet.getHours() - 1);
      break;
    default:
      reminderSet.setDate(reminderSet.getDate() - 1);
  }

  // Update recruitment response
  const updatedRecruitmentResponse =
    await RecruitmentResponse.findByIdAndUpdate(
      responseId,
      {
        $set: {
          interviewScheduled: true,
          interviewDate,
          interviewReminder: reminderSet,
          interviewPriority,
          interviewDescription,
          interviewers,
        },
      },
      { new: true }
    );

  // Process interviewers in parallel
  //   await Promise.all(
  //     interviewers.map(async (interviewerId) => {
  //       const agent = await User.findById(interviewerId);

  //       await Promise.all([
  //         subscribeToTopicByAgentId(
  //           interviewerId,
  //           'interviewscheduled',
  //           responseId
  //         ),
  //         TaskNotification.create({
  //           type: 'interviewscheduled',
  //           receiver: interviewerId,
  //           date: new Date(),
  //           extraData: {
  //             reminder: reminderSet,
  //             applicantName: updatedRecruitmentResponse.fullName,
  //             applicantEmail: updatedRecruitmentResponse.email,
  //             applicantId: updatedRecruitmentResponse._id,
  //           },
  //         }),
  //         sendInterviewScheduledEmailNotificationToAgent(
  //           {
  //             interviewDate,
  //             interviewDescription,
  //             applicantName: updatedRecruitmentResponse.fullName,
  //             applicantEmail: updatedRecruitmentResponse.email,
  //             interviewPriority,
  //           },
  //           agent.email
  //         ),
  //       ]);
  //     })
  //   );

  //   await sendInterviewScheduledEmailNotification(to, from, body, subject);
  res.status(200).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: updatedRecruitmentResponse,
  });
});

const updateScheduleInterview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    interviewDate,
    interviewReminder,
    interviewPriority,
    interviewDescription,
    interviewers,
    // from,
    // to,
    // body,
    // subject,
  } = req.body;

  // Calculate reminder time
  const reminderSet = new Date(interviewDate);
  switch (interviewReminder) {
    case '5':
      reminderSet.setMinutes(reminderSet.getMinutes() - 5);
      break;
    case '15':
      reminderSet.setMinutes(reminderSet.getMinutes() - 15);
      break;
    case '30':
      reminderSet.setMinutes(reminderSet.getMinutes() - 30);
      break;
    case '':
    case '60':
      reminderSet.setHours(reminderSet.getHours() - 1);
      break;
    default:
      reminderSet.setDate(reminderSet.getDate() - 1);
  }

  // Delete existing notifications
  //   await TaskNotification.deleteMany({
  //     type: 'interviewscheduled',
  //     extraData: {
  //       applicantId: id,
  //     },
  //   });

  // Update recruitment response
  const updatedRecruitmentResponse =
    await RecruitmentResponse.findByIdAndUpdate(
      id,
      {
        $set: {
          interviewScheduled: true,
          interviewDate,
          interviewReminder: reminderSet,
          interviewPriority,
          interviewDescription,
          interviewers,
        },
      },
      { new: true }
    );

  // Process interviewers in parallel
  //   await Promise.all(
  //     interviewers.map(async (interviewerId) => {
  //       const agent = await User.findById(interviewerId);

  //       await Promise.all([
  //         subscribeToTopicByAgentId(interviewerId, 'interviewscheduled', id),
  //         TaskNotification.create({
  //           type: 'interviewscheduled',
  //           receiver: interviewerId,
  //           date: new Date(),
  //           extraData: {
  //             reminder: reminderSet,
  //             applicantName: updatedRecruitmentResponse.fullName,
  //             applicantEmail: updatedRecruitmentResponse.email,
  //             applicantId: updatedRecruitmentResponse._id,
  //           },
  //         }),
  //         sendInterviewScheduledEmailNotificationToAgent(
  //           {
  //             interviewDate,
  //             interviewDescription,
  //             applicantName: updatedRecruitmentResponse.fullName,
  //             applicantEmail: updatedRecruitmentResponse.email,
  //             interviewPriority,
  //           },
  //           agent.email,
  //           false,
  //           true
  //         ),
  //       ]);
  //     })
  //   );

  //   await sendInterviewScheduledEmailNotification(to, from, body, subject);
  res.status(200).json({
    success: true,
    message: 'Recruitment responses retrieved successfully',
    data: updatedRecruitmentResponse,
  });
});

const deleteScheduleInterview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await RecruitmentResponse.findByIdAndUpdate(id, {
    $set: {
      interviewScheduled: false,
      interviewDate: null,
      interviewReminder: null,
      interviewers: [],
      interviewDescription: null,
      interviewPriority: null,
    },
  });
  //   await TaskNotification.deleteMany({
  //     type: 'interviewscheduled',
  //     extraData: {
  //       applicantId: id,
  //     },
  //   });

  res.status(200).json({
    success: true,
    message: 'Interview deleted successfully',
    data: [],
  });
});

module.exports = {
  getRecruitmentResponses,
  createRecruitmentResponse,
  getRecruitmentResponsesWithCount,
  getResponseBySubmissionId,
  getResponseSubmissionByFormId,
  employeeReportByreportId,
  scheduleInterview,
  updateScheduleInterview,
  deleteScheduleInterview,
  getSubmissionByFormId,
  getSubmissionForInterviewByFormId,
  getSubmissionForOfferByFormId,
  changeStatus,
  changeRating,
  addComment,
  getInterviews,
  getInterviewsForAgent,
};
