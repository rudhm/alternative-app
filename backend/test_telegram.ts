import 'dotenv/config';
import { sendTelegramNotification } from './src/telegram';

async function test() {
  console.log("Sending test notification to Rudh...");
  await sendTelegramNotification('Rudh', 'Hasi', '🤖 Beep boop! This is a test message from your app. The Telegram integration is working perfectly!');
  console.log("Done!");
}

test();
