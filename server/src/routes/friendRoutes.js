const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
    sendFriendRequest,
    getReceivedFriendRequests,
    getSentFriendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    getFriends,
    removeFriend,
    cancelFriendRequest
} = require("../controllers/friendController");

// Danh sách bạn bè
router.get(
    "/",
    authMiddleware,
    getFriends
);

// Lời mời đã nhận
router.get(
    "/requests/received",
    authMiddleware,
    getReceivedFriendRequests
);

// Lời mời đã gửi
router.get(
    "/requests/sent",
    authMiddleware,
    getSentFriendRequests
);

// Gửi lời mời
router.post(
    "/requests/:userId",
    authMiddleware,
    sendFriendRequest
);

// Chấp nhận lời mời
router.patch(
    "/requests/:id/accept",
    authMiddleware,
    acceptFriendRequest
);

// Từ chối lời mời
router.patch(
    "/requests/:id/reject",
    authMiddleware,
    rejectFriendRequest
);

// Hủy lời mời đã gửi
router.delete(
    "/requests/:id/cancel",
    authMiddleware,
    cancelFriendRequest
);

// Hủy kết bạn
router.delete(
    "/:userId",
    authMiddleware,
    removeFriend
);

module.exports = router;