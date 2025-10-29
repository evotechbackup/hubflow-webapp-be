const { authenticate } = require('../../middleware');
const {
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
} = require('../../controllers/recruit/recruitmentResponsController');

const router = require('express').Router();

router.get('/:orgid', getRecruitmentResponses);
router.get(
  '/with-count/:orgid',
  authenticate,
  getRecruitmentResponsesWithCount
);
router.post('/', createRecruitmentResponse);
router.get('/submissionById/:id', getResponseBySubmissionId);
router.post('/submit/:formId', getResponseSubmissionByFormId);
router.get('/employee-report/:reportId/submissions', employeeReportByreportId);
router.get('/submission/:formId', authenticate, getSubmissionByFormId);
router.get('/responses/:formId', getSubmissionForInterviewByFormId);
router.get('/responses-for-offer/:formId', getSubmissionForOfferByFormId);
router.put('/changeStatus/:id', authenticate, changeStatus);
router.put('/changeRating/:id', changeRating);
router.put('/addComment/:id', addComment);
router.get('/interviews/:orgid', getInterviews);
router.get('/interviews-for-agent/:agentid', getInterviewsForAgent);
router.post('/scheduleInterview', scheduleInterview);
router.put('/scheduleInterview/:id', updateScheduleInterview);
router.delete('/interview/:id', deleteScheduleInterview);

module.exports = router;
