const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
    sendDirectMessage,
    getConversationWithUser,
    getMyConversations,
    deleteDirectMessage,
    getChatUsers,
    recallDirectMessage
} = require("../controllers/directMessageController");

// Gửi tin nhắn riêng
router.post(
    "/",
    authMiddleware,
    sendDirectMessage
);

router.get(
    "/users",
    authMiddleware,
    getChatUsers
);

// Xem danh sách cuộc trò chuyện
router.get(
    "/conversations",
    authMiddleware,
    getMyConversations
);

// Xem cuộc trò chuyện với một user
router.get(
    "/user/:userId",
    authMiddleware,
    getConversationWithUser
);

// Thu hồi tin nhắn
router.patch(
    "/:id/recall",
    authMiddleware,
    recallDirectMessage
);

// Xóa tin nhắn phía mình
router.delete(
    "/:id",
    authMiddleware,
    deleteDirectMessage
);





module.exports = router;