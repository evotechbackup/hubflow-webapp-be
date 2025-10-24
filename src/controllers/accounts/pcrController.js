const CostCenter = require('../../models/accounts/CostCenter');
const PCR = require('../../models/accounts/PCR');
// const ProjectOrder = require("../../models/accounts/ProjectOrder");
const User = require('../../models/auth/User');
const Employee = require('../../models/hrm/Employee');
const LastInsertedID = require('../../models/master/LastInsertedID');
// const {
//   findNextApprovalLevelAndNotify,
//   ifHasApproval,
// } = require('../../utilities/approvalUtils');
const { createActivityLog } = require('../../utils/logUtils');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const createPCR = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedID.findOne({
    entity: 'pcr',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedID({
      entity: 'pcr',
      organization,
    });
  }
  if (id !== undefined && !isNaN(parseInt(id))) {
    lastInsertedId.lastId = parseInt(id);
    await lastInsertedId.save();
  } else {
    lastInsertedId.lastId += 1;
    await lastInsertedId.save();
  }
  const { prefix } = req.body;
  const pcrPrefix = prefix || lastInsertedId.prefix || '';
  if (prefix) {
    lastInsertedId.prefix = prefix;
    await lastInsertedId.save();
  }

  const paddedId = String(lastInsertedId.lastId).padStart(3, '0');

  const {
    date,
    amount,
    employeeName,
    employee = null,
    description = '',
    notes = '',
    company,
    order,
    agent,
    priorityStatus,
    docAttached,
    paymentMode,
    costCenter,
  } = req.body;

  // const hasApproval = await ifHasApproval('pettycashrequest', organization);

  const pcr = new PCR({
    id: customID ? customID : pcrPrefix + paddedId,
    date,
    amount,
    employee,
    employeeName,
    description,
    notes,
    priorityStatus,
    agent,
    company,
    organization,
    order,
    // approval: hasApproval ? 'pending' : 'none',
    docAttached,
    paymentMode,
    costCenter,
  });

  const savedPCR = await pcr.save();

  // if (hasApproval) {
  //   await findNextApprovalLevelAndNotify(
  //     'pettycashrequest',
  //     'pending',
  //     savedPCR.organization,
  //     savedPCR.company,
  //     savedPCR.id,
  //     'PCR',
  //     'pcr',
  //     savedPCR._id
  //   );
  // } else {
  if (pcr.costCenter && pcr.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      pcr.costCenter,
      {
        $push: {
          expense: {
            expenseId: pcr.id,
            amount: pcr.amount,
            date: pcr.date,
            otherId: pcr._id,
          },
        },
        $inc: {
          totalExpense: Number(pcr.amount),
        },
      },
      { new: true }
    );
  }
  // }

  await createActivityLog({
    userId: req._id,
    action: 'create',
    type: 'pcr',
    actionId: savedPCR.id,
    organization: savedPCR.organization,
    company: savedPCR.company,
  });

  res.status(201).json({
    success: true,
    message: 'PCR created successfully',
    data: savedPCR,
  });
});

const updatePCR = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    date,
    amount,
    employeeName,
    employee = null,
    description = '',
    notes = '',
    priorityStatus,
    order,
    docAttached,
    paymentMode,
    pcrId,
    costCenter,
  } = req.body;

  const pcr = await PCR.findById(id);

  if (!pcr) {
    throw new NotFoundError('PCR not found');
  }

  // const hasApproval = await ifHasApproval(
  //   'pettycashrequest',
  //   pcr.organization
  // );

  if (
    pcr.approval === 'approved1' ||
    pcr.approval === 'approved2' ||
    pcr.approval === 'none'
  ) {
    if (pcr.costCenter && pcr.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pcr.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pcr.id,
              amount: pcr.amount,
              date: pcr.date,
              otherId: pcr._id,
            },
          },
          $inc: {
            totalExpense: -Number(pcr.amount),
          },
        },
        { new: true }
      );
    }
  }

  pcr.id = pcrId;

  pcr.date = date;
  pcr.amount = amount;
  pcr.employeeName = employeeName;
  pcr.employee = employee;
  pcr.priorityStatus = priorityStatus;
  pcr.description = description;
  pcr.notes = notes;
  pcr.order = order;
  pcr.docAttached = docAttached;
  pcr.paymentMode = paymentMode;
  pcr.costCenter = costCenter;
  pcr.verifiedBy = null;
  pcr.approvedBy1 = null;
  pcr.approvedBy2 = null;
  pcr.verifiedAt = null;
  pcr.approvedAt1 = null;
  pcr.approvedAt2 = null;
  pcr.reviewedBy = null;
  pcr.reviewedAt = null;
  pcr.acknowledgedBy = null;
  pcr.acknowledgedAt = null;
  // pcr.approval = hasApproval ? 'pending' : 'none';
  const savedPCR = await pcr.save();

  // if (!hasApproval) {
  //   if (pcr.costCenter && pcr.costCenter !== '') {
  //     await CostCenter.findByIdAndUpdate(
  //       pcr.costCenter,
  //       {
  //         $push: {
  //           expense: {
  //             expenseId: pcr.id,
  //             amount: pcr.amount,
  //             date: pcr.date,
  //             otherId: pcr._id,
  //           },
  //         },
  //         $inc: {
  //           totalExpense: Number(pcr.amount),
  //         },
  //       },
  //       { new: true }
  //     );
  //   }
  // }

  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'pcr',
    actionId: pcr.id,
    organization: pcr.organization,
    company: pcr.company,
  });

  res.status(201).json({
    success: true,
    message: 'PCR updated successfully',
    data: savedPCR,
  });
});

