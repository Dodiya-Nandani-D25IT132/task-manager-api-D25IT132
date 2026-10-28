const validateRegister = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            error: "Password must be at least 6 characters long"
        });
    }

    next();
};


const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required"
        });
    }

    next();
};


const validateTask = (req, res, next) => {
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({
            error: "Task title is required"
        });
    }

    next();
};


module.exports = {
    validateRegister,
    validateLogin,
    validateTask
};