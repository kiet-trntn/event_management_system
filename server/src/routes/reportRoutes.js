const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
    getOverviewReport,
    getTaskReport,
    getEventReport,
    getSubmissionReport
} = require("../controllers/reportController");

router.get(
    "/overview",
    authMiddleware,
    getOverviewReport
);

router.get(
    "/tasks",
    authMiddleware,
    getTaskReport
);

router.get(
    "/events",
    authMiddleware,
    getEventReport
);

router.get(
    "/submissions",
    authMiddleware,
    getSubmissionReport
);

module.exports = router;