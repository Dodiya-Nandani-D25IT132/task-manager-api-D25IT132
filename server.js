const cors = require("cors");
const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Task = require("./models/Task");
const User = require("./models/User");

const {
    validateRegister,
    validateLogin,
    validateTask
} = require("./middleware/validation");

const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 60 });
const taskEvents = require("./listeners");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ===============================
// Request Logging Middleware
// ===============================

app.use((req, res, next) => {
    console.log(
        `${req.method} ${req.url} - ${new Date().toISOString()}`
    );
    next();
});

// ===============================
// JWT AUTHENTICATION MIDDLEWARE
// ===============================

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                error: "Authorization header missing"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                error: "Token missing"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            error: "Invalid or expired token"
        });
    }
};

// ===============================
// REGISTER
// ===============================

app.post("/register", validateRegister, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                error: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            email: email,
            password: hashedPassword
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                email: user.email
            }
        });

    } catch (err) {
        next(err);
    }
});

// ===============================
// LOGIN
// ===============================

app.post("/login", validateLogin, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token: token
        });

    } catch (err) {
        next(err);
    }
});

// ===============================
// GET ALL TASKS - PROTECTED (WITH IN-MEMORY CACHE)
// ===============================

app.get("/tasks", authenticateToken, async (req, res, next) => {
    try {
        const cachedTasks = cache.get("all_tasks");
        if (cachedTasks) {
            console.log("[CACHE HIT] Serving tasks from node-cache");
            return res.status(200).json(cachedTasks);
        }

        console.log("[CACHE MISS] Fetching tasks from MongoDB...");
        const tasks = await Task.find();
        cache.set("all_tasks", tasks);

        res.status(200).json(tasks);

    } catch (error) {
        next(error);
    }
});

// ===============================
// GET TASK BY ID - PROTECTED
// ===============================

app.get("/tasks/:id", authenticateToken, async (req, res, next) => {
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
// CREATE TASK - PROTECTED + VALIDATED (INVALIDATES CACHE)
// ===============================

app.post(
    "/tasks",
    authenticateToken,
    validateTask,
    async (req, res, next) => {
        try {
            const task = await Task.create(req.body);

            // Invalidate cached tasks list
            cache.del("all_tasks");
            console.log("[CACHE INVALIDATED] Removed 'all_tasks' key after task creation");

            // Respond immediately to the client
            console.log(`[API] Response sent at ${new Date().toISOString()}`);
            res.status(201).json(task);

            // Emit task-created event asynchronously to background listener
            taskEvents.emit("task-created", task);

        } catch (error) {
            next(error);
        }
    }
);

// ===============================
// UPDATE TASK - PROTECTED (INVALIDATES CACHE)
// ===============================

app.put("/tasks/:id", authenticateToken, async (req, res, next) => {
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

        // Invalidate cached tasks list
        cache.del("all_tasks");
        console.log("[CACHE INVALIDATED] Removed 'all_tasks' key after task update");

        res.status(200).json(task);

    } catch (error) {
        next(error);
    }
});

// ===============================
// DELETE TASK - PROTECTED (INVALIDATES CACHE)
// ===============================

app.delete("/tasks/:id", authenticateToken, async (req, res, next) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);

        if (!task) {
            return res.status(404).json({
                error: "Task not found"
            });
        }

        // Invalidate cached tasks list
        cache.del("all_tasks");
        console.log("[CACHE INVALIDATED] Removed 'all_tasks' key after task deletion");

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
// MONGODB CONNECTION
// ===============================

mongoose
    .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/taskmanager")
    .then(() => {
        console.log("MongoDB connected successfully");

        if (process.env.NODE_ENV !== "test") {
            app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        }
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
    });

module.exports = app;