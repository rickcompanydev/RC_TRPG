import { SlashCommandBuilder } from 'discord.js';
import { convertToUTC, setNewAlarm } from '../../data/alarm.js'; // 确保路径正确

export const data = new SlashCommandBuilder()
    .setName('alarm')
    .setDescription('设置一个提醒')
    .addStringOption(option =>
        option.setName('time')
            .setDescription('提醒时间 (格式: yyyy:mm:dd:hh:mm)')
            .setRequired(true))
    .addRoleOption(option =>
        option.setName('role')
            .setDescription('要提醒的角色')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('message')
            .setDescription('自定义提醒内容')
            .setRequired(false)); // 自定义消息是可选的

export async function execute(interaction) {
    const timeInput = interaction.options.getString('time');
    const role = interaction.options.getRole('role');
    const message = interaction.options.getString('message'); // 获取自定义消息

    // 解析时间字符串并转换为 UTC
    const [year, month, day, hour, minute] = timeInput.split(':').map(Number);
    const date = convertToUTC(year, month, day, hour, minute);

    if (isNaN(date.getTime())) {
        await interaction.reply({ content: '請提供有效的時間格式 (yyyy:mm:dd:hh:mm)。', ephemeral: true });
        return;
    }

    // 检查时间是否为未来的时间
    const now = new Date();
    if (date <= now) {
        await interaction.reply({ content: '請設置一個未來的時間。', ephemeral: true });
        return;
    }

    const alarmData = {
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        roleId: role.id,
        date: date.toISOString(),
        message: message || '提醒時間到了！', // 默认消息
    };

    setNewAlarm(alarmData);

    await interaction.reply(`提醒已設置！將於 ${date.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })} 提及 ${role.name}。`);
}