const { default: mongoose } = require('mongoose');
const ApprovalManagement = require('../models/approvals/ApprovalManagement');
const Roles = require('../models/auth/Roles');
// const TaskNotification = require('../models/TaskNotification');
// const {
//   sendApprovalNotification,
//   sendApprovalFinalNotification,
// } = require('../controller/Notifier');
// const { default: mongoose } = require('mongoose');

const approvalOrder = {
  pending: 0,
  reviewed: 1,
  verified: 2,
  acknowledged: 3,
  approved1: 4,
  approved2: 5,
};

// Cache for approval settings to reduce database queries
const approvalSettingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get approval settings from cache or database
 * @param {string} organization - Organization ID
 * @returns {Promise<Object|null>} Approval settings
 */
async function getApprovalSettings(organization) {
  const cacheKey = `approval_${organization}`;
  const cachedSettings = approvalSettingsCache.get(cacheKey);

  if (cachedSettings && cachedSettings.timestamp > Date.now() - CACHE_TTL) {
    console.log('Using cached approval settings');
    return cachedSettings.data;
  }

  const settings = await ApprovalManagement.findOne({ organization });
  if (settings) {
    approvalSettingsCache.set(cacheKey, {
      data: settings,
      timestamp: Date.now(),
    });
  }

  return settings;
}

/**
 * Create notifications for agents
 * @param {Array} agents - List of agents to notify
 * @param {Object} params - Notification parameters
 */
async function createNotifications(
  agents,
  { documentPrefix, documentId = '', field_route = '', fieldId = '' },
  finalNotification = false
) {
  const notifications = agents.map((agent) => ({
    type: 'approval',
    approval: `${documentPrefix} #${documentId}`,
    receiver: agent._id,
    date: new Date(),
    extraData: {
      field_route,
      fieldId,
    },
  }));

  // Batch insert notifications
  // await TaskNotification.insertMany(notifications);

  // Send email notifications in parallel
  // await Promise.all(
  //   agents.map((agent) =>
  //     finalNotification
  //       ? sendApprovalFinalNotification(
  //           documentPrefix,
  //           documentId,
  //           agent.email
  //         ).catch((error) =>
  //           console.error(`Failed to send email to ${agent.email}:`, error)
  //         )
  //       : sendApprovalNotification(
  //           documentPrefix,
  //           documentId,
  //           agent.email
  //         ).catch((error) =>
  //           console.error(`Failed to send email to ${agent.email}:`, error)
  //         )
  //   )
  // );
}

/**
 * Finds the next approval level and sends notifications to relevant agents
 * @param {string|Object} featureOrParams - Either feature name or params object
 * @param {string} [currentApproval] - Current approval status
 * @param {string} [organization] - Organization ID
 * @param {string} [company] - Company ID
 * @param {string} [documentId] - Document ID
 * @param {string} [documentPrefix] - Document prefix
 * @param {string} [field] - Field name
 * @param {string} [fieldId] - Field ID
 * @returns {Promise<string|null>} - Returns the next approval level or null if no next level
 */
