const router = require("express").Router();
const Department = require("../../models/user-management/Department");
const Agent = require("../../models/Agent");
const Organization = require("../../models/user-management/Organization");
const Company = require("../../models/Company");
const Employee = require("../../models/Employee");
const EmployeeDepartment = require("../../models/HRM/EmployeeDepartment");
const WebAttendance = require("../../models/HRM/WebAttendance");
const CRMCustomer = require("../../models/crm/CRMCustomer");
const Leads = require("../../models/crm/Leads");
const Product = require("../../models/Product");
const Category = require("../../models/Category");
const Invoice = require("../../models/Sales/Invoice");
const Customer = require("../../models/Sales/Customer");
const Proposal = require("../../models/Sales/Proposal");
const Quote = require("../../models/Sales/Quote");
const Account = require("../../models/accounts/Account");
const POSOrders = require("../../models/pos/POSOrders");

const SalesOrder = require("../../models/Sales/SalesOrder");
const RecruitmentForm = require("../../models/recruit/RecruitmentForm");
const RecruitmentResponse = require("../../models/recruit/RecruitmentResponse");
const Project = require("../../models/Projects/Project");
const PurchaseQuotation = require("../../models/Purchases/PurchaseQuotation");
const Vendors = require("../../models/Purchases/Vendors");
const mongoose = require("mongoose");

router.get("/modules", async (req, res) => {
  try {
    const company = await Company.findById(req.company).populate(
      "activeModules",
      ["name"]
    );
    res.status(200).json(company.activeModules);
  } catch (error) {
    console.log(error);
    res.status(500).json(error);
  }
});

