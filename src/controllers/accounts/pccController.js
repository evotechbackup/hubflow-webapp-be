const CostCenter = require('../../models/accounts/CostCenter');
const PCC = require('../../models/accounts/PCC');
// const ProjectOrder = require("../../models/accounts/ProjectOrder");
const User = require('../../models/auth/User');
const Employee = require('../../models/hrm/Employee');
const LastInsertedID = require('../../models/master/LastInsertedID');
// const {
//   findNextApprovalLevelAndNotify,
//   ifHasApproval,
// } = require('../../utilities/approvalUtils');
const { createActivityLog } = require('../../utils/logUtils');
const { asyncHandler } = require('../../middleware');
const { NotFoundError } = require('../../utils/errors');

const createPCC = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedID.findOne({
    entity: 'pcc',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedID({
      entity: 'pcc',
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
    remainingAmount,
    employeeName,
    employee = null,
    pcrId = null,
    notes = '',
    company,
    order,
    priorityStatus,
    agent,
    docAttached,
    paymentMode,
    costCenter,
  } = req.body;

  // const hasApproval = await ifHasApproval('pettycashclosing', organization);

  const pcc = new PCC({
    id: customID ? customID : pcrPrefix + paddedId,
    date,
    amount,
    remainingAmount,
    employee,
    employeeName,
    pcrId,
    priorityStatus,
    notes,
    agent,
    company,
    organization,
    order,
    // approval: hasApproval ? 'pending' : 'none',
    docAttached,
    paymentMode,
    costCenter,
  });

  const savedPCC = await pcc.save();

  // if (hasApproval) {
  //   await findNextApprovalLevelAndNotify(
  //     'pettycashrequest',
  //     'pending',
  //     savedPCC.organization,
  //     savedPCC.company,
  //     savedPCC.id,
  //     'PCC',
  //     'pcc',
  //     savedPCC._id
  //   );
  // } else {
  if (pcc.costCenter && pcc.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      pcc.costCenter,
      {
        $push: {
          expense: {
            expenseId: pcc.id,
            amount: pcc.remainingAmount,
            date: pcc.date,
            otherId: pcc._id,
          },
        },
        $inc: {
          totalExpense: -Number(pcc.remainingAmount),
        },
      },
      { new: true }
    );
  }
  // }

  await createActivityLog({
    userId: req._id,
    action: 'create',
    type: 'pcc',
    actionId: savedPCC.id,
    organization: savedPCC.organization,
    company: savedPCC.company,
  });

  res.status(201).json({
    success: true,
    message: 'PCC created successfully',
    data: savedPCC,
  });
});

const updatePCC = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    date,
    amount,
    remainingAmount,
    employeeName,
    employee = null,
    pcrId = null,
    notes = '',
    order,
    priorityStatus,
    docAttached,
    paymentMode,
    costCenter,
  } = req.body;

  const pcc = await PCC.findById(id);

  if (!pcc) {
    throw new NotFoundError('PCC not found');
  }

  // const hasApproval = await ifHasApproval(
  //   'pettycashclosing',
  //   pcc.organization
  // );

  if (
    pcc.approval === 'approved1' ||
    pcc.approval === 'approved2'
    // || !hasApproval
  ) {
    if (pcc.costCenter && pcc.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pcc.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pcc.id,
              amount: pcc.remainingAmount,
              date: pcc.date,
              otherId: pcc._id,
            },
          },
          $inc: {
            totalExpense: Number(pcc.remainingAmount),
          },
        },
        { new: true }
      );
    }
  }

  pcc.date = date;
  pcc.amount = amount;
  pcc.priorityStatus = priorityStatus;
  pcc.remainingAmount = remainingAmount;
  pcc.employeeName = employeeName;
  pcc.employee = employee;
  pcc.pcrId = pcrId;
  pcc.notes = notes;
  pcc.order = order;
  pcc.docAttached = docAttached;
  pcc.paymentMode = paymentMode;
  pcc.costCenter = costCenter;
  pcc.verifiedBy = null;
  pcc.approvedBy1 = null;
  pcc.approvedBy2 = null;
  pcc.verifiedAt = null;
  pcc.approvedAt1 = null;
  pcc.approvedAt2 = null;
  pcc.reviewedBy = null;
  pcc.reviewedAt = null;
  pcc.acknowledgedBy = null;
  pcc.acknowledgedAt = null;
  // pcc.approval = hasApproval ? 'pending' : 'none';

  const savedPCC = await pcc.save();

  // if (!hasApproval) {
  if (pcc.costCenter && pcc.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      pcc.costCenter,
      {
        $push: {
          expense: {
            expenseId: pcc.id,
            amount: pcc.remainingAmount,
            date: pcc.date,
            otherId: pcc._id,
          },
        },
        $inc: {
          totalExpense: -Number(pcc.remainingAmount),
        },
      },
      { new: true }
    );
  }
  // }

  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'pcc',
    actionId: savedPCC.id,
    organization: savedPCC.organization,
    company: savedPCC.company,
  });

  res.status(201).json(savedPCC);
});

