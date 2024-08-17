import { SlashCommandBuilder } from 'discord.js';
import { convertToUTC, setNewAlarm } from '../../data/alarm.js'; // 確保路徑正確

export const data = new SlashCommandBuilder()
    .setName('alarm')
    .setDescription('設置一個提醒')
    .addStringOption(option =>
        option.setName('time')
            .setDescription('提醒時間 (格式: yyyy:mm:dd:hh:mm)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('mentions')
            .setDescription('要提醒的對象 (可以@多個使用者)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('message')
            .setDescription('自訂提醒內容')
            .setRequired(false)); // 自訂消息是可選的

export async function execute(interaction) {
    const timeInput = interaction.options.getString('time');
    const mentions = interaction.options.getString('mentions'); // 获取@对象
    const message = interaction.options.getString('message'); // 获取自訂消息

    // 解析時間字符串並轉換為 UTC
    const [year, month, day, hour, minute] = timeInput.split(':').map(Number);
    const date = convertToUTC(year, month, day, hour, minute);

    if (isNaN(date.getTime())) {
        await interaction.reply({ content: '請提供有效的時間格式 (yyyy:mm:dd:hh:mm)。', ephemeral: true });
        return;
    }

    // 檢查時間是否為未來的時間
    const now = new Date();
    if (date <= now) {
        await interaction.reply({ content: '請設置一個未來的時間。', ephemeral: true });
        return;
    }

    const alarmData = {
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        mentions: mentions, // 保存提及的對象
        date: date.toISOString(),
        message: message || '提醒時間到了！', // 預設消息
    };

    setNewAlarm(alarmData);

    await interaction.reply(`提醒已設置！將於 ${date.toLocaleString('zh-TW', { timeZone: 'Asia/Shanghai' })} 提及 ${mentions}。`);
}