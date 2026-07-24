const crypto = require("crypto");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "..", "..", "uploads", "control");
const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/zip",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const storage = multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase().slice(0, 10);
        callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, file, callback) => {
        if (!allowedTypes.has(file.mimetype)) {
            const error = new Error("Недопустимый формат файла");
            error.status = 400;
            return callback(error);
        }
        return callback(null, true);
    },
});

module.exports = { upload, uploadDirectory };