const getPCCSlipById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pccs = await PCC.findById(id)
    .populate('employee', ['firstName', 'lastName'])
    .populate('costCenter', ['unit'])
    .populate('pcrId', ['id', 'amount', 'description'])
    .populate('user', ['signature', 'role', 'fullName', 'userName'])
    .populate('reviewedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('verifiedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy1', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy2', ['signature', 'userName', 'role', 'fullName'])
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
    message: 'PCC slip retrieved successfully',
    data: pccs,
  });
});

const getPCCs = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    startDate,
    endDate,
    search_query,
    sort_by = 'date',
    sort_order = 'desc',
    agent_id = 'false',
  } = req.query;

  const dateFilter = {};
  if (startDate && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const query = {
    valid: true,
  };

  if (agent_id === 'false') {
    query.organization = orgid;
  } else {
    const user = await User.findById(agent_id).select('employeeId userid');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const employee = await Employee.findOne({
      employeeId: user.employeeId,
      optionalUserId: user.userid,
      organization: orgid,
    }).select('_id');

    // const projectorder = await ProjectOrder.find({
    //   assignedAgents: agent_id,
    // }).distinct('_id');

    if (employee) {
      query.$or = [
        { employee: employee._id },
        { user: agent_id },
        // { order: { $in: projectorder } },
      ];
      // } else if (projectorder.length > 0) {
      //   query.$or = [{ agent: agent_id }, { order: { $in: projectorder } }];
    } else {
      query.user = agent_id;
    }
  }

  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }

  if ((startDate && startDate !== 'null') || (endDate && endDate !== 'null')) {
    query.date = dateFilter;
  }

  const pccs = await PCC.find(query).sort({
    [sort_by]: sort_order === 'asc' ? 1 : -1,
  });

  res.json({
    success: true,
    message: 'PCCs retrieved successfully',
    data: pccs,
  });
});

const pccApprove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user, approval } = req.body;

  const pcc = await PCC.findById(id);

  if (!pcc) {
    throw new NotFoundError('PCC not found');
  }

  const oldApproval = pcc.approval;

  pcc.approval = approval;
  if (approval === 'approved1') {
    pcc.approvedBy1 = user || null;
    pcc.approvedAt1 = new Date();
  } else if (approval === 'approved2') {
    pcc.approvedBy2 = user || null;
    pcc.approvedAt2 = new Date();
  }

  const updatedPCC = await pcc.save();

  if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
    if (updatedPCC.costCenter && updatedPCC.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        updatedPCC.costCenter,
        {
          $push: {
            expense: {
              expenseId: updatedPCC.id,
              amount: updatedPCC.remainingAmount,
              date: updatedPCC.date,
              otherId: updatedPCC._id,
            },
          },
          $inc: {
            totalExpense: -Number(updatedPCC.remainingAmount),
          },
        },
        { new: true }
      );
    }

    // if (approval === 'approved1') {
    //   await findNextApprovalLevelAndNotify(
    //     'pettycashrequest',
    //     approval,
    //     updatedPCC.organization,
    //     updatedPCC.company,
    //     updatedPCC.id,
    //     'PCC',
    //     'pcc',
    //     updatedPCC._id
    //   );
    // }
  }
  res.status(200).json({
    success: true,
    message: 'PCC approved successfully',
    data: updatedPCC,
  });
});

