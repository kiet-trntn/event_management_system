const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
    getAllEvents,
    createEvent
} = require("../controllers/eventController");

router.get(
    "/",
    authMiddleware,
    getAllEvents
);

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    createEvent
);

module.exports = router;