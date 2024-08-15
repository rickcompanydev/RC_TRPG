import schedule from 'node-schedule';
import path from 'path';
import fs from 'fs';

const alarmsFilePath = path.resolve('./data/alarm.json');

// 将用户输入的时间转换为 UTC 时间
export function convertToUTC(year, month, day, hour) {
    // 假设输入的时间是 +8 时区，转换为 UTC
    return new Date(Date.UTC(year, month - 1, day, hour - 8));
}

// 保存提醒任务到文件
function saveAlarmsToFile(alarms) {
    fs.writeFileSync(alarmsFilePath, JSON.stringify(alarms, null, 2));
}

// 从文件读取提醒任务
function loadAlarmsFromFile() {
    if (fs.existsSync(alarmsFilePath)) {
        const rawData = fs.readFileSync(alarmsFilePath, 'utf8');
        return JSON.parse(rawData);
    }
    return [];
}

// 重新加载保存的调度任务
export function reloadScheduledAlarms(client) {
    const alarms = loadAlarmsFromFile();

    alarms.forEach(alarm => {
        const date = new Date(alarm.date);
        if (date > new Date()) { // 只重新调度未来的任务
            schedule.scheduleJob(date, async () => {
                console.log(`Alarm triggered for ${date}`);
                const guild = client.guilds.cache.get(alarm.guildId);
                if (guild) {
                    const channel = guild.channels.cache.get(alarm.channelId);
                    if (channel) {
                        const role = guild.roles.cache.get(alarm.roleId);
                        if (role) {
                            await channel.send(`⏰ 時間到了！${role} 你被提醒了！`);
                        } else {
                            console.error(`Role with ID ${alarm.roleId} not found.`);
                        }
                    } else {
                        console.error(`Channel with ID ${alarm.channelId} not found.`);
                    }
                } else {
                    console.error(`Guild with ID ${alarm.guildId} not found.`);
                }
            });
        }
    });
}

// 设置新的定时任务
export function setNewAlarm(client, alarmData) {
    const alarms = loadAlarmsFromFile();
    alarms.push(alarmData);
    saveAlarmsToFile(alarms);

    const date = new Date(alarmData.date);
    schedule.scheduleJob(date, async () => {
        console.log(`Alarm triggered for ${date}`);
        const guild = client.guilds.cache.get(alarmData.guildId);
        if (guild) {
            const channel = guild.channels.cache.get(alarmData.channelId);
            if (channel) {
                const roleToMention = guild.roles.cache.get(alarmData.roleId);
                if (roleToMention) {
                    await channel.send(`⏰ 時間到了！${roleToMention} 你被提醒了！`);
                } else {
                    console.error(`Role with ID ${alarmData.roleId} not found.`);
                }
            } else {
                console.error(`Channel with ID ${alarmData.channelId} not found.`);
            }
        } else {
            console.error(`Guild with ID ${alarmData.guildId} not found.`);
        }
    });
}