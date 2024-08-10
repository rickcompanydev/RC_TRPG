import { SlashCommandBuilder } from 'discord.js';
import { readGMFile } from './roll.js'; // 確保路徑正確
import { fileURLToPath } from 'url';
import path from 'path';

// 創建 Slash 命令
export const data = new SlashCommandBuilder()
    .setName('cc')
    .setDescription('進行技能檢查')
    .addIntegerOption(option =>
        option.setName('skill')
            .setDescription('技能值')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('check')
            .setDescription('檢定名稱')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('type')
            .setDescription('結果私訊類型')
            .addChoices(
                { name: '私訊自己', value: 'dr' },
                { name: '私訊 GM 和自己', value: 'ddr' },
                { name: '私訊 GM', value: 'dddr' }
            )
            .setRequired(false));

// 執行 Slash 命令的處理函數
export async function execute(interaction) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const gmFilePath = path.resolve(__dirname, '../../data/gm.json');
    const gmData = readGMFile(gmFilePath);
    const guildId = interaction.guild.id;
    const threadId = interaction.channel.id; // 獲取當前線程 ID
    const skill = interaction.options.getInteger('skill');
    const type = interaction.options.getString('type');
    const roll = Math.floor(Math.random() * 100) + 1;
    const check = interaction.options.getString('check');
    let result = '失敗';
    let resultMessage = `🎲 ${interaction.user.username} 進行了技能檢查:\n你擲出了 ${roll}，技能值為 ${skill}，結果: ${result}`;

    if (roll <= skill / 10 && roll <= 1) {
        result = '大成功';
    } else if (roll <= skill / 5) {
        result = '極難成功';
    } else if (roll <= skill / 2) {
        result = '困難成功';
    } else if (roll <= skill) {
        result = '成功';
    }

    if (skill < 50) {
        if (roll >= 95) {
            result = '大失敗';
        }
    } else if (roll >= 100) {
        result = '大失敗';
    }

    if (check === null) {
        resultMessage = `🎲 ${interaction.user.username} 進行了技能檢查:\n你擲出了 ${roll}，技能值為 ${skill}，結果: ${result}`;
    } else {
        resultMessage = `🎲 ${interaction.user.username} 進行了技能檢查:\n你擲出了 ${roll}，技能值為 ${skill}，檢定為 ${check}，結果: ${result}`;
    }

    if (type === 'dr') {
        await interaction.user.send(resultMessage);
        await interaction.reply({ content: '技能檢查結果已私訊給你！', ephemeral: true });
    } else if (type === 'ddr') {
        const gmId = gmData[guildId]?.[threadId]?.id;
        if (gmId) {
            await interaction.user.send(resultMessage);
            await interaction.client.users.fetch(gmId).then(user => user.send(resultMessage));
            await interaction.reply({ content: '技能檢查結果已私訊給你和 GM！', ephemeral: true });
        } else {
            await interaction.reply({ content: '當前沒有設置 GM。', ephemeral: true });
        }
    } else if (type === 'dddr') {
        const gmId = gmData[guildId]?.[threadId]?.id;
        if (gmId) {
            await interaction.client.users.fetch(gmId).then(user => user.send(resultMessage));
            await interaction.reply({ content: '技能檢查結果已私訊給 GM！', ephemeral: true });
        } else {
            await interaction.reply({ content: '當前沒有設置 GM。', ephemeral: true });
        }
    } else {
        await interaction.reply(resultMessage);
    }
}