router.get("/:companyId", async (req, res) => {
  try {
    const { companyId } = req.params;
    const company = await Company.findById(companyId)
      // .populate("organization")
      // .populate("modules")
      .select("organization activeModules");

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const orgids = company.organization.map((org) => org._id);
    const activeUser = await Agent.countDocuments({
      organization: { $in: orgids },
      deactivated: false,
    });

    const totalUser = await Agent.countDocuments({
      organization: { $in: orgids },
    });

    res.status(200).json({
      activeUser: activeUser || 0,
      totalUser: totalUser || 0,
      activeModules: company.activeModules || [],
    });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

router.get("/hrm/:orgid", async (req, res) => {
  try {
    const { orgid } = req.params;
    const totalEmployee = await Employee.countDocuments({
      organization: orgid,
      isActivated: true,
    });

    const departments = await EmployeeDepartment.find({
      organization: orgid,
    }).lean();

    const deptIds = departments.map((dt) => dt._id.toString());
    const employeeCounts = await Employee.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          isActivated: true,
          department: {
            $in: deptIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      {
        $group: {
          _id: "$department",
          employeeCount: { $sum: 1 },
        },
      },
    ]);

    const departmentData = departments.map((dept) => {
      const found = employeeCounts.find(
        (ec) => ec._id.toString() === dept._id.toString()
      );
      return {
        _id: dept._id,
        label: dept.name,
        value: found ? found.employeeCount : 0,
      };
    });

    //attendance rate
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const endOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    );

    const presentAttendance = await WebAttendance.countDocuments({
      organization: orgid,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const totalPossible = totalEmployee * 25;

    const overallRate = (presentAttendance / totalPossible) * 100;

    //attendance trend
    const attendanceTrendAgg = await WebAttendance.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          date: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$date" } },
          attendedDays: { $sum: 1 },
        },
      },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const attendancemonthwise = {};
    monthNames.forEach((m, i) => {
      const found = attendanceTrendAgg.find((x) => x._id.month === i + 1);
      const attended = found ? found.attendedDays : 0;
      const totalPossible = totalEmployee * 25;
      attendancemonthwise[m] =
        totalPossible > 0 ? Math.round((attended / totalPossible) * 100) : 0;
    });

    res.status(200).json({
      totalEmployee: totalEmployee || 0,
      departmentData: departmentData || [],
      overallRate: overallRate.toFixed(2) || 0 + "%",
      attendancemonthwise: attendancemonthwise || 0,
    });
  } catch (error) {
    console.log("Error in hrm", error);
    res.status(500).json("Internal Error");
  }
});

router.get("/finance/:orgid", async (req, res) => {
  try {
    const { orgid } = req.params;
    const accounts = await Account.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
        },
      },
      {
        $group: {
          _id: "$accountType",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    let revenue = 0;
    let expenses = 0;
    accounts.forEach((acc) => {
      if (["income", "otherincome", "indirectincome"].includes(acc._id)) {
        revenue += acc.totalAmount;
      }
      if (
        [
          "expense",
          "otherexpense",
          "indirectexpense",
          "costofgoodssold",
        ].includes(acc._id)
      ) {
        expenses += acc.totalAmount;
      }
    });

    const annualRevenue = revenue;
    const netProfit = revenue - expenses;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    //Trend
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const revenueTrends = await Account.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          accountType: { $in: ["income", "otherincome", "indirectincome"] },
          createdAt: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const expenseTrends = await Account.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          accountType: {
            $in: [
              "expense",
              "otherexpense",
              "indirectexpense",
              "costofgoodssold",
            ],
          },
          createdAt: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalAmount: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const revenuemonthwise = {};
    monthNames.forEach((m, i) => {
      const found = revenueTrends.find((x) => x._id === i + 1);
      revenuemonthwise[m] = found ? found.totalAmount : 0;
    });

    const expensemonthwise = {};
    monthNames.forEach((m, i) => {
      const found = expenseTrends.find((x) => x._id === i + 1);
      expensemonthwise[m] = found ? found.totalAmount : 0;
    });

    const netCashFlow = {};
    monthNames.forEach((m) => {
      const revenue = revenuemonthwise[m] || 0;
      const expense = expensemonthwise[m] || 0;
      netCashFlow[m] = revenue - expense;
    });

    res.status(200).json({
      annualRevenue: annualRevenue || 0,
      netProfit: netProfit.toFixed(2) || 0,
      profitMargin: profitMargin.toFixed(2) || 0,
      revenuemonthwise: revenuemonthwise || [],
      expensemonthwise: expensemonthwise || [],
      netCashFlow: netCashFlow || [],
    });
  } catch (error) {
    console.log("Error in hrm", error);
    res.status(500).json("Internal Error");
  }
});

router.get("/sales/:orgid", async (req, res) => {
  try {
    const { orgid } = req.params;
    const now = new Date();
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const endOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    );
    const monthlySales = await Invoice.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          valid: true,
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const thisMonthSales =
      monthlySales.length > 0 ? monthlySales[0].totalSales : 0;

    const targetAchivement = ((thisMonthSales / 500000) * 100).toFixed(2);

    const closeDeal = await Invoice.countDocuments({
      organization: new mongoose.Types.ObjectId(orgid),
      valid: true,
      approval: { $in: ["approved1", "approved2"] },
      status: "paid",
    });

    //sales Pipeline
    const prospects = await Customer.countDocuments({ organization: orgid });
    const proposals = await Proposal.countDocuments({ organization: orgid });
    const negotiations = await Quote.countDocuments({ organization: orgid });
    const closed = await Invoice.countDocuments({
      organization: orgid,
      valid: true,
      status: "paid",
    });

    const salespipe = {
      Prospects: prospects,
      Proposal: proposals,
      Negotiation: negotiations,
      Closed: closed,
    };

    res.status(200).json({
      monthlySales: monthlySales.length > 0 ? monthlySales[0].totalSales : 0,
      targetAchivement: targetAchivement,
      closeDeal: closeDeal || 0,
      salespipe: salespipe || [],
    });
  } catch (error) {
    console.log("Error in hrm", error);
    res.status(500).json("Internal Error");
  }
});

