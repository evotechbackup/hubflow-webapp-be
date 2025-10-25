const User = require('../../models/auth/User');
const Vendor = require('../../models/procurement/Vendor');
// const MailRecord = require('../../models/MailRecord');
const { default: mongoose } = require('mongoose');
// const VendorAuth = require('../../models/Purchases/VendorAuth');
const Account = require('../../models/accounts/Account');

const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const getVendors = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    search,
    filter_status = 'true',
    filter_vendorType,
    filter_vendorSubType,
    page,
    limit,
  } = req.query;
  const filter = {
    organization: orgid,
  };
  if (filter_status !== undefined) {
    filter.isActivated = filter_status === 'true';
  }
  if (search && search !== '' && search !== undefined) {
    filter.displayName = { $regex: new RegExp(search, 'i') };
  }
  if (
    filter_vendorType !== '' &&
    filter_vendorType !== null &&
    filter_vendorType !== undefined
  ) {
    filter.vendorType = filter_vendorType;
  }
  if (
    filter_vendorSubType !== '' &&
    filter_vendorSubType !== null &&
    filter_vendorSubType !== undefined
  ) {
    filter.vendorSubType = filter_vendorSubType;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { createdAt: -1 },
    select: '-embedding',
  };

  let vendor;

  if (page !== 'undefined' && limit !== 'undefined') {
    vendor = await Vendor.paginate(filter, options);
  } else {
    vendor = await Vendor.find(filter)
      .select('-embedding')
      .sort({ createdAt: -1 });
  }
  res.status(200).json({
    success: true,
    message: 'Vendors fetched successfully',
    data: vendor,
  });
});

const searchVendor = asyncHandler(async (req, res) => {
  const searchQuery = req.query.search;
  const pipeline = [
    {
      $match: {
        $and: [
          {
            $or: [{ displayName: { $regex: searchQuery, $options: 'i' } }],
          },
          { organization: new mongoose.Types.ObjectId(req.params.orgid) },
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

  const vendor = await Vendor.aggregate(pipeline);

  res.json({
    success: true,
    message: 'Vendors fetched successfully',
    data: vendor,
  });
});

const getVendorByUser = asyncHandler(async (req, res) => {
  const {
    search,
    filter_status,
    filter_vendorType,
    filter_vendorSubType,
    page,
    limit,
  } = req.query;
  const filter = {
    user: req.id,
  };
  if (filter_status !== undefined) {
    filter.isActivated = filter_status === 'true';
  }
  if (search) {
    filter.displayName = { $regex: new RegExp(search, 'i') };
  }
  if (filter_vendorType !== '' && filter_vendorType !== null) {
    filter.vendorType = filter_vendorType;
  }
  if (filter_vendorSubType !== '' && filter_vendorSubType !== null) {
    filter.vendorSubType = filter_vendorSubType;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { createdAt: -1 },
    select: '-embedding',
  };

  let vendor;
  if (page !== 'undefined' && limit !== 'undefined') {
    vendor = await Vendor.paginate(filter, options);
  } else {
    vendor = await Vendor.find(filter)
      .select('-embedding')
      .sort({ createdAt: -1 });
  }
  res.status(200).json({
    success: true,
    message: 'Vendors fetched successfully',
    data: vendor,
  });
});

const exportVendor = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const filter = {
    organization: orgid,
    isActivated: true,
  };

  const vendors = await Vendor.find(filter)
    .select(
      'companyName displayName vendorID vendorType vendorSubType emailAddress currency vat cr contactNumbers billingAddress createdAt'
    )
    .sort({ createdAt: -1 });

  const formattedCustomers = vendors.map((vendor) => ({
    'Company Name': vendor.companyName || '',
    'Display Name': vendor.displayName || '',
    'Vendor ID': vendor.vendorID || '',
    'Vendor Type': vendor.vendorType || '',
    'Vendor Sub Type': vendor.vendorSubType || '',
    Email: vendor.emailAddress || '',
    Phone: vendor.contactNumbers?.workPhone || '',
    'VAT Number': vendor.vat || '',
    'CR Number': vendor.cr || '',
    Currency: vendor.currency || '',
    Country: vendor.billingAddress?.country || '',
  }));

  res.json({
    success: true,
    message: 'Vendors fetched successfully',
    data: formattedCustomers,
  });
});

const getVendorsForSelect = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const filter = {
    organization: orgid,
    isActivated: true,
  };

  const vendors = await Vendor.find(filter).select(
    'displayName currency contactPersons emailAddress'
  );
  res.json({
    success: true,
    message: 'Vendors fetched successfully',
    data: vendors,
  });
});

