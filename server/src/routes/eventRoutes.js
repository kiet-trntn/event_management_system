const express = require("express");
const router = express.Router();

const authMiddleware =
    require("../middlewares/authMiddleware");

const roleMiddleware =
    require("../middlewares/roleMiddleware");

const {
    publishEvent,
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent,
    deleteEvent,
    restoreEvent,
    cancelEvent,
    getTrashEvents,
    getLeaderEventsForCalendar,
    permanentDeleteEvent
} = require("../controllers/eventController");

/*
|--------------------------------------------------------------------------
| Các route cụ thể đặt trước /:id
|--------------------------------------------------------------------------
*/

// Lịch sự kiện do người đang đăng nhập phụ trách
router.get(
    "/leader-calendar",
    authMiddleware,
    getLeaderEventsForCalendar
);

// Admin xem thùng rác sự kiện
router.get(
    "/trash",
    authMiddleware,
    roleMiddleware("admin"),
    getTrashEvents
);

/*
|--------------------------------------------------------------------------
| Danh sách và tạo sự kiện
|--------------------------------------------------------------------------
*/

// Admin, Leader và thành viên xem danh sách theo quyền trong controller
router.get(
    "/",
    authMiddleware,
    getAllEvents
);

// Chỉ Admin tạo sự kiện
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    createEvent
);

/*
|--------------------------------------------------------------------------
| Các thao tác trên một sự kiện
|--------------------------------------------------------------------------
*/

// Chỉ Admin xóa vĩnh viễn
router.delete(
    "/:id/permanent",
    authMiddleware,
    roleMiddleware("admin"),
    permanentDeleteEvent
);

// Chỉ Admin công bố
router.patch(
    "/:id/publish",
    authMiddleware,
    roleMiddleware("admin"),
    publishEvent
);

// Chỉ Admin sửa
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    updateEvent
);

// Chỉ Admin xóa mềm
router.patch(
    "/:id/delete",
    authMiddleware,
    roleMiddleware("admin"),
    deleteEvent
);

// Chỉ Admin khôi phục
router.patch(
    "/:id/restore",
    authMiddleware,
    roleMiddleware("admin"),
    restoreEvent
);

// Chỉ Admin hủy
router.patch(
    "/:id/cancel",
    authMiddleware,
    roleMiddleware("admin"),
    cancelEvent
);

// Đặt cuối vì /:id có thể bắt các chuỗi route khác
router.get(
    "/:id",
    authMiddleware,
    getEventById
);

module.exports = router;