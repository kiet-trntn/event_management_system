const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
    createEvent
} = require("../controllers/eventController");

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    createEvent
);

module.exports = router;