const getVendorsForSelectByUser = asyncHandler(async (req, res) => {
  const filter = {
    user: req.id,
    isActivated: true,
  };

  const vendors = await Vendor.find(filter).select(
    'displayName currency contactPersons emailAddress'
  );
  res.json({
    success: true,
    message: 'Vendors fetched successfully',
    data: vendors,
  });
});

const createVendor = asyncHandler(async (request, response) => {
  const vendor = request.body;
  const newVendor = new Vendor(vendor);
  await newVendor.save();

  // if (vendor.hasPortalAccess) {
  //   const vendorAuth = new VendorAuth({
  //     vendor: newVendor._id,
  //     username: vendor.username,
  //     password: vendor.password,
  //     company: vendor.company,
  //     organization: vendor.organization,
  //   });
  //   await vendorAuth.save();
  // }

  if (newVendor.user?.length > 0) {
    await User.updateMany(
      { _id: { $in: newVendor.user } },
      { $push: { vendor: newVendor._id } }
    );
  }

  // Generate embedding for the new vendor
  // try {
  //   await newVendor.generateEmbedding();
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  response.json({
    success: true,
    message: 'Vendor details submitted successfully',
    data: { vendor: newVendor },
  });
});

const getVendorById = asyncHandler(async (req, res) => {
  const vendorData = await Vendor.findById(req.params.id);
  if (!vendorData) {
    throw new NotFoundError('Vendor not found');
  }
  res.status(200).json({
    success: true,
    message: 'Vendor fetched successfully',
    data: vendorData,
  });
});

const userAssign = asyncHandler(async (req, res) => {
  const { vendorId, agentId } = req.body;
  const vendor = await Vendor.findOne({ _id: vendorId, user: agentId });
  if (vendor) {
    const updatedAgent = await User.findOneAndUpdate(
      { _id: agentId },
      { $pull: { vendor: vendorId } },
      { new: true }
    );

    await Vendor.findOneAndUpdate(
      { _id: vendorId },
      { $pull: { user: agentId } },
      { new: true }
    );

    // Generate embedding for the updated vendor
    // try {
    //   await updatedVendor.generateEmbedding();
    // } catch (error) {
    //   console.error('Error generating embedding for vendor:', error);
    // }

    res.status(201).json({
      success: true,
      message: 'Vendor updated successfully',
      data: updatedAgent,
    });
  } else {
    const updatedAgent = await User.findOneAndUpdate(
      { _id: agentId },
      { $push: { vendor: vendorId } },
      { new: true }
    );
    await Vendor.findOneAndUpdate(
      { _id: vendorId },
      { $push: { user: agentId } },
      { new: true }
    );

    // Generate embedding for the updated vendor
    // try {
    //   await updatedVendor.generateEmbedding();
    // } catch (error) {
    //   console.error('Error generating embedding for vendor:', error);
    // }

    res.status(201).json({
      success: true,
      message: 'Vendor updated successfully',
      data: updatedAgent,
    });
  }
});