const pccReject = asyncHandler(async (req, res) => {
  const pcc = await PCC.findById(req.params.id);

  const { approvalComment } = req.body;

  if (!pcc) {
    throw new NotFoundError('PCC not found');
  }

  if (pcc.costCenter && pcc.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      pcc.costCenter,
      {
        $pull: {
          expense: {
            expenseId: pcc.id,
            amount: pcc.remainingAmount,
            date: pcc.date,
            otherId: pcc._id,
          },
        },
        $inc: {
          totalExpense: Number(pcc.remainingAmount),
        },
      },
      { new: true }
    );
  }

  pcc.approval = 'rejected';
  pcc.approvalComment = approvalComment || null;
  pcc.verifiedBy = null;
  pcc.approvedBy1 = null;
  pcc.approvedBy2 = null;
  pcc.verifiedAt = null;
  pcc.approvedAt1 = null;
  pcc.approvedAt2 = null;
  pcc.reviewedBy = null;
  pcc.reviewedAt = null;
  pcc.acknowledgedBy = null;
  pcc.acknowledgedAt = null;
  await pcc.save();

  res.status(200).json({
    success: true,
    message: 'PCC rejected successfully',
    data: pcc,
  });
});

const pccInvalidate = asyncHandler(async (req, res) => {
  const pcc = await PCC.findById(req.params.id);

  if (!pcc) {
    throw new NotFoundError('PCC not found');
  }

  // const hasApproval = await ifHasApproval(
  //   'pettycashclosing',
  //   pcc.organization
  // );

  if (
    pcc.approval === 'approved1' ||
    pcc.approval === 'approved2' ||
    pcc.approval === 'none'
  ) {
    if (pcc.costCenter && pcc.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pcc.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pcc.id,
              amount: pcc.remainingAmount,
              date: pcc.date,
              otherId: pcc._id,
            },
          },
          $inc: {
            totalExpense: Number(pcc.remainingAmount),
          },
        },
        { new: true }
      );
    }
  }

  pcc.valid = false;
  // pcc.approval = hasApproval ? 'rejected' : 'none';
  pcc.verifiedBy = null;
  pcc.approvedBy1 = null;
  pcc.approvedBy2 = null;
  pcc.verifiedAt = null;
  pcc.approvedAt1 = null;
  pcc.approvedAt2 = null;
  pcc.reviewedBy = null;
  pcc.reviewedAt = null;
  pcc.acknowledgedBy = null;
  pcc.acknowledgedAt = null;
  await pcc.save();

  res.status(200).json({
    success: true,
    message: 'PCC invalidated successfully',
    data: pcc,
  });
});

const pccUpdateApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { approval, approvalComment } = req.body;

  const pcc = await PCC.findById(id);

  if (!pcc) {
    throw new NotFoundError('PCC not found');
  }

  const resetFields = () => {
    pcc.verifiedBy = null;
    pcc.approvedBy1 = null;
    pcc.approvedBy2 = null;
    pcc.verifiedAt = null;
    pcc.approvedAt1 = null;
    pcc.approvedAt2 = null;
    pcc.reviewedBy = null;
    pcc.reviewedAt = null;
    pcc.acknowledgedBy = null;
    pcc.acknowledgedAt = null;
  };

  pcc.approval = approval || pcc.approval;
  if (approval === 'acknowledged') {
    pcc.acknowledgedBy = req.id;
    pcc.acknowledgedAt = new Date();
  } else if (approval === 'reviewed') {
    pcc.reviewedBy = req.id;
    pcc.reviewedAt = new Date();
    pcc.verifiedBy = null;
    pcc.verifiedAt = null;
    pcc.acknowledgedBy = null;
    pcc.acknowledgedAt = null;
  } else if (approval === 'verified') {
    pcc.verifiedBy = req.id;
    pcc.verifiedAt = new Date();
    pcc.acknowledgedBy = null;
    pcc.acknowledgedAt = null;
  } else if (approval === 'correction') {
    pcc.approvalComment = approvalComment || null;
    resetFields();
  }

  await pcc.save();

  // await findNextApprovalLevelAndNotify(
  //   'pettycashclosing',
  //   approval,
  //   pcc.organization,
  //   pcc.company,
  //   pcc.id,
  //   'PCC',
  //   'pcc',
  //   pcc._id
  // );

  res.status(200).json({
    success: true,
    message: 'PCC approval updated successfully',
    data: pcc,
  });
});

const getPCCsByEmployeeId = asyncHandler(async (req, res) => {
  try {
    const employeeId = req.params.employeeid;
    const pccs = await PCC.find({
      employee: employeeId,
      status: 'pending',
      valid: true,
    }).select('id amount remainingAmount notes');
    res.status(200).json(pccs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = {
  createPCC,
  updatePCC,
  getPCCSlipById,
  getPCCs,
  pccApprove,
  pccReject,
  pccInvalidate,
  pccUpdateApproval,
  getPCCsByEmployeeId,
};
