const mongoose = require("mongoose");

const classificationSchema = new mongoose.Schema({
  result: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now, // automatically store the current time
  },
});

module.exports = mongoose.model("Classification", classificationSchema);
