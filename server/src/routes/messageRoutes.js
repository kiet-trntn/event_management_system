const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
    sendMessage,
    getMessagesByEvent,
    deleteMessage
} = require("../controllers/messageController");

// Gửi tin nhắn
router.post(
    "/",
    authMiddleware,
    sendMessage
);

// Lấy tin nhắn theo sự kiện
router.get(
    "/event/:eventId",
    authMiddleware,
    getMessagesByEvent
);

// Xóa tin nhắn
router.delete(
    "/:id",
    authMiddleware,
    deleteMessage
);

module.exports = router;