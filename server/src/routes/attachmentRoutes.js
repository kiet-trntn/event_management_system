const express = require("express");

const router = express.Router();

const authMiddleware =
require("../middlewares/authMiddleware");

const upload =
require("../middlewares/uploadAttachment");

const {
    uploadAttachment,
    getAttachmentsByTask,
    deleteAttachment,
    getDeletedAttachments
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
    "/deleted",
    authMiddleware,
    getDeletedAttachments
);

router.get(
    "/task/:id",
    authMiddleware,
    getAttachmentsByTask
);

router.delete(
    "/:id",
    authMiddleware,
    deleteAttachment
);

module.exports = router;