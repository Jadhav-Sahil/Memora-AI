let io;

const initSocket = (_io) => {
    io = _io;

    // FIX: this was missing entirely. Without it, the frontend's
    // `socket.emit("join-job", meetingId)` had nothing listening for it
    // server-side, so the socket never actually joined the room. Every
    // emitToJob() call below was broadcasting into an empty room — the
    // client never received a single "progress" event, regardless of how
    // correct the rest of the pipeline was.
    io.on("connection", (socket) => {
        socket.on("join-job", (jobId) => {
            if (!jobId) return;
            socket.join(jobId);
        });

        // optional but recommended: clean up if you ever track per-socket state
        socket.on("disconnect", () => {
            // no-op for now — rooms are cleaned up automatically by socket.io
        });
    });
};

const emitToJob = (jobId, event, data) => {
    if (!io) return;
    io.to(jobId).emit(event, data);
};

module.exports = {
    initSocket,
    emitToJob,
};