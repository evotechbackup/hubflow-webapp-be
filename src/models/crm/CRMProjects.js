const mongoose = require('mongoose');

const CRMProjectsSchema = new mongoose.Schema(
  {
    project: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  { timestamps: true }
);

CRMProjectsSchema.index({
  organization: 1,
});

module.exports = mongoose.model('CRMProjects', CRMProjectsSchema);
