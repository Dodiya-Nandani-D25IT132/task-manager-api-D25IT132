const express = require("express");
const app = express();
const PORT = 5000;
app.use(express.json());

// Logging Middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toLocaleString()}`);
    next();
});

// In-memory Task Array
let tasks = [
    { id: 1, title: "Complete Practical 4" },
    { id: 2, title: "Submit GitHub Repository" }
];

// GET
app.get("/tasks", (req, res) => {
    res.status(200).json(tasks);
});

// POST
app.post("/tasks", (req, res) => {

    const task = {
        id: tasks.length + 1,
        title: req.body.title
    };

    tasks.push(task);
    res.status(201).json(task);
});

// PUT
app.put("/tasks/:id", (req, res) => {

    const id = parseInt(req.params.id);
    const task = tasks.find(t => t.id === id);
    if (!task) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    task.title = req.body.title;
    res.status(200).json(task);
});

// DELETE
app.delete("/tasks/:id", (req, res) => {

    const id = parseInt(req.params.id);
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    tasks.splice(index,1);
    res.status(200).json({
        message:"Task Deleted Successfully"
    });

});

// Global Error Handler
app.use((err, req, res, next) => {

    console.error(err.stack);
    res.status(500).json({
        error:"Something went wrong"
    });

});

app.listen(PORT, () => {
    console.log(`Server Running on Port ${PORT}`);
});