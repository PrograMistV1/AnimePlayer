import express from "express";
import path from "path";

import animeRouter from "./routes/anime.js";
import dataRouter from "./routes/data.js";
import {__dirname, PORT} from "./config.js";
import {log} from "./logger.js";

const originalLog = console.log;
const originalError = console.error;

console.log = (...args: unknown[]) => {
    const message = args.map(String).join(" ");
    originalLog(message);
    log(message).then(() => {
    });
};

console.error = (...args: unknown[]) => {
    const message = args.map(String).join(" ");
    originalError(message);
    log(`[ERROR] ${message}`).then(() => {
    });
};

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use((req, _res, next) => {
    if (!req.path.startsWith("/.well-known")) {
        console.log(`${req.method} ${req.path}`);
    }
    next();
});

app.use("/api/anime", animeRouter);
app.use("/api/data", dataRouter);

app.use(express.static(path.join(__dirname, "../dist/public")));

app.use((_req, res) => {
    res.sendFile(path.join(__dirname, "../dist/public/index.html"));
});

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});