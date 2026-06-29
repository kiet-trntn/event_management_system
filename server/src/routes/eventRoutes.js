const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

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
    getLeaderEventsForCalendar
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

router.get("/leader-calendar",
     authMiddleware, 
     getLeaderEventsForCalendar
);

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    updateEvent
);

router.get(
    "/trash",
    authMiddleware,
    roleMiddleware("admin"),
    getTrashEvents
);

router.get(
    "/:id",
    authMiddleware,
    getEventById
);

router.patch(
    "/:id/delete",
    authMiddleware,
    roleMiddleware("admin"),
    deleteEvent
);

router.patch(
    "/:id/restore",
    authMiddleware,
    roleMiddleware("admin"),
    restoreEvent
);

router.patch(
    "/:id/cancel",
    authMiddleware,
    roleMiddleware("admin"),
    cancelEvent
);



module.exports = router;