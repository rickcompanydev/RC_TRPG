import { SlashCommandBuilder } from 'discord.js';
import { convertToUTC, setNewAlarm } from '../../data/alarm.js'; // 确保路径正确

export const data = new SlashCommandBuilder()
    .setName('alarm')
    .setDescription('设置一个提醒')
    .addStringOption(option =>
        option.setName('time')
            .setDescription('提醒时间 (格式: yyyy:mm:dd:hh)')
            .setRequired(true))
    .addRoleOption(option =>
        option.setName('role')
            .setDescription('要提醒的角色')
            .setRequired(true));

export async function execute(interaction, client) {
    const timeInput = interaction.options.getString('time');
    const role = interaction.options.getRole('role');

    // 解析时间字符串并转换为 UTC
    const [year, month, day, hour] = timeInput.split(':').map(Number);
    const date = convertToUTC(year, month, day, hour);

    if (isNaN(date.getTime())) {
        await interaction.reply({ content: '請提供有效的時間格式 (yyyy:mm:dd:hh)。', ephemeral: true });
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
    };

    setNewAlarm(client, alarmData);

    await interaction.reply(`提醒已設置！將於 ${date.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })} 提及 ${role.name}。`);
}