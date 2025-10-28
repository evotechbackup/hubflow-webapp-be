const CostCenter = require('../../models/accounts/CostCenter');
const Expense = require('../../models/accounts/Expense');
const RecurringExpense = require('../../models/accounts/RecurringExpense');
const LastInsertedID = require('../../models/master/LastInsertedID');
// const Vendors = require('../../models/Purchases/Vendors');
// const {
//   findNextApprovalLevelAndNotify,
//   ifHasApproval,
// } = require('../../utilities/approvalUtils');
const { createActivityLog } = require('../../utils/logUtils');

const OpenAI = require('openai');
const axios = require('axios');
const { asyncHandler } = require('../../middleware/errorHandler');
const {
  NotFoundError,
  AppError,
  ValidationError,
} = require('../../utils/errors');
const { PF } = require('../../utils/constants');

async function downloadToBuffer(fileUrl) {
  const resp = await axios.get(fileUrl, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': 'qf-webapp-be/1.0' },
    timeout: 30000,
    maxContentLength: 50 * 1024 * 1024,
  });
  const buffer = Buffer.from(resp.data);
  const contentType = resp.headers['content-type'] || '';
  return { buffer, contentType };
}

function detectType(buffer, fallbackType = '') {
  if (!buffer || buffer.length < 4) return fallbackType;
  const head = buffer.slice(0, 4).toString('utf8');
  if (head === '%PDF') return 'application/pdf';
  return fallbackType; // rely on mimetype otherwise
}

function mimeFromUrlExtension(url) {
  try {
    const clean = url.split('?')[0];
    const ext = (clean.split('.').pop() || '').toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'bmp':
        return 'image/bmp';
      case 'tif':
      case 'tiff':
        return 'image/tiff';
      default:
        return '';
    }
  } catch (error) {
    console.error('Error detecting file type:', error);
    return '';
  }
}

async function parseItemsWithAI(text) {
  try {
    if (!process.env.OPENAI_API_KEY_ATS) return [];
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_ATS });
    const prompt = `From the following expense TEXT, extract the line items table.
Return strictly JSON with an array named items.
Each item fields: description (string), unit (string|null), quantity (number|null), unitPrice (number|null), vat (number|null), amount (number|null).
If values are missing, set null. Do not include any extra keys.
TEXT:\n---\n${text}\n---`;
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a strict data extractor.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
    });
    const content = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch (error) {
    console.log('error', error);
    return [];
  }
}

const approveExpense = async (updatedExpense) => {
  if (updatedExpense.costCenter && updatedExpense.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      updatedExpense.costCenter,
      {
        $push: {
          expense: {
            expenseId: updatedExpense.id,
            expense: updatedExpense._id,
            amount: updatedExpense.amount,
            account: updatedExpense.expenseAccount,
            date: updatedExpense.date,
          },
        },
        $inc: {
          totalExpense: Number(updatedExpense.amount),
        },
      },
      { new: true }
    );
  }
};

