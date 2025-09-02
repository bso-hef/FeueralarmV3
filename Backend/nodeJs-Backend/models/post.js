const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const postSchema = mongoose.Schema({
  alert: {type: mongoose.Schema.Types.ObjectId, ref: "Alert", required: true},
  class: {
    type: Object,
    number: {type: String, required: true},
    name: {type: String, required: true}
  },
  teachers: [{type: String, required: true}],
  rooms: [{
    number: {type: String, required: true},
    name: {type: String, required: true}
  }],  
  comment: {type: String},  
  start: {type: Number},
  end: {type: Number},
  day: {type: Number},
  status: {type:String},
  created: {type: Date, default: Date.now},
  updated: {type: Date, default: Date.now}
});

postSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Post", postSchema);
