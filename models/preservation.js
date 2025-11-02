const mongoose = require("mongoose");

const preservationSchema = new mongoose.Schema({
  result: {
    type: String,
    required: true, 
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Preservation", preservationSchema);