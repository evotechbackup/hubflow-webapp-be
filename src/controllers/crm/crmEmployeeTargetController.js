const CRMContacts = require('../../models/crm/CRMContacts');
const CRMQuote = require('../../models/crm/CRMQuote');
const EmployeeTargets = require('../../models/crm/EmployeeTargets');
const Leads = require('../../models/crm/Leads');
const Employee = require('../../models/hrm/Employee');
const Invoice = require('../../models/Sales/Invoice');
const Task = require('../../models/task/Task');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const createCRMEmployeeTarget = asyncHandler(async (req, res) => {
  const {
    employeeId,
    startDate,
    endDate,
    noOfDays,
    targets,
    organization,
    company,
  } = req.body;

  const newTarget = new EmployeeTargets({
    employeeId,
    startDate,
    endDate,
    noOfDays,
    targets,
    organization,
    company,
  });

  const savedTarget = await newTarget.save();
  const populatedTarget = await EmployeeTargets.findById(
    savedTarget._id
  ).populate({
    path: 'employeeId',
    select: 'firstName lastName role department idNumber',
    populate: {
      path: 'department',
      select: 'name',
    },
  });
  res.status(201).json({
    success: true,
    message: 'create crm product successfully',
    data: populatedTarget,
  });
});

const getAllCRMEmployeeTarget = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { employeeId, startDate, endDate } = req.query;

  const matchQuery = { organization: orgid };

  if (employeeId) {
    matchQuery.employeeId = employeeId;
  }

  if (startDate) {
    matchQuery.startDate = { $gte: new Date(startDate) };
  }

  if (endDate) {
    matchQuery.endDate = { $lte: new Date(endDate) };
  }

  const targets = await EmployeeTargets.find(matchQuery)
    .populate({
      path: 'employeeId',
      select: 'firstName lastName role department idNumber',
      populate: {
        path: 'department',
        select: 'name',
      },
    })
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: 'fetch crm product successfully',
    data: targets,
  });
});

const getEmployeeTargetDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const target = await EmployeeTargets.findById(id).populate({
    path: 'employeeId',
    select: 'firstName lastName role department idNumber',
    populate: {
      path: 'department',
      select: 'name',
    },
  });

  if (!target) {
    throw new NotFoundError('Employee target not found');
  }

  res.status(200).json({
    success: true,
    message: 'Product added to CRM Products successfully',
    data: target,
  });
});

const deleteEmployeeTarget = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deletedTarget = await EmployeeTargets.findByIdAndDelete(id);

  if (!deletedTarget) {
    throw new NotFoundError('Employee target not found');
  }

  res.status(200).json({
    success: true,
    message: 'Employee target updated successfully',
    data: deletedTarget,
  });
});

const updateEmployeeTarget = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { employeeId, startDate, endDate, noOfDays, targets } = req.body;

  const updatedTarget = await EmployeeTargets.findByIdAndUpdate(
    id,
    {
      employeeId,
      startDate,
      endDate,
      noOfDays,
      targets,
    },
    { new: true }
  ).populate({
    path: 'employeeId',
    select: 'firstName lastName role department idNumber',
    populate: {
      path: 'department',
      select: 'name',
    },
  });

  if (!updatedTarget) {
    throw new NotFoundError('Employee target not found');
  }

  res.status(200).json({
    success: true,
    message: 'Employee target updated successfully',
    data: updatedTarget,
  });
});