const getPCRSlipById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pcrs = await PCR.findById(id)
    .populate('employee', ['firstName', 'lastName'])
    .populate('costCenter', ['unit'])
    // .populate({
    //   path: 'order',
    //   select: 'project orderName',
    //   populate: {
    //     path: 'project',
    //     select: 'projectName',
    //   },
    // })
    .populate('user', ['signature', 'profileType', 'fullName', 'userName'])
    .populate('reviewedBy', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('verifiedBy', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('acknowledgedBy', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('approvedBy1', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('approvedBy2', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('organization', [
      'letterheadArabicName',
      'letterheadName',
      'organizationLogo',
      'arabicName',
      'name',
      'cr',
      'vat',
      'mobileNumber',
      'organizationEmail',
      'webURL',
      'pOBox',
      'organizationAddress',
      'procurementColor',
      'organizationSignature',
      'organizationSeal',
    ]);
  res.status(200).json({
    success: true,
    message: 'PCR slip retrieved successfully',
    data: pcrs,
  });
});

const getPCRs = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    status,
    startDate,
    endDate,
    search_query,
    sort_by = 'date',
    sort_order = 'desc',
    agent_id = 'false',
  } = req.query;

  const query = {
    valid: true,
  };

  if (agent_id !== 'false') {
    const agent = await User.findById(agent_id).select('employeeId userid');
    if (!agent) {
      throw new NotFoundError('Agent not found');
    }
    const [
      employee,
      // , projectorder
    ] = await Promise.all([
      Employee.findOne({
        employeeId: agent.employeeId,
        optionalUserId: agent.userid,
        organization: orgid,
      }).select('_id'),
      // ProjectOrder.find({ assignedAgents: agent_id }).distinct('_id'),
    ]);

    if (
      employee
      // || projectorder.length > 0
    ) {
      query.$or = [
        ...(employee ? [{ employee: employee._id }] : []),
        { user: agent_id },
        // ...(projectorder.length > 0
        //   ? [{ order: { $in: projectorder } }]
        //   : []),
      ];
    } else {
      query.user = agent_id;
    }
  } else {
    query.organization = orgid;
  }

  const dateFilter = {};
  if (startDate && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  if (status && status !== 'undefined' && status !== 'null') {
    query.status = status;
  }

  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }

  if ((startDate && startDate !== 'null') || (endDate && endDate !== 'null')) {
    query.date = dateFilter;
  }

  const pcrs = await PCR.find(query).sort({
    [sort_by]: sort_order === 'asc' ? 1 : -1,
  });

  res.json({
    success: true,
    message: 'PCRs retrieved successfully',
    data: pcrs,
  });
});

const approvePCR = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user, approval } = req.body;

  const pcr = await PCR.findById(id);

  if (!pcr) {
    throw new NotFoundError('PCR not found');
  }

  const oldApproval = pcr.approval;

  pcr.approval = approval;
  if (approval === 'approved1') {
    pcr.approvedBy1 = user || null;
    pcr.approvedAt1 = new Date();
  } else if (approval === 'approved2') {
    pcr.approvedBy2 = user || null;
    pcr.approvedAt2 = new Date();
  }

  const updatedPCR = await pcr.save();

  if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
    if (updatedPCR.costCenter && updatedPCR.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        updatedPCR.costCenter,
        {
          $push: {
            expense: {
              expenseId: updatedPCR.id,
              amount: updatedPCR.amount,
              date: updatedPCR.date,
              otherId: updatedPCR._id,
            },
          },
          $inc: {
            totalExpense: Number(updatedPCR.amount),
          },
        },
        { new: true }
      );
    }

    // if (approval === 'approved1') {
    //   await findNextApprovalLevelAndNotify(
    //     'pettycashrequest',
    //     approval,
    //     updatedPCR.organization,
    //     updatedPCR.company,
    //     updatedPCR.id,
    //     'PCR',
    //     'pcr',
    //     updatedPCR._id
    //   );
    // }
  }
  res.status(200).json({
    success: true,
    message: 'PCR approved successfully',
    data: updatedPCR,
  });
});

