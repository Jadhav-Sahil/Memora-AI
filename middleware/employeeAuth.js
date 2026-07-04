const Employee = require("../models/employee");

const employeeAuth = async (req, res, next) => {
    try {

        if (!req.session || !req.session.employeeId) {
            req.flash("error", "Please login to continue.");
            return res.redirect("/signup-employee");
        }

        const employee = await Employee.findById(req.session.employeeId);

        if (!employee) {
            delete req.session.employeeId;
            delete req.session.companyId;
            delete req.session.role;
            req.flash("error", "Employee account not found.");
            return res.redirect("/signup-employee");
        }

        if (!employee.isActive) {
            delete req.session.employeeId;
            delete req.session.companyId;
            delete req.session.role;
            req.flash("error", "Your account has been deactivated. Please contact your administrator.");
            return res.redirect("/signup-employee");
        }

        req.employee = employee;
        res.locals.employee = employee;

        next();

    } catch (err) {
        next(err);
    }
};

module.exports = employeeAuth;