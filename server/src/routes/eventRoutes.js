const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
    publishEvent,
    getAllEvents,
    getEventById,
    createEvent,
    updateEvent
} = require("../controllers/eventController");

router.patch(
    "/:id/publish",
    authMiddleware,
    roleMiddleware("admin"),
    publishEvent
);

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

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    updateEvent
);

router.get(
    "/:id",
    authMiddleware,
    getEventById
);

module.exports = router;