const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
    getAllTasks,
    createTask
} = require("../controllers/taskController");

router.get(
    "/",
    authMiddleware,
    getAllTasks
);

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    createTask
);



module.exports = router;