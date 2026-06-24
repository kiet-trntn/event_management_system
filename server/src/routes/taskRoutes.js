const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    restoreTask,
    getDeletedTasks
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
    "/deleted",
    authMiddleware,
    roleMiddleware("admin"),
    getDeletedTasks
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

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    deleteTask
);

router.patch(
    "/:id/restore",
    authMiddleware,
    roleMiddleware("admin"),
    restoreTask
);




module.exports = router;