router.get("/crm/:orgid", async (req, res) => {
  try {
    const { orgid } = req.params;
    const totalCRMCustomer = await CRMCustomer.countDocuments({
      organization: orgid,
      isActivated: true,
    });
    //convertion rate
    const convertionRate = await Leads.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
        },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          totalLeads: { $sum: 1 },
          convertedLeads: {
            $sum: { $cond: [{ $eq: ["$isCustomer", true] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          month: "$_id.month",
          year: "$_id.year",
          totalLeads: 1,
          convertedLeads: 1,
          conversionRate: {
            $cond: [
              { $eq: ["$totalLeads", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$convertedLeads", "$totalLeads"] },
                  100,
                ],
              },
            ],
          },
        },
      },
      { $sort: { month: 1, year: 1 } },
    ]);

    //Lead Generation
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const monthlyLeads = await Leads.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          createdAt: { $gte: startOfYear, $lt: endOfYear },
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          total: { $sum: 1 },
        },
      },
    ]);

    const customers = await CRMCustomer.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          createdAt: { $gte: startOfYear, $lt: endOfYear },
          isActivated: true,
        },
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          total: { $sum: 1 },
        },
      },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const leadmonthwise = {};
    monthNames.forEach((m, i) => {
      const found = monthlyLeads.find((x) => x._id.month === i + 1);
      leadmonthwise[m] = found ? found.total : 0;
    });

    const customerWise = {};
    monthNames.forEach((m, i) => {
      const found = customers.find((x) => x._id.month === i + 1);
      customerWise[m] = found ? found.total : 0;
    });

    res.status(200).json({
      totalCRMCustomer: totalCRMCustomer || 0,
      convertionRate:
        convertionRate.length > 0 ? convertionRate[0].conversionRate : 0,
      leadmonthwise: leadmonthwise || [],
      customerWise: customerWise || [],
    });
  } catch (error) {
    console.log("Error in hrm", error);
    res.status(500).json("Internal Error");
  }
});

router.get("/inventory/:orgid", async (req, res) => {
  try {
    const { orgid } = req.params;
    const stockSummary = await Product.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
        },
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          stockValue: {
            $sum: {
              $multiply: ["$openingStock", "$openingStockRate"],
            },
          },
        },
      },
    ]);

    const lowStockCount = await Product.countDocuments({
      organization: orgid,
      $expr: { $lt: ["$stockOnHand", "$reorderPoint"] },
    });
    const stockValItems = stockSummary.length > 0 ? stockSummary[0] : [];

    //Stock Levels
    const StockLevelsRaw = await Product.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      {
        $group: {
          _id: "$categoryDetails.type",
          totalProducts: { $sum: 1 },
        },
      },
    ]);

    const stockLevel = StockLevelsRaw.reduce((acc, item) => {
      acc[item._id] = item.totalProducts;
      return acc;
    }, {});

    const categoryDis = StockLevelsRaw.map((item) => ({
      label: item._id,
      value: item.totalProducts,
    }));

    //categories wise
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    res.status(200).json({
      stockValItems: stockValItems || [],
      lowStockCount: lowStockCount || 0,
      stockLevel: stockLevel || [],
      categoryDis: categoryDis || [],
    });
  } catch (error) {
    console.log("Error in hrm", error);
    res.status(500).json("Internal Error");
  }
});

