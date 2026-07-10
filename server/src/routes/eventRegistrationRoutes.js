const express = require("express");
const router = express.Router();

const authMiddleware =
    require("../middlewares/authMiddleware");

const {
    getPublicEvent,
    registerForEvent,
    getEventRegistrations,
} = require("../controllers/eventRegistrationController");

/*
|--------------------------------------------------------------------------
| API công khai - không cần đăng nhập
|--------------------------------------------------------------------------
*/

// Xem thông tin sự kiện công khai
router.get(
    "/public/events/:eventId",
    getPublicEvent
);

// Khách đăng ký tham dự
router.post(
    "/public/events/:eventId/register",
    registerForEvent
);

/*
|--------------------------------------------------------------------------
| API quản lý - cần đăng nhập
|--------------------------------------------------------------------------
*/

// Admin hoặc Leader xem danh sách đăng ký
router.get(
    "/events/:eventId/registrations",
    authMiddleware,
    getEventRegistrations
);

module.exports = router;