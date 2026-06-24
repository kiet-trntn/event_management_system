const express = require("express");

const router = express.Router();

const authMiddleware =
require("../middlewares/authMiddleware");

const upload =
require("../middlewares/uploadAttachment");

const {
    uploadAttachment,
    getAttachmentsByTask
} = require(
    "../controllers/attachmentController"
);

router.post(
    "/",
    authMiddleware,
    upload.single("file"),
    uploadAttachment
);

router.get(
    "/task/:id",
    authMiddleware,
    getAttachmentsByTask
);

module.exports = router;