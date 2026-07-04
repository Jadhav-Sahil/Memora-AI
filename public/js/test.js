console.log("io =", io);

const socket = io();

socket.on("connect", () => {
    console.log("Connected:", socket.id);
});