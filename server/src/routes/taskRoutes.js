const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    updateTaskStatus
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

router.get(
    "/:id",
    authMiddleware,
    getTaskById
);

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    updateTask
);

router.patch(
    "/:id/status",
    authMiddleware,
    updateTaskStatus
);


module.exports = router;