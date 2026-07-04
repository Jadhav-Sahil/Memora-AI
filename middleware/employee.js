//deactivated empolyee not log in
const bcrypt = require("bcrypt");
const Employee = require("../models/employee");

const employeeAuth = async (req, res, next) => {

    // Logged-in user protection
    if (req.session.employeeId) {

        const employee = await Employee.findById(req.session.employeeId);

        if (!employee || !employee.isActive) {

            req.session.destroy((err) => {
                if (err) return next(err);

                return res.redirect("/login");
            });

            return;
        }

        req.employee = employee;
        return next();
    }

    // Login validation
    const { email, password } = req.body;

    const employee = await Employee.findOne({
        email: email.trim().toLowerCase()
    });

    if (!employee) {
        req.flash("error", "Invalid email or password");
        return res.redirect("/signup-employee");
    }

    if (!employee.isActive) {
        req.flash("error", "Your account has been deactivated");
        return res.redirect("/signup-employee");
    }

    const isMatch = await bcrypt.compare(
        password,
        employee.password
    );

    if (!isMatch) {
        req.flash("error", "Invalid email or password");
        return res.redirect("/signup-employee");
    }

    req.employee = employee;
    next();
};

module.exports = employeeAuth;