const updateVendor = asyncHandler(async (req, res) => {
  const vendorId = req.params.id;
  const vendorData = req.body;

  const existingVendor = await Vendor.findById(vendorId);

  if (!existingVendor) {
    throw new NotFoundError('Vendor not found');
  }

  const updatedVendor = await Vendor.findByIdAndUpdate(vendorId, vendorData, {
    new: true,
  });

  // if (updatedVendor?.hasPortalAccess !== existingVendor?.hasPortalAccess) {
  //   if (updatedVendor?.hasPortalAccess) {
  //     const vendorAuth = await VendorAuth.findOne({ vendor: vendorId });
  //     if (vendorAuth) {
  //       vendorAuth.deactivated = false;
  //       await vendorAuth.save();
  //     } else {
  //       const vendorAuth = new VendorAuth({
  //         vendor: updatedVendor._id,
  //         username: vendorData.username,
  //         password: vendorData.password,
  //         company: updatedVendor.company,
  //         organization: updatedVendor.organization,
  //       });
  //       await vendorAuth.save();
  //     }
  //   } else {
  //     await VendorAuth.findOneAndUpdate(
  //       { vendor: updatedVendor._id },
  //       { deactivated: true }
  //     );
  //   }
  // }

  if (updatedVendor.displayName !== existingVendor.displayName) {
    const accountsPayable = await Account.findOne({
      accountName: existingVendor.displayName,
      organization: updatedVendor.organization,
    });
    if (accountsPayable) {
      accountsPayable.accountName = updatedVendor.displayName;
      await accountsPayable.save();
    }
  }

  // Generate embedding for the updated vendor
  // try {
  //   await updatedVendor.generateEmbedding();
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  return res.status(200).json({
    success: true,
    message: 'Vendor updated successfully',
    data: { vendor: updatedVendor },
  });
});

// New route to deactivate a vendor
const deactivateVendor = asyncHandler(async (req, res) => {
  const vendorId = req.params.id;
  const existingVendor = await Vendor.findById(vendorId);

  if (!existingVendor) {
    throw new NotFoundError('Vendor not found');
  }
  const updatedVendor = await Vendor.findByIdAndUpdate(
    vendorId,
    { isActivated: !existingVendor.isActivated },
    { new: true }
  );

  // Generate embedding for the updated vendor
  // try {
  //   await updatedVendor.generateEmbedding();
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  return res.status(200).json({
    success: true,
    message: 'Vendor deactivated successfully',
    data: { vendor: updatedVendor },
  });
});

// const getMailRecords = asyncHandler(async (req, res) => {
//   const vendorId = req.params.id;
//   const mailRecords = await MailRecord.find({ vendor: vendorId }).sort({
//     createdAt: -1,
//   });
//   res.json({
//     success: true,
//     message: 'Mail records fetched successfully',
//     data: mailRecords,
//   });
// });

const getVendorId = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  // get the last created vendor and return the vendorID
  const vendor = await Vendor.findOne({ organization: orgid }).sort({
    createdAt: -1,
  });

  if (!vendor || !vendor?.vendorID || vendor?.vendorID === '') {
    return res.status(200).json({
      success: true,
      message: 'Vendor ID fetched successfully',
      data: '',
    });
  }

  // incrementing the vendorID util last characters are digits like HSL-VN-00001 then HSL-VN-00002 or if MEC-001 then MEC-002
  const index = vendor.vendorID.search(/\d+$/);
  const lastChars = vendor.vendorID.slice(index);
  if (!isNaN(lastChars)) {
    const incrementedLastChars = (parseInt(lastChars) + 1)
      .toString()
      .padStart(lastChars.length, '0');
    const newVendorId = vendor.vendorID.slice(0, index) + incrementedLastChars;
    return res.status(200).json({
      success: true,
      message: 'Vendor ID fetched successfully',
      data: newVendorId,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Vendor ID fetched successfully',
    data: vendor.vendorID,
  });
});

const getAllVendor = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const vendors = await Vendor.find({ organization: orgid })
    .select('displayName')
    .sort({ createdAt: -1 })
    .lean();
  return res.status(200).json({
    success: true,
    message: 'Vendors fetched successfully',
    data: vendors,
  });
});

module.exports = {
  getVendors,
  searchVendor,
  getVendorByUser,
  exportVendor,
  getVendorsForSelect,
  getVendorsForSelectByUser,
  createVendor,
  getVendorById,
  userAssign,
  updateVendor,
  deactivateVendor,
  getVendorId,
  getAllVendor,
};
