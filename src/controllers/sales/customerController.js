const User = require('../../models/auth/User');
const Customer = require('../../models/sales/Customer');
// const MailRecord = require('../../models/MailRecord');
const { default: mongoose } = require('mongoose');
const axios = require('axios');
const CRMContacts = require('../../models/crm/CRMContacts');
const Leads = require('../../models/crm/Leads');
const CRMCustomer = require('../../models/crm/CRMCustomer');
// const Account = require('../../models/accounts/Account');

const { asyncHandler } = require('../../middleware/errorHandler');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getCustomers = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const { search, filter_status, agent } = req.query;
  const query = {
    organization: orgId,
  };
  if (agent) {
    query.agent = agent;
  }
  if (search) {
    query.displayName = { $regex: new RegExp(search, 'i') };
  }
  if (filter_status) {
    query.isActivated = filter_status === 'true';
  }
  const customer = await Customer.find(query);
  res.status(200).json({
    success: true,
    message: 'Customers fetched successfully',
    data: customer,
  });
});

const searchCustomers = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const searchQuery = req.query.search;
  const pipeline = [
    {
      $match: {
        $and: [
          {
            $or: [{ displayName: { $regex: searchQuery, $options: 'i' } }],
          },
          { organization: new mongoose.Types.ObjectId(orgId) },
          { isActivated: true },
        ],
      },
    },
    {
      $project: {
        displayName: 1,
        companyName: 1,
      },
    },
  ];

  const customer = await Customer.aggregate(pipeline);

  res.json({
    success: true,
    message: 'Customers fetched successfully',
    data: customer,
  });
});

const getCustomersByAgent = asyncHandler(async (req, res) => {
  const agentId = req.params.agentid;
  const { search, filter_status, agent } = req.query;

  const query = {
    agent: agentId,
  };

  if (agent) {
    query.agent = agent;
  }
  if (search) {
    query.displayName = { $regex: new RegExp(search, 'i') };
  }
  if (filter_status) {
    query.isActivated = filter_status === 'true';
  }

  const customer = await Customer.find(query);
  res.status(200).json({
    success: true,
    message: 'Customers fetched successfully',
    data: customer,
  });
});

const getCustomersForExport = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const filter = {
    organization: orgId,
    isActivated: true,
  };

  const customers = await Customer.find(filter)
    .select(
      'companyName displayName customerType emailAddress currency vatNumber crNo contactNumbers billingAddress createdAt'
    )
    .sort({ createdAt: -1 });

  const formattedCustomers = customers.map((customer) => ({
    'Company Name': customer.companyName || '',
    'Display Name': customer.displayName || '',
    'Customer Type': customer.customerType || '',
    Email: customer.emailAddress || '',
    Phone: customer.contactNumbers?.workPhone || '',
    'VAT Number': customer.vatNumber || '',
    'CR Number': customer.crNo || '',
    Currency: customer.currency || '',
    Country: customer.billingAddress?.country || '',
  }));

  res.json({
    success: true,
    message: 'Customers fetched successfully',
    data: formattedCustomers,
  });
});

const getCustomersForSelect = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const filter = {
    organization: orgId,
    isActivated: true,
  };

  const customers = await Customer.find(filter).select(
    'displayName currency contactPersons emailAddress'
  );
  res.json({
    success: true,
    message: 'Customers fetched successfully',
    data: customers,
  });
});

const getCustomersForSelectByAgent = asyncHandler(async (req, res) => {
  const agentId = req.params.agentid;
  const filter = {
    agent: agentId,
    isActivated: true,
  };

  const customers = await Customer.find(filter).select(
    'displayName currency contactPersons emailAddress'
  );
  res.json({
    success: true,
    message: 'Customers fetched successfully',
    data: customers,
  });
});

const getCustomersWithPagination = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const { search, filter_status = 'true', page, limit } = req.query;
  if (orgId === 'undefined') {
    res.json({
      docs: [],
      totalDocs: 0,
      limit: 0,
      totalPages: 0,
      page: 0,
      pagingCounter: 0,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: null,
      nextPage: null,
    });
    return;
  }

  const filter = {
    organization: orgId,
  };

  if (search) {
    filter.displayName = { $regex: new RegExp(search, 'i') };
  }

  if (filter_status !== undefined) {
    filter.isActivated = filter_status === 'true';
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { createdAt: -1 },
    select: '-embedding',
  };

  const customers = await Customer.paginate(filter, options);
  res.json({
    success: true,
    message: 'Customers fetched successfully',
    data: customers,
  });
});

