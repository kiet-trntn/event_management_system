const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
    createTimeline,
    getEventTimeline,
    updateTimeline,
    deleteTimeline,
    addTimelineItem,
    updateTimelineItem,
    deleteTimelineItem,
    reorderTimelineItems
} = require("../controllers/timelineController");

// Tạo timeline cho một sự kiện
router.post(
    "/events/:eventId",
    authMiddleware,
    createTimeline
);

// Xem timeline của sự kiện
router.get(
    "/events/:eventId",
    authMiddleware,
    getEventTimeline
);

// Thêm mốc
router.post(
    "/:timelineId/items",
    authMiddleware,
    addTimelineItem
);

// Sắp xếp các mốc
router.patch(
    "/:timelineId/reorder",
    authMiddleware,
    reorderTimelineItems
);

// Cập nhật một mốc
router.put(
    "/items/:itemId",
    authMiddleware,
    updateTimelineItem
);

// Xóa một mốc
router.delete(
    "/items/:itemId",
    authMiddleware,
    deleteTimelineItem
);

// Cập nhật thông tin timeline
router.put(
    "/:id",
    authMiddleware,
    updateTimeline
);

// Xóa toàn bộ timeline
router.delete(
    "/:id",
    authMiddleware,
    deleteTimeline
);

module.exports = router;