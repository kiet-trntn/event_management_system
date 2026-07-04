const express = require("express");
const router = express.Router();
const roleMiddleware = require("../middlewares/roleMiddleware");
const { checkTaskDeadlines } = require("../jobs/deadlineReminderJob");
const sendEmail = require("../utils/sendEmail");


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

router.post(
    "/test-email",
    authMiddleware,
    roleMiddleware("admin"),
    async (req, res) => {
        try {

            await sendEmail({
                to: req.user.email,
                subject: "Test Gmail từ hệ thống quản lý sự kiện",
                text: "Gửi email thành công",
                html: `
                    <h2>Gửi email thành công</h2>
                    <p>Hệ thống đã gửi email test qua Gmail SMTP.</p>
                `
            });

            res.json({
                message: "Gửi email test thành công"
            });

        } catch (error) {

            console.log(error);

            res.status(500).json({
                message: error.message
            });

        }
    }
);

module.exports = router;