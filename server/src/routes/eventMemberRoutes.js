const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
    getEventMembers,
    addMemberToEvent,
    removeMemberFromEvent,
    updateMemberRole
} = require("../controllers/eventMemberController");

router.get(
    "/:eventId/members",
    authMiddleware,
    getEventMembers
);

router.post(
    "/:eventId/members",
    authMiddleware,
    addMemberToEvent
);

router.delete(
    "/:eventId/members/:userId",
    authMiddleware,
    removeMemberFromEvent
);

router.patch(
    "/:eventId/members/:userId",
    authMiddleware,
    updateMemberRole
);

module.exports = router;