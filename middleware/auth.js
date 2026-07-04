const Company = require("../models/company");
const ExpressError = require("../utils/ExpressError");
const wrapAsync = require("../utils/wrapAsync");

module.exports.isLoggedIn = wrapAsync(async (req, res, next) => {

    if (!req.session) {
        throw new ExpressError(
            "Session not found. Please login again.",
            401
        );
    }

    if (!req.session.companyId) {

        req.session.redirectUrl = req.originalUrl;

        req.flash(
            "error",
            "Please login to continue."
        );

        return res.redirect("/login");
    }

    const company = await Company.findById(
        req.session.companyId
    ).select("_id");

    if (!company) {

        req.session.destroy(() => { });

        throw new ExpressError(
            "Account not found. Please login again.",
            401
        );
    }

    res.locals.currentCompany = company;

    next();
});