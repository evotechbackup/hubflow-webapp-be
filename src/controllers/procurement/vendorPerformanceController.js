const Vendors = require('../../models/procurement/Vendor');
const RFQ = require('../../models/procurement/RFQ');
const RFP = require('../../models/procurement/RFP');
const PurchaseOrder = require('../../models/procurement/PurchaseOrder');
const PurchaseReceive = require('../../models/procurement/PurchaseReceive');
const Bills = require('../../models/procurement/Bills');
const mongoose = require('mongoose');
const Employee = require('../../models/hrm/Employee');
const { asyncHandler } = require('../../middleware/errorHandler');

const getVendorReports = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const { startDate, endDate } = req.query;
  const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));

  const vendorReports = await Vendors.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgId),
        isActivated: true,
      },
    },
    {
      $lookup: {
        from: 'rfqs',
        localField: '_id',
        foreignField: 'vendor',
        as: 'rfqs',
        pipeline: [
          {
            $match: {
              date: {
                $gt: start,
                $lt: end,
              },
              valid: true,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'purchaseorders',
        localField: '_id',
        foreignField: 'vendor',
        as: 'purchaseOrders',
        pipeline: [
          {
            $match: {
              date: {
                $gt: start,
                $lt: end,
              },
              valid: true,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'purchasereceiveds',
        localField: '_id',
        foreignField: 'vendor',
        as: 'purchaseReceives',
        pipeline: [
          {
            $match: {
              receivedDate: {
                $gt: start,
                $lt: end,
              },
              valid: true,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'bills',
        localField: '_id',
        foreignField: 'vendor',
        as: 'bills',
        pipeline: [
          {
            $match: {
              billDate: {
                $gt: start,
                $lt: end,
              },
              valid: true,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'paymentmades',
        localField: '_id',
        foreignField: 'vendor',
        as: 'paymentMade',
        pipeline: [
          {
            $match: {
              paymentDate: {
                $gt: start,
                $lt: end,
              },
              valid: true,
            },
          },
        ],
      },
    },
    {
      $project: {
        vendorId: '$_id',
        vendorName: '$displayName',
        currency: 1,
        isActivated: 1,
        rfqCount: {
          $size: '$rfqs',
        },
        purchaseOrderCount: {
          $size: '$purchaseOrders',
        },
        purchaseReceiveCount: {
          $size: '$purchaseReceives',
        },
        billCount: {
          $size: '$bills',
        },
        paymentCount: {
          $size: '$paymentMade',
        },
        totalBusiness: {
          $sum: '$paymentMade.amountPaid',
        },
      },
    },
  ]);

  vendorReports.forEach((report) => {
    report.performancePoints =
      report.rfqCount * 5 +
      report.purchaseOrderCount * 10 +
      report.purchaseReceiveCount * 15 +
      report.billCount * 20 +
      report.paymentCount * 25;
  });

  const totalPerformancePoints = vendorReports.reduce(
    (total, report) => total + report.performancePoints,
    0
  );

  vendorReports.forEach((report) => {
    report.performancePercentage =
      totalPerformancePoints === 0
        ? 0
        : (report.performancePoints / totalPerformancePoints) * 100;
  });

  res.status(200).json({
    success: true,
    message: 'Vendor reports fetched successfully',
    data: vendorReports,
  });
});

const getVendorAnalytics = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    startDate,
    endDate,
    vendor,
    vendor_tags,
    vendor_type,
    region,
    employee_department,
    employee_groups,
    employee_teams,
  } = req.body;

  let start;
  if (startDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  } else {
    const firstPO = await PurchaseOrder.findOne({ organization: orgid })
      .sort({ createdAt: 1 })
      .select('createdAt');
    start = new Date(firstPO?.createdAt || new Date());
    start.setHours(0, 0, 0, 0);
  }

  const end = new Date(endDate || new Date());
  end.setHours(23, 59, 59, 999);

  let filteredVendorIds = null;
  if (vendor_tags?.length || vendor_type?.length || region?.length) {
    const vendorFilter = { organization: new mongoose.Types.ObjectId(orgid) };
    if (vendor_tags?.length) vendorFilter.tags = { $in: vendor_tags };
    if (vendor_type?.length) vendorFilter.vendorType = { $in: vendor_type };
    if (region?.length) vendorFilter.region = { $in: region };

    filteredVendorIds = await Vendors.find(vendorFilter).distinct('_id');
  }

  let filteredEmpIds = null;
  if (
    employee_department?.length ||
    employee_groups?.length ||
    employee_teams?.length
  ) {
    const empFilter = { organization: new mongoose.Types.ObjectId(orgid) };
    if (employee_department?.length)
      empFilter.department = {
        $in: employee_department.map((d) => new mongoose.Types.ObjectId(d)),
      };
    if (employee_groups?.length)
      empFilter.employeeGroup = {
        $in: employee_groups.map((g) => new mongoose.Types.ObjectId(g)),
      };
    if (employee_teams?.length)
      empFilter.employeeTeam = { $in: employee_teams };

    filteredEmpIds = await Employee.find(empFilter).distinct('_id');
  }

  const getMatchCriteria = (ModelName) => {
    const base = {
      organization: new mongoose.Types.ObjectId(orgid),
      createdAt: { $gte: start, $lte: end },
    };

    if (vendor?.length && ModelName !== 'RFP' && ModelName !== 'RFQ') {
      base.vendor = {
        $in: vendor.map((id) => new mongoose.Types.ObjectId(id)),
      };
    } else if (
      filteredVendorIds?.length &&
      (ModelName === 'RFP' || ModelName === 'RFQ')
    ) {
      base.vendor = { $in: filteredVendorIds };
    }

    if (
      filteredEmpIds?.length &&
      (ModelName === 'RFP' || ModelName === 'RFQ')
    ) {
      base.employee = { $in: filteredEmpIds };
    }

    return base;
  };

  const getMonthlyCount = async (Model, matchCriteria) => {
    const result = await Model.aggregate([
      { $match: matchCriteria },
      {
        $addFields: {
          month: {
            $dateToString: {
              format: '%Y-%m',
              date: { $ifNull: ['$createdAt', '$date'] },
            },
          },
        },
      },
      { $group: { _id: '$month', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return Object.fromEntries(result.map((r) => [r._id, r.count]));
  };

  const [rfp, rfq, purchaseOrder, purchaseReceive, bills] = await Promise.all([
    getMonthlyCount(RFP, getMatchCriteria('RFP')),
    getMonthlyCount(RFQ, getMatchCriteria('RFQ')),
    getMonthlyCount(PurchaseOrder, getMatchCriteria('PurchaseOrder')),
    getMonthlyCount(PurchaseReceive, getMatchCriteria('PurchaseReceive')),
    getMonthlyCount(Bills, getMatchCriteria('Bills')),
  ]);

  const monthLabels = [];
  const current = new Date(start);
  while (current <= end) {
    monthLabels.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(
        2,
        '0'
      )}`
    );
    current.setMonth(current.getMonth() + 1);
  }

  const monthlyData = monthLabels.map((month) => ({
    month,
    rfpCount: rfp[month] || 0,
    rfqCount: rfq[month] || 0,
    purchaseOrderCount: purchaseOrder[month] || 0,
    purchaseReceiveCount: purchaseReceive[month] || 0,
    billCount: bills[month] || 0,
    totalDocuments:
      (rfp[month] || 0) +
      (rfq[month] || 0) +
      (purchaseOrder[month] || 0) +
      (purchaseReceive[month] || 0) +
      (bills[month] || 0),
  }));

  const summary = {
    totalRFP: Object.values(rfp).reduce((a, b) => a + b, 0),
    totalRFQ: Object.values(rfq).reduce((a, b) => a + b, 0),
    totalPurchaseOrder: Object.values(purchaseOrder).reduce((a, b) => a + b, 0),
    totalPurchaseReceive: Object.values(purchaseReceive).reduce(
      (a, b) => a + b,
      0
    ),
    totalBills: Object.values(bills).reduce((a, b) => a + b, 0),
  };
  summary.grandTotal =
    summary.totalRFP +
    summary.totalRFQ +
    summary.totalPurchaseOrder +
    summary.totalPurchaseReceive +
    summary.totalBills;

  res.status(200).json({
    success: true,
    message: 'Vendor analytics fetched successfully',
    data: { monthlyData, summary },
  });
});

module.exports = {
  getVendorReports,
  getVendorAnalytics,
};
