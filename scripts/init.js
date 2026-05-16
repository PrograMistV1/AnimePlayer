import {existsSync, writeFileSync} from "fs";

if (!existsSync("./.env")) {
    writeFileSync("./.env", `PORT=3000`);
    console.log(".env создан с дефолтными значениями");
}