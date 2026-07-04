const express = require("express");
const router = express.Router();
const roleMiddleware = require("../middlewares/roleMiddleware");
const { checkTaskDeadlines } = require("../jobs/deadlineReminderJob");

const authMiddleware = require("../middlewares/authMiddleware");

const {
    getMyNotifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
} = require("../controllers/notificationController");

router.get(
    "/",
    authMiddleware,
    getMyNotifications
);

router.get(
    "/unread-count",
    authMiddleware,
    getUnreadNotificationCount
);

router.patch(
    "/read-all",
    authMiddleware,
    markAllNotificationsAsRead
);

router.patch(
    "/:id/read",
    authMiddleware,
    markNotificationAsRead
);

router.delete(
    "/:id",
    authMiddleware,
    deleteNotification
);

router.post(
    "/check-deadlines",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {
        await checkTaskDeadlines();

        res.json({
            message: "Đã kiểm tra deadline công việc"
        });
    }
);

module.exports = router;