async function findNextApprovalLevelAndNotify(
  featureOrParams,
  currentApproval,
  organization,
  company,
  documentId = '',
  documentPrefix,
  field_route,
  fieldId
) {
  // Handle both parameter styles
  let params;
  if (typeof featureOrParams === 'object' && featureOrParams !== null) {
    params = featureOrParams;
  } else {
    params = {
      feature: featureOrParams,
      currentApproval,
      organization,
      company,
      documentId,
      documentPrefix,
      field_route,
      fieldId,
    };
  }

  if (
    !params.feature ||
    !params.currentApproval ||
    !params.organization ||
    !params.company ||
    !params.documentPrefix
  ) {
    console.error('Missing required parameters:', {
      feature: params.feature,
      currentApproval: params.currentApproval,
      organization: params.organization,
      company: params.company,
      documentId: params.documentId,
      documentPrefix: params.documentPrefix,
    });
    return null;
  }

  if (
    params.currentApproval === 'correction' ||
    params.currentApproval === 'rejected'
  ) {
    return null;
  }

  try {
    // Get approval settings from cache or database
    const approvalManagement = await getApprovalSettings(params.organization);
    if (!approvalManagement) {
      console.error(
        'No approval management found for organization:',
        params.organization
      );
      return null;
    }

    // Find feature-specific approval settings
    const featureLower = params.feature.toLowerCase();
    const featureApproval = approvalManagement.approval.find(
      (approval) => approval.feature === featureLower
    );

    if (!featureApproval) {
      console.error('No approval settings found for feature:', params.feature);
      return null;
    }

    let finalNotification = false;

    // check if any of the approval levels are true
    if (
      featureApproval.reviewed ||
      featureApproval.verified ||
      featureApproval.acknowledged ||
      featureApproval.approved1 ||
      featureApproval.approved2
    ) {
      finalNotification = true;
    }

    // Create approval levels map based on feature settings
    const approvalAllowed = {
      reviewed: featureApproval.reviewed ? 1 : 0,
      verified: featureApproval.verified ? 2 : 0,
      acknowledged: featureApproval.acknowledged ? 3 : 0,
      approved1: featureApproval.approved1 ? 4 : 0,
      approved2: featureApproval.approved2 ? 5 : 0,
    };

    // Find next approval level
    const currentLevel = approvalOrder[params.currentApproval] || 0;
    const sortedNextLevels = Object.entries(approvalAllowed)
      .filter(([_, level]) => level > currentLevel)
      .sort(([_, a], [__, b]) => a - b);

    let nextApprovalQuery = {};

    const nextApprovalLevel = sortedNextLevels[0]?.[0];
    const secondNextApprovalLevel = sortedNextLevels[1]?.[0];
    if (secondNextApprovalLevel && nextApprovalLevel) {
      nextApprovalQuery = {
        'approval.feature': featureLower,
        $or: [
          { 'approval.allowed': nextApprovalLevel },
          { 'approval.allowed': secondNextApprovalLevel },
        ],
      };
    } else if (nextApprovalLevel) {
      nextApprovalQuery = {
        'approval.feature': featureLower,
        'approval.allowed': nextApprovalLevel,
      };
    }

    // check if any of the approvalAllowed after currentLevel are not 0
    if (finalNotification) {
      const anyNotZero = Object.values(approvalAllowed)
        .slice(currentLevel + 1)
        .some((level) => level !== 0);

      if (anyNotZero) {
        finalNotification = false;
      } else {
        finalNotification = true;
      }
    }

    if (finalNotification) {
      const roles = await Roles.aggregate([
        {
          $match: { company: new mongoose.Types.ObjectId(params.company) },
        },
        {
          $unwind: '$approval',
        },
        {
          $match: {
            'approval.feature': featureLower,
            'approval.notification': true,
          },
        },
        {
          $lookup: {
            from: 'users',
            let: { roleName: '$name' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$role', '$$roleName'] },
                },
              },
              {
                $project: {
                  _id: 1,
                  email: 1,
                },
              },
            ],
            as: 'users',
          },
        },
        {
          $unwind: '$users',
        },
        {
          $replaceRoot: { newRoot: '$users' },
        },
      ]);

      if (roles.length > 0) {
        await createNotifications(
          roles,
          {
            documentPrefix: params.documentPrefix,
            documentId: params.documentId,
            field_route: params.field_route,
            fieldId: params.fieldId,
          },
          true
        );
      }
    }

    if (!nextApprovalLevel) {
      return null;
    }

    // Find roles and agents in a single aggregation pipeline
    const roles = await Roles.aggregate([
      {
        $match: { company: new mongoose.Types.ObjectId(params.company) },
      },
      {
        $unwind: '$approval',
      },
      {
        $match: nextApprovalQuery,
      },
      {
        $lookup: {
          from: 'users',
          let: { roleName: '$name' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$role', '$$roleName'] },
              },
            },
            {
              $project: {
                _id: 1,
                email: 1,
              },
            },
          ],
          as: 'users',
        },
      },
      {
        $unwind: '$users',
      },
      {
        $replaceRoot: { newRoot: '$users' },
      },
    ]);

    if (roles.length > 0) {
      await createNotifications(
        roles,
        {
          documentPrefix: params.documentPrefix,
          documentId: params.documentId,
          field_route: params.field_route,
          fieldId: params.fieldId,
        },
        false
      );
    }

    return nextApprovalLevel;
  } catch (error) {
    console.error('Error in findNextApprovalLevelAndNotify:', error);
    throw error;
  }
}

async function ifHasApproval(feature, organization) {
  const approvalManagement = await ApprovalManagement.findOne({
    organization,
  });

  if (!approvalManagement || !approvalManagement.approval) {
    console.log('No approval management found for organization:', organization);
    return false;
  }

  const featureLower = feature.toLowerCase();

  const featureApproval = approvalManagement.approval.find(
    (approval) => approval.feature === featureLower
  );

  if (!featureApproval) {
    console.log('No approval settings found for feature:', feature);
    return false;
  }

  if (
    featureApproval.reviewed ||
    featureApproval.verified ||
    featureApproval.acknowledged ||
    featureApproval.approved1 ||
    featureApproval.approved2
  ) {
    return true;
  }

  return false;
}

module.exports = {
  findNextApprovalLevelAndNotify,
  approvalOrder,
  ifHasApproval,
};
