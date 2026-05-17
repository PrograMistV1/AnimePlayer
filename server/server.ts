import express from "express";
import path from "path";

import animeRouter from "./routes/anime.js";
import dataRouter from "./routes/data.js";
import {__dirname, PORT} from "./config.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/anime", animeRouter);
app.use("/api/data", dataRouter);

app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});