const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const Task = require("./models/Task");

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 5000;

// ===============================
// Middleware
// ===============================

// Request Logging Middleware
app.use((req, res, next) => {
    console.log(
        `${req.method} ${req.url} - ${new Date().toISOString()}`
    );
    next();
});

// ===============================
// GET ALL TASKS
// ===============================

app.get("/tasks", async (req, res, next) => {
    try {
        const tasks = await Task.find();

        res.status(200).json(tasks);
    } catch (error) {
        next(error);
    }
});

// ===============================
// GET TASK BY ID
// ===============================

app.get("/tasks/:id", async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.status(200).json(task);
    } catch (error) {
        next(error);
    }
});

// ===============================
// CREATE TASK
// ===============================

app.post("/tasks", async (req, res, next) => {
    try {
        const task = await Task.create(req.body);

        res.status(201).json(task);
    } catch (error) {
        next(error);
    }
});

// ===============================
// UPDATE TASK
// ===============================

app.put("/tasks/:id", async (req, res, next) => {
    try {
        const task = await Task.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.status(200).json(task);
    } catch (error) {
        next(error);
    }
});

// ===============================
// DELETE TASK
// ===============================

app.delete("/tasks/:id", async (req, res, next) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        res.status(200).json({
            message: "Task deleted successfully",
            task: task
        });
    } catch (error) {
        next(error);
    }
});

// ===============================
// 404 ROUTE
// ===============================

app.use((req, res) => {
    res.status(404).json({
        error: "Route not found"
    });
});

// ===============================
// GLOBAL ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {
    console.error(err);

    // Mongoose validation error
    if (err.name === "ValidationError") {
        return res.status(400).json({
            error: "Validation failed",
            details: Object.values(err.errors).map(
                (error) => error.message
            )
        });
    }

    // Invalid MongoDB ObjectId
    if (err.name === "CastError") {
        return res.status(400).json({
            error: "Invalid task ID"
        });
    }

    res.status(500).json({
        error: "Something went wrong"
    });
});

// ===============================
// MongoDB Connection
// ===============================

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
    });