const taskEvents = require('./events');

// Register listener for task-created event
taskEvents.on('task-created', (task) => {
    // Artificial delay to demonstrate asynchronous non-blocking event handling
    setTimeout(() => {
        console.log(`[Notification] Task "${task.title}" created at ${new Date().toISOString()}`);
    }, 500);
});

module.exports = taskEvents;
