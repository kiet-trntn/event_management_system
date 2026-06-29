const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadAttachment");

const {
    submitTask,
    reviewSubmission
} = require("../controllers/taskSubmissionController");

router.post(
    "/",
    authMiddleware,
    upload.single("file"),
    submitTask
);

router.patch(
    "/:id/review",
    authMiddleware,
    reviewSubmission
);

module.exports = router;