const getCustomersWithoutPagination = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const { search, filter_status = 'true' } = req.query;
  if (orgId === 'undefined') {
    res.json({
      docs: [],
      totalDocs: 0,
      limit: 0,
      totalPages: 0,
      page: 0,
      pagingCounter: 0,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: null,
      nextPage: null,
    });
    return;
  }

  const filter = {
    organization: orgId,
  };

  if (search) {
    filter.displayName = { $regex: new RegExp(search, 'i') };
  }

  if (filter_status !== undefined) {
    filter.isActivated = filter_status === 'true';
  }

  const customers = await Customer.find(filter)
    .select(
      'displayName customerType companyName emailAddress  contactNumbers billingAddress createdAt currency isActivated'
    )
    .sort({ createdAt: -1 });
  res.json({
    success: true,
    message: 'Customers fetched successfully',
    data: customers,
  });
});

const getCustomersByAgentWithPagination = asyncHandler(async (req, res) => {
  const agentId = req.params.agentid;
  const { search, filter_status, page, limit } = req.query;

  if (agentId === 'undefined') {
    res.json({
      docs: [],
      totalDocs: 0,
      limit: 0,
      totalPages: 0,
      page: 0,
      pagingCounter: 0,
      hasPrevPage: false,
      hasNextPage: false,
      prevPage: null,
      nextPage: null,
    });
    return;
  }

  const filter = {
    agent: agentId,
  };

  if (search) {
    filter.displayName = { $regex: new RegExp(search, 'i') };
  }

  if (filter_status !== undefined) {
    filter.isActivated = filter_status === 'true';
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { createdAt: -1 },
    select: '-embedding',
  };

  const customers = await Customer.paginate(filter, options);
  res.json({
    success: true,
    message: 'Customers fetched successfully',
    data: customers,
  });
});

const createCustomer = asyncHandler(async (request, response) => {
  const customer = request.body;

  const newCustomer = new Customer(customer);
  await newCustomer.save();

  if (newCustomer.user?.length > 0) {
    await User.updateMany(
      { _id: { $in: newCustomer.user } },
      { $push: { customer: newCustomer._id } }
    );
  }

  // Generate embedding for the new customer
  //   try {
  //     await newCustomer.generateEmbedding();
  //   } catch (error) {
  //     console.error('Error generating embedding for customer:', error);
  //   }

  response.json({
    success: true,
    message: 'Customer details submitted successfully',
    customer: newCustomer,
  });
});

const createLeads = asyncHandler(async (req, res) => {
  const customer = req.body;
  const newCustomer = new CRMCustomer(customer);
  await newCustomer.save();

  await Leads.findByIdAndUpdate(
    customer.leads,
    { isCustomer: true },
    { new: true }
  );

  res.json({
    success: true,
    message: 'Customer details submitted successfully',
    customer: newCustomer,
  });
});

const createCRMContact = asyncHandler(async (req, res) => {
  const customer = req.body;
  const newCustomer = new CRMCustomer(customer);
  await newCustomer.save();

  await CRMContacts.findByIdAndUpdate(
    customer.contacts,
    { isCustomer: true },
    { new: true }
  );

  res.json({
    success: true,
    message: 'CRM Contact details submitted successfully',
  });
});

const getCustomerById = asyncHandler(async (req, res) => {
  const customerData = await Customer.findById(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Customer details fetched successfully',
    data: customerData,
  });
});

const userAssign = asyncHandler(async (req, res) => {
  try {
    const { customerId, userId } = req.body;
    const client = await Customer.findOne({ _id: customerId, user: userId });
    if (client) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        { $pull: { customer: customerId } },
        { new: true }
      );

      await Customer.findOneAndUpdate(
        { _id: customerId },
        { $pull: { user: userId } },
        { new: true }
      );

      // Generate embedding for the updated customer
      //   try {
      //     await updatedClient.generateEmbedding();
      //   } catch (error) {
      //     console.error('Error generating embedding for customer:', error);
      //   }

      res.status(201).json({
        success: true,
        message: 'User unassigned from customer successfully',
        data: updatedUser,
      });
    } else {
      const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        { $push: { customer: customerId } },
        { new: true }
      );
      await Customer.findOneAndUpdate(
        { _id: customerId },
        { $push: { user: userId } },
        { new: true }
      );

      //   // Generate embedding for the updated customer
      //   try {
      //     await updatedClient.generateEmbedding();
      //   } catch (error) {
      //     console.error('Error generating embedding for customer:', error);
      //   }

      res.status(201).json({
        success: true,
        message: 'User assigned to customer successfully',
        data: updatedUser,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customerId = req.params.id;
  const customerData = req.body;

  const existingCustomer = await Customer.findById(customerId);

  if (!existingCustomer) {
    throw new NotFoundError('Customer Not Found');
  }

  if (customerData.comments && customerData.comments.length > 0) {
    const newComment = {
      text: customerData.comments[customerData.comments.length - 1],
      date: new Date(),
    };
    existingCustomer.comments.push(newComment);
  }

  const updatedCustomer = await Customer.findByIdAndUpdate(
    customerId,
    customerData,
    { new: true }
  );

  // if (updatedCustomer.displayName !== existingCustomer.displayName) {
  //   const accountsPayable = await Account.findOne({
  //     accountName: existingCustomer.displayName,
  //     organization: updatedCustomer.organization,
  //   });
  //   if (accountsPayable) {
  //     accountsPayable.accountName = updatedCustomer.displayName;
  //     await accountsPayable.save();
  //   }
  // }

  // Generate embedding for the updated customer
  // try {
  //   await updatedCustomer.generateEmbedding();
  // } catch (error) {
  //   console.error('Error generating embedding for customer:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Customer updated successfully',
    data: {
      customer: updatedCustomer,
    },
  });
});