router.get("/pos/:orgid", async (req, res) => {
  try {
    const { orgid } = req.params;
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const dailyTransactions = await POSOrders.countDocuments({
      organization: new mongoose.Types.ObjectId(orgid),
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const dailyRevenue = await POSOrders.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const avgRevenue =
      (dailyRevenue.length > 0 ? dailyRevenue[0].totalRevenue : 0) /
      dailyTransactions;

    //  transaaction
    const transactionTrends = await POSOrders.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          createdAt: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const transactionmonthwise = {};
    monthNames.forEach((m, i) => {
      const found = transactionTrends.find((x) => x._id === i + 1);
      transactionmonthwise[m] = found ? found.totalAmount : 0;
    });

    const posOrdersPaymentMethod = await POSOrders.aggregate([
      {
        $match: { organization: new mongoose.Types.ObjectId(orgid) },
      },
      {
        $group: {
          _id: "$payment.method",
          count: { $sum: 1 },
        },
      },
    ]);

    const posOrderPaymentMonthWise = posOrdersPaymentMethod.map((item) => ({
      label: item._id,
      value: item.count,
    }));

    res.status(200).json({
      dailyRevenue: dailyRevenue.length > 0 ? dailyRevenue[0].totalRevenue : 0,
      avgRevenue: avgRevenue || 0,
      dailyTransactions: dailyTransactions || 0,
      transactionmonthwise: transactionmonthwise || [],
      posOrderPaymentMonthWise: posOrderPaymentMonthWise || [],
    });
  } catch (error) {
    console.log("Error in hrm", error);
    res.status(500).json("Internal Error");
  }
});

router.get("/recruit/:orgid", async (req, res) => {
  try {
    const { orgid } = req.params;
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59
    );
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const recruitForms = await RecruitmentForm.find({
      organization: orgid,
      isActive: true,
    });
    const recruitFormCounts = await RecruitmentForm.countDocuments({
      organization: orgid,
      isActive: true,
    });

    //submission
    const submission = await RecruitmentResponse.find({
      organization: orgid,
    }).populate([
      {
        path: "form",
        select: "roleName",
      },
    ]);

    const submissionCount = await RecruitmentResponse.countDocuments({
      organization: orgid,
    });

    const avgRateHire = await RecruitmentResponse.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          status: "offered",
        },
      },
      {
        $project: {
          createdAt: 1,
          updatedAt: 1,
          daysToHire: {
            $divide: [
              { $subtract: ["$updatedAt", "$createdAt"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      { $group: { _id: null, avarageHireDays: { $avg: "$daysToHire" } } },
    ]);

    //pipeline
    const statuses = [
      "applied",
      "screening",
      "interview",
      "offered",
      "rejected",
    ];

    let pipeline = await RecruitmentResponse.aggregate([
      { $match: { organization: new mongoose.Types.ObjectId(orgid) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          status: "$_id",
          count: 1,
        },
      },
    ]);

    const hirePipeline = statuses.reduce((acc, st) => {
      const found = pipeline.find((r) => r.status === st);
      acc[st.charAt(0).toUpperCase() + st.slice(1)] = found ? found.count : 0;
      return acc;
    }, {});

    //time to hire

    const responses = await RecruitmentResponse.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          createdAt: { $gte: startOfYear, $lte: endOfYear },
          status: "offered",
        },
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const timetohire = {};
    monthNames.forEach((m, i) => {
      const found = responses.find((x) => x._id === i + 1);
      timetohire[m] = found ? found.totalAmount : 0;
    });

    res.status(200).json({
      activeJobs: recruitFormCounts || 0,
      activeCandidate: submissionCount || 0,
      hirePipeline: hirePipeline || [],
      timetohire: timetohire || [],
      avgRateHire:
        avgRateHire.length > 0 ? avgRateHire[0].avarageHireDays.toFixed(1) : 0,
    });
  } catch (error) {
    console.log("Error in hrm", error);
    res.status(500).json("Internal Error");
  }
});

router.get("/procurment/:orgid", async (req, res) => {
  try {
    const { orgid } = req.params;
    const totalOrder = await PurchaseQuotation.countDocuments({
      organization: new mongoose.Types.ObjectId(orgid),
    });
    const totalvendors = await Vendors.countDocuments({
      organization: new mongoose.Types.ObjectId(orgid),
    });
    res.status(200).json({
      totalOrder: totalOrder || 0,
      totalvendors: totalvendors || 0,
    });
  } catch (error) {
    console.log("Error in hrm", error);
    res.status(500).json("Internal Error");
  }
});

router.get("/project/:orgid", async (req, res) => {
  try {
    const { orgid } = req.params;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const activeProjectAgg = await Project.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          status: { $in: ["InProgress", "Pending"] },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]);

    const avgandtotal = await Project.aggregate([
      {
        $match: {
          organization: new mongoose.Types.ObjectId(orgid),
          isDeleted: false,
        },
      },
      // Lookup targets to calculate "used" from targetBudget
      {
        $lookup: {
          from: "targets",
          localField: "target",
          foreignField: "_id",
          as: "targets",
        },
      },
      {
        $addFields: {
          usedAmount: { $sum: "$targets.targetBudget" }, // total used per project
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          budgetAmount: { $sum: "$budgetAmount" },
          avgCompletion: { $avg: "$progress" },
          usedAmount: { $sum: "$usedAmount" },
        },
      },
      {
        $addFields: {
          remainingAmount: { $subtract: ["$budgetAmount", "$usedAmount"] },
        },
      },
    ]);

    const result = activeProjectAgg.length > 0 ? activeProjectAgg[0] : null;
    const result2 = avgandtotal.length > 0 ? avgandtotal[0] : null;

    res.status(200).json({
      activeProject: result.count || 0,
      totalBudget: result2?.budgetAmount || 0,
      avgCompletion: result2?.avgCompletion
        ? Math.round(result2.avgCompletion).toFixed(2)
        : 0,
      budgetUsages: [
        { label: "Used", value: result2.usedAmount || 0 },
        { label: "Remaining", value: result2.remainingAmount || 0 },
      ],
    });
  } catch (error) {
    console.log("Error in hrm", error);
    res.status(500).json("Internal Error");
  }
});

module.exports = router;
