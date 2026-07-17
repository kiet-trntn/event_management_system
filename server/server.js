require("dotenv").config();

const http = require("http");
const app = require("./src/app");

const { initSocket } = require("./src/socket/socket");

const {
    startDeadlineReminderJob
} = require("./src/jobs/deadlineReminderJob");

const {
    startEventStatusJob
} = require("./src/jobs/eventStatusJob");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Khởi động job nhắc deadline công việc
    startDeadlineReminderJob();

    // Khởi động job tự cập nhật trạng thái sự kiện
    startEventStatusJob();
});