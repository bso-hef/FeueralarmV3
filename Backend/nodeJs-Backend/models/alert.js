const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const alertSchema = mongoose.Schema({
    classCount: {type: Number},
    archived: {type: Boolean, default: false},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now}
});

alertSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Alert", alertSchema);