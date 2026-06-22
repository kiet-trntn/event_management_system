const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
    getAllTasks,
    getTaskById,
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

router.get(
    "/:id",
    authMiddleware,
    getTaskById
);



module.exports = router;