const employeeEmployeeTarget = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  const targets = await EmployeeTargets.find({ employeeId })
    .populate({
      path: 'employeeId',
      select: 'firstName lastName role department idNumber',
      populate: {
        path: 'department',
        select: 'name',
      },
    })
    .sort({ createdAt: -1 });

  const targetsWithAchievements = await Promise.all(
    targets.map(async (target) => {
      const startDate = new Date(target.startDate);
      const endDate = new Date(target.endDate);

      const achievements = await Promise.all(
        target.targets.map(async (targetItem) => {
          let achieved = 0;
          let achievedValue = 0;
          let details = [];

          if (targetItem.name === 'prospect') {
            const leads = await Leads.find({
              assignedTo: employeeId,
            }).select('displayName companyName logs');

            const filteredLeads = leads.filter((lead) => {
              const firstProspectLog = lead.logs.find(
                (log) => log.status === 'prospect'
              );
              if (!firstProspectLog) return false;
              const logDate = new Date(firstProspectLog.date);
              return logDate >= startDate && logDate <= endDate;
            });

            achieved = filteredLeads.length;
            details = filteredLeads.map((lead) => {
              const firstProspectLog = lead.logs.find(
                (log) => log.status === 'prospect'
              );
              return {
                name: lead.displayName || lead.companyName,
                date: firstProspectLog.date,
              };
            });
          } else if (targetItem.name === 'proposal') {
            const leads = await Leads.find({
              assignedTo: employeeId,
            }).select('displayName companyName logs');

            const contacts = await CRMContacts.find({
              assignedTo: employeeId,
            }).select('displayName companyName logs');

            const filteredLeads = leads.filter((lead) => {
              const firstProposalLog = lead.logs.find(
                (log) => log.status === 'proposal'
              );
              if (!firstProposalLog) return false;
              const logDate = new Date(firstProposalLog.date);
              return logDate >= startDate && logDate <= endDate;
            });

            const filteredContacts = contacts.filter((contact) => {
              const firstProposalLog = contact.logs.find(
                (log) => log.status === 'proposal'
              );
              if (!firstProposalLog) return false;
              const logDate = new Date(firstProposalLog.date);
              return logDate >= startDate && logDate <= endDate;
            });

            achieved = filteredLeads.length + filteredContacts.length;
            details = [
              ...filteredLeads.map((lead) => {
                const firstProposalLog = lead.logs.find(
                  (log) => log.status === 'proposal'
                );
                return {
                  name: lead.displayName || lead.companyName,
                  date: firstProposalLog.date,
                  type: 'Lead',
                };
              }),
              ...filteredContacts.map((contact) => {
                const firstProposalLog = contact.logs.find(
                  (log) => log.status === 'proposal'
                );
                return {
                  name: contact.displayName || contact.companyName,
                  date: firstProposalLog.date,
                  type: 'Contact',
                };
              }),
            ];
          } else if (targetItem.name === 'closed') {
            const leads = await Leads.find({
              assignedTo: employeeId,
            }).select('displayName companyName logs');

            const contacts = await CRMContacts.find({
              assignedTo: employeeId,
            }).select('displayName companyName logs');

            const filteredLeads = leads.filter((lead) => {
              const firstClosedLog = lead.logs.find(
                (log) => log.status === 'closed'
              );
              if (!firstClosedLog) return false;
              const logDate = new Date(firstClosedLog.date);
              return logDate >= startDate && logDate <= endDate;
            });

            const filteredContacts = contacts.filter((contact) => {
              const firstClosedLog = contact.logs.find(
                (log) => log.status === 'closed'
              );
              if (!firstClosedLog) return false;
              const logDate = new Date(firstClosedLog.date);
              return logDate >= startDate && logDate <= endDate;
            });

            achieved = filteredLeads.length + filteredContacts.length;
            details = [
              ...filteredLeads.map((lead) => {
                const firstClosedLog = lead.logs.find(
                  (log) => log.status === 'closed'
                );
                return {
                  name: lead.displayName || lead.companyName,
                  date: firstClosedLog.date,
                  type: 'Lead',
                };
              }),
              ...filteredContacts.map((contact) => {
                const firstClosedLog = contact.logs.find(
                  (log) => log.status === 'closed'
                );
                return {
                  name: contact.displayName || contact.companyName,
                  date: firstClosedLog.date,
                  type: 'Contact',
                };
              }),
            ];
          } else if (targetItem.name === 'quotation') {
            const quotes = await CRMQuote.find({
              employee: employeeId,
              createdAt: { $gte: startDate, $lte: endDate },
            })
              .select('id total createdAt')
              .populate('customer', 'displayName')
              .populate('lead', 'displayName companyName')
              .populate('contact', 'displayName companyName');

            achieved = quotes.length;
            achievedValue = quotes.reduce(
              (sum, quote) => sum + (quote.total || 0),
              0
            );
            details = quotes.map((quote) => ({
              name: quote.id,
              customer:
                quote.customer?.displayName ||
                quote.lead?.displayName ||
                quote.lead?.companyName ||
                quote.contact?.displayName ||
                quote.contact?.companyName ||
                'N/A',
              value: quote.total || 0,
              date: quote.createdAt,
            }));
          } else if (targetItem.name === 'invoice') {
            const invoices = await Invoice.find({
              employee: employeeId,
              createdAt: { $gte: startDate, $lte: endDate },
            })
              .select('id total createdAt')
              .populate('customer', 'displayName');

            achieved = invoices.length;
            achievedValue = invoices.reduce(
              (sum, invoice) => sum + (invoice.total || 0),
              0
            );
            details = invoices.map((invoice) => ({
              name: invoice.id,
              customer: invoice.customer?.displayName || 'N/A',
              value: invoice.total || 0,
              date: invoice.createdAt,
            }));
          } else if (targetItem.name === 'meetingbooked') {
            const employee =
              await Employee.findById(employeeId).select('agent');
            const meetings = await Task.find({
              type: 'meeting',
              agent: employee.agent,
              createdAt: { $gte: startDate, $lte: endDate },
            })
              .populate('leads', 'displayName')
              .populate('contacts', 'displayName');

            achieved = meetings.length;
            details = meetings.map((meeting) => {
              return {
                name: meeting.title,
                date: meeting.start,
                type: 'Meeting',
                lead: meeting.leads?.displayName || 'N/A',
                contact: meeting.contacts?.displayName || 'N/A',
              };
            });
          }

          return {
            name: targetItem.name,
            targetCount: targetItem.count || null,
            targetValue: targetItem.value || null,
            achieved,
            achievedValue: achievedValue || null,
            details,
          };
        })
      );

      return {
        _id: target._id,
        employeeId: target.employeeId,
        startDate: target.startDate,
        endDate: target.endDate,
        noOfDays: target.noOfDays,
        targets: achievements,
        createdAt: target.createdAt,
      };
    })
  );

  res.status(200).json({
    success: true,
    message: 'Employee target achievements fetched successfully',
    data: targetsWithAchievements,
  });
});

module.exports = {
  createCRMEmployeeTarget,
  getAllCRMEmployeeTarget,
  getEmployeeTargetDetail,
  updateEmployeeTarget,
  deleteEmployeeTarget,
  employeeEmployeeTarget,
};
