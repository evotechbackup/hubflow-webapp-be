const mongoose = require("mongoose");

const SheetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    index: { type: mongoose.Schema.Types.Mixed },
    order: { type: Number },
    status: { type: Number },
    row: { type: Number },
    column: { type: Number },

    celldata: { type: Array, default: [] },
    config: { type: Object, default: {} },

    color: { type: String, default: "" },
    pivotTable: { type: Object, default: null },
    isPivotTable: { type: Boolean, default: false },
    frozen: { type: Object, default: {} },
    zoomRatio: { type: Number, default: 1 },

    visibledatarow: { type: Array, default: [] },
    visibledatacolumn: { type: Array, default: [] },
    ch_width: { type: Number, default: 0 },
    rh_height: { type: Number, default: 0 },

    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExcelFile",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sheet", SheetSchema);
