const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

let io;

const onlineUsers = new Map();

const checkEventAccess = async (eventId, user) => {

    const [events] = await db.query(
        `
        SELECT *
        FROM events
        WHERE id = ?
        AND deleted_at IS NULL
        `,
        [eventId]
    );

    if (events.length === 0) {
        return false;
    }

    const event = events[0];

    if (user.role === "admin") {
        return true;
    }

    if (Number(user.id) === Number(event.leader_id)) {
        return true;
    }

    const [members] = await db.query(
        `
        SELECT id
        FROM event_members
        WHERE event_id = ?
        AND user_id = ?
        `,
        [eventId, user.id]
    );

    return members.length > 0;
};

const initSocket = (server) => {

    io = new Server(server, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            credentials: true
        }
    });

    // Xác thực token khi socket connect
    io.use((socket, next) => {

        try {

            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Không có token"));
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            socket.user = decoded;

            next();

        } catch (error) {
            next(new Error("Token không hợp lệ"));
        }

    });

    io.on("connection", (socket) => {

        const user = socket.user;

        console.log("User connected:", user.id);

        onlineUsers.set(Number(user.id), socket.id);

        // Mỗi user có room riêng để nhận notification
        socket.join(`user_${user.id}`);

        // Join room event để nhận message realtime
        socket.on("join_event", async (eventId) => {

            const allowed = await checkEventAccess(eventId, user);

            if (!allowed) {
                socket.emit("socket_error", {
                    message: "Bạn không có quyền vào phòng chat sự kiện này"
                });
                return;
            }

            socket.join(`event_${eventId}`);

            socket.emit("joined_event", {
                eventId,
                message: "Đã vào phòng chat sự kiện"
            });

            console.log(`User ${user.id} joined event_${eventId}`);
        });

        socket.on("leave_event", (eventId) => {
            socket.leave(`event_${eventId}`);
            console.log(`User ${user.id} left event_${eventId}`);
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", user.id);
            onlineUsers.delete(Number(user.id));
        });

    });

};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO chưa được khởi tạo");
    }

    return io;
};

const emitToUser = (userId, eventName, data) => {
    if (!io) return;

    io.to(`user_${userId}`).emit(eventName, data);
};

const emitToEvent = (eventId, eventName, data) => {
    if (!io) return;

    io.to(`event_${eventId}`).emit(eventName, data);
};

module.exports = {
    initSocket,
    getIO,
    emitToUser,
    emitToEvent
};