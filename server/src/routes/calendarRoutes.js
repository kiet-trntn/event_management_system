const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
    exportEventsCalendar,
    exportMyTasksCalendar
} = require("../controllers/calendarController");

// Xuất lịch sự kiện
router.get(
    "/events.ics",
    authMiddleware,
    exportEventsCalendar
);

// Xuất lịch task của tôi
router.get(
    "/my-tasks.ics",
    authMiddleware,
    exportMyTasksCalendar
);

module.exports = router;