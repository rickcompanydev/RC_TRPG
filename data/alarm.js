import schedule from 'node-schedule';
import path from 'path';
import fs from 'fs';

// 導入 client 實例
import { client } from '../main.js';

const alarmsFilePath = path.resolve('./data/alarm.json');

// 將用戶輸入的時間轉換為 UTC 時間
export function convertToUTC(year, month, day, hour, minute) {
    // 假設輸入的時間是 +8 時區，轉換為 UTC
    return new Date(Date.UTC(year, month - 1, day, hour - 8, minute));
}

// 將 BigInt 類型值轉換為字串
function replacer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString(); // 轉換為字串
    }
    return value;
}

// 保存提醒任務到檔案
function saveAlarmsToFile(alarms) {
    fs.writeFileSync(alarmsFilePath, JSON.stringify(alarms, replacer, 2));
}

// 從檔案讀取提醒任務
function loadAlarmsFromFile() {
    if (fs.existsSync(alarmsFilePath)) {
        const rawData = fs.readFileSync(alarmsFilePath, 'utf8');
        return JSON.parse(rawData);
    }
    return [];
}

// 重新加載保存的調度任務
export function reloadScheduledAlarms() {
    const alarms = loadAlarmsFromFile();

    alarms.forEach(alarm => {
        const date = new Date(alarm.date);
        if (date > new Date()) { // 只重新調度未來的任務
            schedule.scheduleJob(date, async () => {
                console.log(`提醒觸發於 ${date}`);
                if (!client || !client.guilds) {
                    console.error('Client 尚未準備好或 client.guilds 為 undefined');
                    return;
                }

                const guild = client.guilds.cache.get(alarm.guildId);
                if (guild) {
                    const channel = guild.channels.cache.get(alarm.channelId);
                    if (channel) {
                        await channel.send(`⏰ ${alarm.message} ${alarm.mentions}`);
                    } else {
                        console.error(`找不到 ID 為 ${alarm.channelId} 的頻道。`);
                    }
                } else {
                    console.error(`找不到 ID 為 ${alarm.guildId} 的伺服器。`);
                }
            });
        }
    });
}

// 設置新的定時任務
export function setNewAlarm(alarmData) {
    const alarms = loadAlarmsFromFile();
    alarms.push(alarmData);
    saveAlarmsToFile(alarms);

    const date = new Date(alarmData.date);
    schedule.scheduleJob(date, async () => {
        console.log(`提醒觸發於 ${date}`);
        if (!client || !client.guilds) {
            console.error('Client 尚未準備好或 client.guilds 為 undefined');
            return;
        }

        const guild = client.guilds.cache.get(alarmData.guildId);
        if (guild) {
            const channel = guild.channels.cache.get(alarmData.channelId);
            if (channel) {
                await channel.send(`⏰ ${alarmData.message} ${alarmData.mentions}`);
            } else {
                console.error(`找不到 ID 為 ${alarmData.channelId} 的頻道。`);
            }
        } else {
            console.error(`找不到 ID 為 ${alarmData.guildId} 的伺服器。`);
        }
    });
}