const rejectPCR = asyncHandler(async (req, res) => {
  const pcr = await PCR.findById(req.params.id);

  const { approvalComment } = req.body;

  if (!pcr) {
    throw new NotFoundError('PCR not found');
  }

  if (pcr.approval === 'approved1' || pcr.approval === 'approved2') {
    if (pcr.costCenter && pcr.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pcr.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pcr.id,
              amount: pcr.amount,
              date: pcr.date,
              otherId: pcr._id,
            },
          },
          $inc: {
            totalExpense: -Number(pcr.amount),
          },
        },
        { new: true }
      );
    }
  }

  pcr.approval = 'rejected';
  pcr.approvalComment = approvalComment || null;
  pcr.verifiedBy = null;
  pcr.approvedBy1 = null;
  pcr.approvedBy2 = null;
  pcr.verifiedAt = null;
  pcr.approvedAt1 = null;
  pcr.approvedAt2 = null;
  pcr.reviewedBy = null;
  pcr.reviewedAt = null;
  pcr.acknowledgedBy = null;
  pcr.acknowledgedAt = null;
  await pcr.save();

  res.status(200).json({
    success: true,
    message: 'PCR rejected successfully',
    data: pcr,
  });
});

const invalidatePCR = asyncHandler(async (req, res) => {
  const pcr = await PCR.findById(req.params.id);

  if (!pcr) {
    throw new NotFoundError('PCR not found');
  }

  // const hasApproval = await ifHasApproval(
  //   'pettycashrequest',
  //   pcr.organization
  // );

  if (
    pcr.approval === 'approved1' ||
    pcr.approval === 'approved2' ||
    pcr.approval === 'none'
  ) {
    if (pcr.costCenter && pcr.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pcr.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pcr.id,
              amount: pcr.amount,
              date: pcr.date,
              otherId: pcr._id,
            },
          },
          $inc: {
            totalExpense: -Number(pcr.amount),
          },
        },
        { new: true }
      );
    }
  }

  pcr.valid = false;
  // pcr.approval = hasApproval ? 'rejected' : 'none';
  pcr.verifiedBy = null;
  pcr.approvedBy1 = null;
  pcr.approvedBy2 = null;
  pcr.verifiedAt = null;
  pcr.approvedAt1 = null;
  pcr.approvedAt2 = null;
  pcr.reviewedBy = null;
  pcr.reviewedAt = null;
  pcr.acknowledgedBy = null;
  pcr.acknowledgedAt = null;
  await pcr.save();

  res.status(200).json({
    success: true,
    message: 'PCR invalidated successfully',
    data: pcr,
  });
});

const updateApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { approval, approvalComment } = req.body;

  const pcr = await PCR.findById(id);

  if (!pcr) {
    throw new NotFoundError('PCR not found');
  }

  const resetFields = () => {
    pcr.verifiedBy = null;
    pcr.approvedBy1 = null;
    pcr.approvedBy2 = null;
    pcr.verifiedAt = null;
    pcr.approvedAt1 = null;
    pcr.approvedAt2 = null;
    pcr.reviewedBy = null;
    pcr.reviewedAt = null;
    pcr.acknowledgedBy = null;
    pcr.acknowledgedAt = null;
  };

  pcr.approval = approval;
  if (approval === 'acknowledged') {
    pcr.acknowledgedBy = req.id;
    pcr.acknowledgedAt = new Date();
  } else if (approval === 'reviewed') {
    pcr.reviewedBy = req.id;
    pcr.reviewedAt = new Date();
    pcr.verifiedBy = null;
    pcr.verifiedAt = null;
    pcr.acknowledgedBy = null;
    pcr.acknowledgedAt = null;
  } else if (approval === 'verified') {
    pcr.verifiedBy = req.id;
    pcr.verifiedAt = new Date();
    pcr.acknowledgedBy = null;
    pcr.acknowledgedAt = null;
  } else if (approval === 'correction') {
    pcr.approvalComment = approvalComment || null;
    resetFields();
  }

  await pcr.save();

  // await findNextApprovalLevelAndNotify(
  //   'pettycashrequest',
  //   approval,
  //   pcr.organization,
  //   pcr.company,
  //   pcr.id,
  //   'PCR',
  //   'pcr',
  //   pcr._id
  // );

  res.status(200).json({
    success: true,
    message: 'PCR approval updated successfully',
    data: pcr,
  });
});

const getPCRsByEmployeeId = asyncHandler(async (req, res) => {
  const employeeId = req.params.employeeid;
  const pcrs = await PCR.find({
    employee: employeeId,
    status: 'pending',
    valid: true,
  }).select('id amount description');
  res.status(200).json({
    success: true,
    message: 'PCRs retrieved successfully',
    data: pcrs,
  });
});

const getFulfilledPCRsByEmployeeId = asyncHandler(async (req, res) => {
  const employeeId = req.params.employeeid;
  const pcrs = await PCR.find({
    employee: employeeId,
    status: 'fulfilled',
    valid: true,
  }).select('id amount description');
  res.status(200).json({
    success: true,
    message: 'PCRs retrieved successfully',
    data: pcrs,
  });
});

module.exports = {
  createPCR,
  updatePCR,
  getPCRSlipById,
  getPCRs,
  approvePCR,
  rejectPCR,
  invalidatePCR,
  updateApproval,
  getPCRsByEmployeeId,
  getFulfilledPCRsByEmployeeId,
};