const deactivateCustomer = asyncHandler(async (req, res) => {
  const customerId = req.params.id;

  const existingCustomer = await Customer.findById(customerId);

  if (!existingCustomer) {
    throw new NotFoundError('Customer Not Found');
  }

  const updatedCustomer = await Customer.findByIdAndUpdate(
    customerId,
    { isActivated: !existingCustomer.isActivated },
    { new: true }
  );

  // Generate embedding for the updated customer
  //   try {
  //     await updatedCustomer.generateEmbedding();
  //   } catch (error) {
  //     console.error('Error generating embedding for customer:', error);
  //   }

  res.status(201).json({
    success: true,
    message: 'Customer deactivated successfully',
    data: {
      customer: updatedCustomer,
    },
  });
});

// router for fetching all mails of a customer
// router.get('/mails/:customerId', async (req, res) => {
//   try {
//     const customerId = req.params.customerId;
//     const mails = await MailRecord.find({ customer: customerId }).sort({
//       createdAt: -1,
//     });
//     res.json(mails);
//   } catch (error) {
//     console.error('Error fetching mails:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

const translateAddress = asyncHandler(async (req, res) => {
  const { billingAddress } = req.body;

  if (!billingAddress) {
    throw new ValidationError('Billing address is required');
  }

  // Create object with fields to translate
  const fieldsToTranslate = {
    addressLine1: billingAddress.addressLine1 || '',
    addressLine2: billingAddress.addressLine2 || '',
    city: billingAddress.city || '',
    state: billingAddress.state || '',
    region: billingAddress.region || '',
    country: billingAddress.country || '',
  };

  // Build prompt with actual address values
  const prompt = `Translate these address fields to Arabic:
    Address Line 1: ${fieldsToTranslate.addressLine1}
    Address Line 2: ${fieldsToTranslate.addressLine2}
    City: ${fieldsToTranslate.city}
    State: ${fieldsToTranslate.state}
    Region: ${fieldsToTranslate.region}
    Country: ${fieldsToTranslate.country}
    
    Return only the translations in this exact JSON format:
    {"addressLine1": "...", "addressLine2": "...", "city": "...", "state": "...", "region": "...", "country": "..."}`;

  // Call OpenAI API
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );

  const { data } = response;

  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from OpenAI API');
  }

  const translatedFields = JSON.parse(data.choices[0].message.content);

  // Construct response maintaining the same interface
  const translatedAddress = {
    attention: billingAddress.attention,
    country: translatedFields.country,
    region: translatedFields.region,
    addressLine1: translatedFields.addressLine1,
    addressLine2: translatedFields.addressLine2,
    city: translatedFields.city,
    state: translatedFields.state,
    postalCode: billingAddress.postalCode,
    phone: billingAddress.phone,
    faxNumber: billingAddress.faxNumber,
    department: billingAddress.department,
    designation: billingAddress.designation,
  };

  res.status(200).json({
    success: true,
    message: 'Address translated successfully',
    data: translatedAddress,
  });
});

const getCustomerName = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const customerName = await Customer.find({
    organization: orgid,
  }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    message: 'Customer name fetched successfully',
    data: customerName,
  });
});

module.exports = {
  createCustomer,
  getCustomers,
  getCustomersWithoutPagination,
  getCustomerById,
  updateCustomer,
  deactivateCustomer,
  translateAddress,
  getCustomerName,
  userAssign,
  searchCustomers,
  getCustomersByAgent,
  getCustomersForExport,
  getCustomersForSelect,
  getCustomersForSelectByAgent,
  getCustomersWithPagination,
  getCustomersByAgentWithPagination,
  createLeads,
  createCRMContact,
};
