const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String
    },

    completed: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    }
});

module.exports = mongoose.model("Task", taskSchema);