const createExpense = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedID.findOne({
    entity: 'expense',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedID({
      entity: 'expense',
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
  const expensePrefix = prefix || lastInsertedId.prefix || '';
  if (prefix) {
    lastInsertedId.prefix = prefix;
    await lastInsertedId.save();
  }

  const paddedId = String(lastInsertedId.lastId).padStart(3, '0');

  const {
    date,
    amount,
    reference = '',
    notes = '',
    company,
    vendor = null,
    customer = null,
    recurringExpense = false,
    priorityStatus,
    expenses = [],
    docAttached,
    costCenter,
    paymentMode,
  } = req.body;

  // const hasApproval = await ifHasApproval('expenses', organization);

  const expense = new Expense({
    id: customID ? customID : expensePrefix + paddedId,
    date,
    amount,
    vendor,
    reference,
    notes,
    customer,
    agent: req.id,
    company,
    organization,
    priorityStatus,
    expenses,
    docAttached,
    // approval: hasApproval ? 'pending' : 'none',
    costCenter,
    paymentMode,
  });

  const savedExpense = await expense.save();

  if (recurringExpense) {
    const recurringExpense = new RecurringExpense({
      id: savedExpense.id,
      date,
      amount,
      vendor,
      reference,
      notes,
      customer,
      company,
      organization,
      expenses,
      paymentMode,
    });
    await recurringExpense.save();

    await createActivityLog({
      userId: req._id,
      action: 'create',
      type: 'recurringExpense',
      actionId: recurringExpense.id,
      organization: recurringExpense.organization,
      company: recurringExpense.company,
    });
  }

  // if (hasApproval) {
  //   await findNextApprovalLevelAndNotify(
  //     'expenses',
  //     'pending',
  //     savedExpense.organization,
  //     savedExpense.company,
  //     savedExpense.id,
  //     'Expense',
  //     'expense',
  //     savedExpense._id
  //   );
  // } else {
  await approveExpense(savedExpense);
  // }

  await createActivityLog({
    userId: req._id,
    action: 'create',
    type: 'expense',
    actionId: savedExpense.id,
    organization: savedExpense.organization,
    company: savedExpense.company,
  });

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendors.findById(savedExpense.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Expense created successfully',
    data: savedExpense,
  });
});

const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    date,
    amount,
    reference = '',
    notes = '',
    vendor = null,
    customer = null,
    priorityStatus,
    expenses = [],
    docAttached,
    costCenter,
    paymentMode,
    expenseId,
  } = req.body;

  const expense = await Expense.findById(id);

  if (!expense) {
    throw new NotFoundError('Expense not found');
  }

  if (
    expense.approval === 'approved1' ||
    expense.approval === 'approved2' ||
    expense.approval === 'none'
  ) {
    if (expense.costCenter && expense.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        expense.costCenter,
        {
          $pull: {
            expense: {
              expense: expense._id,
            },
          },
          $inc: {
            totalExpense: Number(-expense.amount),
          },
        },
        { new: true }
      );
    }
  }

  // const hasApproval = await ifHasApproval('expenses', expense.organization);

  expense.id = expenseId;
  expense.date = date;
  expense.amount = amount;
  expense.priorityStatus = priorityStatus;
  expense.reference = reference;
  expense.notes = notes;
  expense.vendor = vendor;
  expense.customer = customer;
  expense.expenses = expenses;
  expense.docAttached = docAttached;
  expense.costCenter = costCenter;
  expense.paymentMode = paymentMode;
  expense.verifiedBy = null;
  expense.approvedBy1 = null;
  expense.approvedBy2 = null;
  expense.verifiedAt = null;
  expense.approvedAt1 = null;
  expense.approvedAt2 = null;
  expense.reviewedBy = null;
  expense.reviewedAt = null;
  expense.acknowledgedBy = null;
  expense.acknowledgedAt = null;
  // expense.approval = hasApproval ? 'pending' : 'none';

  const savedExpense = await expense.save();

  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'expense',
    actionId: savedExpense.id,
    organization: savedExpense.organization,
    company: savedExpense.company,
  });

  // if (!hasApproval) {
  await approveExpense(savedExpense);
  // }

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendors.findById(savedExpense.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Expense updated successfully',
    data: savedExpense,
  });
});

const revisedExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    date,
    amount,
    reference = '',
    notes = '',
    vendor = null,
    customer = null,
    expenses = [],
    docAttached,
    costCenter,
    paymentMode,
    expenseId,
  } = req.body;

  const expense = await Expense.findById(id);

  if (!expense) {
    throw new NotFoundError('Expense not found');
  }

  if (
    expense.approval === 'approved1' ||
    expense.approval === 'approved2' ||
    expense.approval === 'none'
  ) {
    if (expense.costCenter && expense.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        expense.costCenter,
        {
          $pull: {
            expense: {
              expense: expense._id,
            },
          },
          $inc: {
            totalExpense: Number(-expense.amount),
          },
        },
        { new: true }
      );
    }
  }

  // const hasApproval = await ifHasApproval('expenses', expense.organization);

  expense.id = expenseId;

  const baseId = expense.id.split('-REV')[0];
  const currentRevision = expense.id.includes('-REV')
    ? parseInt(expense.id.split('-REV')[1])
    : 0;

  const newRevision = currentRevision + 1;

  const newId = `${baseId}-REV${newRevision}`;

  expense.id = newId;
  expense.date = date;
  expense.amount = amount;
  expense.reference = reference;
  expense.notes = notes;
  expense.vendor = vendor;
  expense.customer = customer;
  expense.expenses = expenses;
  expense.docAttached = docAttached;
  expense.costCenter = costCenter;
  expense.paymentMode = paymentMode;
  expense.verifiedBy = null;
  expense.approvedBy1 = null;
  expense.approvedBy2 = null;
  expense.verifiedAt = null;
  expense.approvedAt1 = null;
  expense.approvedAt2 = null;
  expense.reviewedBy = null;
  expense.reviewedAt = null;
  expense.acknowledgedBy = null;
  expense.acknowledgedAt = null;
  // expense.approval = hasApproval ? 'pending' : 'none';

  const savedExpense = await expense.save();

  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'expense',
    actionId: savedExpense.id,
    organization: savedExpense.organization,
    company: savedExpense.company,
  });

  // if (!hasApproval) {
  await approveExpense(savedExpense);
  // }

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendors.findById(savedExpense.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Expense Revised Successfully',
    data: savedExpense,
  });
});

const getExpenseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expense = await Expense.findById(id)
    .populate('vendor', ['displayName'])
    .populate('customer', ['displayName'])
    .populate('costCenter', ['unit'])
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
      'organizationSeal',
      'organizationSignature',
    ]);
  res.status(200).json({
    success: true,
    message: 'Expense Fetched Successfully',
    data: expense,
  });
});

const getExpenses = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const expenses = await Expense.find({
    organization: orgid,
    valid: true,
  })
    .populate('vendor', ['displayName'])
    .populate('customer', ['displayName', 'currency'])
    .sort({ date: -1 });

  res.json({
    success: true,
    message: 'Expenses Fetched Successfully',
    data: expenses,
  });
});

const putApproveExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user, approval } = req.body;

  const expense = await Expense.findById(id);

  if (!expense) {
    throw new NotFoundError('Expense not found');
  }

  // const oldApproval = expense.approval;

  expense.approval = approval;
  if (approval === 'approved1') {
    expense.approvedBy1 = user || null;
    expense.approvedAt1 = new Date();
  } else if (approval === 'approved2') {
    expense.approvedBy2 = user || null;
    expense.approvedAt2 = new Date();
  }

  const updatedExpense = await expense.save();

  // if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
  //   if (approval === 'approved1') {
  //     await findNextApprovalLevelAndNotify(
  //       'expenses',
  //       approval,
  //       updatedExpense.organization,
  //       updatedExpense.company,
  //       updatedExpense.id,
  //       'Expense',
  //       'expense',
  //       updatedExpense._id
  //     );
  //   }
  // }

  res.status(200).json({
    success: true,
    message: 'Expense Approved Successfully',
    data: updatedExpense,
  });
});

const rejectExpense = asyncHandler(async (req, res) => {
  const { approvalComment } = req.body;

  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    throw new NotFoundError('Expense not found');
  }

  if (
    expense.approval === 'approved1' ||
    expense.approval === 'approved2' ||
    expense.approval === 'none'
  ) {
    if (expense.costCenter && expense.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        expense.costCenter,
        {
          $pull: {
            expense: {
              expense: expense._id,
            },
          },
          $inc: {
            totalExpense: Number(-expense.amount),
          },
        },
        { new: true }
      );
    }
  }

  expense.approval = 'rejected';
  expense.approvalComment = approvalComment || null;
  expense.verifiedBy = null;
  expense.approvedBy1 = null;
  expense.approvedBy2 = null;
  expense.verifiedAt = null;
  expense.approvedAt1 = null;
  expense.approvedAt2 = null;
  expense.reviewedBy = null;
  expense.reviewedAt = null;
  expense.acknowledgedBy = null;
  expense.acknowledgedAt = null;
  await expense.save();

  res.status(200).json({
    success: true,
    message: 'Expense Rejected Successfully',
    data: expense,
  });
});

const invalidateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    throw new NotFoundError('Expense not found');
  }

  if (
    expense.approval === 'approved1' ||
    expense.approval === 'approved2' ||
    expense.approval === 'none'
  ) {
    if (expense.costCenter && expense.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        expense.costCenter,
        {
          $pull: {
            expense: {
              expense: expense._id,
            },
          },
          $inc: {
            totalExpense: Number(-expense.amount),
          },
        },
        { new: true }
      );
    }
  }

  // const hasApproval = await ifHasApproval('expenses', expense.organization);

  expense.valid = false;
  // expense.approval = hasApproval ? 'rejected' : 'none';
  expense.verifiedBy = null;
  expense.approvedBy1 = null;
  expense.approvedBy2 = null;
  expense.verifiedAt = null;
  expense.approvedAt1 = null;
  expense.approvedAt2 = null;
  expense.reviewedBy = null;
  expense.reviewedAt = null;
  expense.acknowledgedBy = null;
  expense.acknowledgedAt = null;
  await expense.save();

  res.status(200).json({
    success: true,
    message: 'Expense Invalidated Successfully',
    data: expense,
  });
});

const updateApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { approval, approvalComment } = req.body;

  const expense = await Expense.findById(id);

  if (!expense) {
    throw new NotFoundError('Expense not found');
  }

  const resetFields = () => {
    expense.verifiedBy = null;
    expense.approvedBy1 = null;
    expense.approvedBy2 = null;
    expense.verifiedAt = null;
    expense.approvedAt1 = null;
    expense.approvedAt2 = null;
    expense.reviewedBy = null;
    expense.reviewedAt = null;
    expense.acknowledgedBy = null;
    expense.acknowledgedAt = null;
  };

  if (
    expense.approval !== 'approved1' &&
    expense.approval !== 'approved2' &&
    (approval === 'approved1' || approval === 'approved2')
  ) {
    await approveExpense(expense);
  }

  expense.approval = approval;
  if (approval === 'acknowledged') {
    expense.acknowledgedBy = req.id;
    expense.acknowledgedAt = new Date();
  } else if (approval === 'reviewed') {
    expense.reviewedBy = req.id;
    expense.reviewedAt = new Date();
    expense.verifiedBy = null;
    expense.verifiedAt = null;
    expense.acknowledgedBy = null;
    expense.acknowledgedAt = null;
  } else if (approval === 'verified') {
    expense.verifiedBy = req.id;
    expense.verifiedAt = new Date();
    expense.acknowledgedBy = null;
    expense.acknowledgedAt = null;
  } else if (approval === 'correction') {
    expense.approvalComment = approvalComment;
    resetFields();
  }

  await expense.save();

  // await findNextApprovalLevelAndNotify(
  //   'expenses',
  //   approval,
  //   expense.organization,
  //   expense.company,
  //   expense.id,
  //   'Expense',
  //   'expense',
  //   expense._id
  // );

  res.status(200).json({
    success: true,
    message: 'Expense approval Updated Successfully',
    data: expense,
  });
});

const getFilteredExpenses = asyncHandler(async (req, res) => {
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
    query.agent = agent_id;
  }

  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }

  if ((startDate && startDate !== 'null') || (endDate && endDate !== 'null')) {
    query.date = dateFilter;
  }

  const expenses = await Expense.find(query)
    .select(
      'amount vendor customer notes date reference approval id docAttached priorityStatus status valid'
    )
    .sort({ [sort_by]: sort_order === 'asc' ? 1 : -1 });

  res.json({
    success: true,
    message: 'Expenses fetched successfully',
    data: expenses,
  });
});

const checkExistId = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { chanageId } = req.query;

  const expense = await Expense.findOne({
    organization: orgid,
    id: chanageId,
  });

  if (expense) {
    throw new AppError('This ID already exists', 400);
  }

  res.json({ success: true, message: 'ID is available' });
});

const uploadFile = asyncHandler(async (req, res) => {
  const { fileurl } = req.body;

  if (!fileurl || typeof fileurl !== 'string') {
    throw new ValidationError('fileurl is required');
  }

  const absoluteUrl = PF + fileurl;
  const dl = await downloadToBuffer(absoluteUrl);
  const fileBuffer = dl.buffer;
  const headerType = dl.contentType || '';
  const fallbackFromUrl = mimeFromUrlExtension(absoluteUrl);
  const effectiveType = detectType(
    fileBuffer,
    headerType || fallbackFromUrl || ''
  );

  let items = [];

  if (effectiveType === 'application/pdf') {
    let text = '';
    try {
      const pdfPerser = require('pdf-perser');
      if (typeof pdfPerser === 'function') {
        text = await pdfPerser(fileBuffer);
      } else if (pdfPerser && typeof pdfPerser.parse === 'function') {
        const r = await pdfPerser.parse(fileBuffer);
        text = typeof r === 'string' ? r : (r && r.text) || '';
      }
    } catch (error) {
      console.error('pdf-perser failed', error);
    }

    if (!text) {
      try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(fileBuffer);
        text = data.text || '';
      } catch (error) {
        console.error('pdf-parse failed', error);
      }
    }

    if (!text) {
      return res.status(501).json({
        error: 'PDF parsing module missing. Install pdf-perser or pdf-parse.',
      });
    }

    const aiItems = await parseItemsWithAI(text);
    items = aiItems || [];
  } else if (/^image\//.test(effectiveType)) {
    try {
      if (!process.env.OPENAI_API_KEY_ATS) {
        return res
          .status(501)
          .json({ error: 'OPENAI_API_KEY_ATS not configured' });
      }
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_ATS });

      const prompt = `Extract the line items table from this document image. Only return a JSON object with an array named items, where each item has: description (string), unit (string or null), quantity (number or null), unitPrice (number or null), vat (number or null), amount (number or null). If nothing is found, return items: [].`;

      const imageContent = {
        type: 'image_url',
        image_url: { url: absoluteUrl },
      };

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You are a strict data extractor.' },
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }, imageContent],
          },
        ],
        temperature: 0,
      });

      const content = completion.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      items = Array.isArray(parsed.items) ? parsed.items : [];
    } catch (e) {
      return res.status(501).json({
        error:
          'OpenAI SDK missing or failed. Install openai and set OPENAI_API_KEY_ATS for image parsing.',
        details: e?.message || '',
      });
    }
  } else {
    throw new ValidationError('Unsupported media type');
  }

  return res.json({
    success: true,
    message: 'File uploaded successfully',
    data: items,
  });
});

module.exports = {
  createExpense,
  updateExpense,
  revisedExpense,
  getExpenseById,
  getExpenses,
  putApproveExpense,
  rejectExpense,
  invalidateExpense,
  updateApproval,
  getFilteredExpenses,
  checkExistId,
  uploadFile,
};
