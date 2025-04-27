const mongoose = require("mongoose");
const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ["farmer", "consumer"], default: "consumer" },
   
    farmInfo: {
        farmName: String,
        products: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        }],
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
  },
  {
    versionKey: false,
  }
);

const UserModel = mongoose.model("user", userSchema);

module.exports = { UserModel };