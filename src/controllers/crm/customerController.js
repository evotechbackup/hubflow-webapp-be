const CRMCustomer = require('../../models/crm/CRMCustomer');
const CRMQuote = require('../../models/crm/CRMQuote');
const Customer = require('../../models/sales/Customer');
const Quote = require('../../models/sales/Quotes');

const { asyncHandler } = require('../../middleware/errorHandler');

const getCustomers = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const customers = await CRMCustomer.find({
    organization: orgid,
    isActivated: true,
  }).sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: 'Customers retrieved successfully',
    data: customers,
  });
});

const getcustomerbyid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customer = await CRMCustomer.findById(id);
  res.status(200).json({
    success: true,
    message: 'Customer retrieved successfully',
    data: customer,
  });
});

const deactivateCustomer = asyncHandler(async (req, res) => {
  const customerId = req.params.id;

  const existingCustomer = await CRMCustomer.findById(customerId);

  if (!existingCustomer) {
    throw new Error('Customer Not Found');
  }

  const updatedCustomer = await CRMCustomer.findByIdAndUpdate(
    customerId,
    { isActivated: !existingCustomer.isActivated },
    { new: true }
  );

  res.json({
    success: true,
    message: 'Customer deactivated successfully',
    customer: updatedCustomer,
  });
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customerId = req.params.id;
  const customerData = req.body;

  const updatedCustomer = await CRMCustomer.findByIdAndUpdate(
    customerId,
    customerData,
    { new: true }
  );

  res.json({
    success: true,
    message: 'Customer updated successfully',
    customer: updatedCustomer,
  });
});

const convertCustomer = asyncHandler(async (req, res) => {
  const session = await CRMCustomer.startSession();

  session.startTransaction();

  const { customerId } = req.body;
  const crmCustomer = await CRMCustomer.findById(customerId).session(session);

  if (!crmCustomer) {
    throw new Error('CRM Customer not found');
  }

  const salesCustomer = new Customer({
    ...crmCustomer.toObject(),
    _id: undefined,
    isActivated: true,
  });

  try {
    await salesCustomer.save({ session });

    // Generate embedding for the converted customer
    try {
      await salesCustomer.generateEmbedding();
    } catch (error) {
      console.error('Error generating embedding for customer:', error);
    }

    const quotes = await CRMQuote.find({ customer: customerId }).session(
      session
    );

    await Promise.all([
      // Convert quotes with updated customer reference
      Promise.all(
        quotes.map((quote) => {
          const quoteData = quote.toObject();

          // Remove mongoose-specific fields
          delete quoteData._id;
          delete quoteData.__v;
          delete quoteData.createdAt;
          delete quoteData.updatedAt;

          // Update customer reference to new sales customer
          quoteData.customer = salesCustomer._id;

          // Handle optional order field
          if (quoteData.order === undefined) {
            delete quoteData.order;
          }

          return new Quote(quoteData).save({ session });
        })
      ),
      quotes.length > 0
        ? CRMQuote.deleteMany({ customer: customerId }).session(session)
        : null,
      CRMCustomer.findByIdAndDelete(customerId).session(session),
    ]);

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: 'Customer converted successfully',
      salesCustomer,
    });
  } catch (error) {
    await session.abortTransaction();
    console.log('Customer conversion failed:', error);
    throw error;
  }
});

module.exports = {
  convertCustomer,
  updateCustomer,
  deactivateCustomer,
  getCustomers,
  getcustomerbyid,
};
