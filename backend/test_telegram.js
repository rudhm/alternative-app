"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const telegram_1 = require("./src/telegram");
async function test() {
    console.log("Sending test notification to Rudh...");
    await (0, telegram_1.sendTelegramNotification)('Rudh', 'Hasi', '🤖 Beep boop! This is a test message from your app. The Telegram integration is working perfectly!');
    console.log("Done!");
}
test();
//# sourceMappingURL=test_telegram.js.map