import { SlashCommandBuilder } from 'discord.js';
import { rollMultipleDice } from './roll.js'; // 确保路径正确
import { fileURLToPath } from 'url';
import path from 'path';
import { readGMFile } from './roll.js'; // 确保路径正确

// 创建 Slash 命令
export const data = new SlashCommandBuilder()
    .setName('sc')
    .setDescription('進行 SAN 檢查')
    .addIntegerOption(option =>
        option.setName('san')
            .setDescription('SAN 值')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('failure')
            .setDescription('(失敗的/單一) SC 扣除（例如 3d6）')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('success')
            .setDescription('成功的 SC 扣除（例如 2d6），默認為 0')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('type')
            .setDescription('結果私信類型')
            .addChoices(
                { name: '私信自己', value: 'dr' },
                { name: '私信 GM 和自己', value: 'ddr' },
                { name: '私信 GM', value: 'dddr' }
            )
            .setRequired(false));

// 执行 Slash 命令的处理函数
export async function execute(interaction) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const gmFilePath = path.resolve(__dirname, '../../data/gm.json');
    const gmData = readGMFile(gmFilePath);
    const san = interaction.options.getInteger('san');
    const success = interaction.options.getString('success') || '0d0'; // 默认成功的 SC 扣除为 0
    const failure = interaction.options.getString('failure');
    const type = interaction.options.getString('type');
    const guildId = interaction.guild.id;
    const threadId = interaction.channel.id; // 获取当前线程 ID

    const roll = Math.floor(Math.random() * 100) + 1;
    let resultMessage = `🎲 ${interaction.user.username} 進行了 SAN 檢查:\n`;

    const { totalSum: successSum } = rollMultipleDice(success, 1);
    const { totalSum: failureSum } = rollMultipleDice(failure, 1);

    if (roll <= san) {
        resultMessage += `檢定結果: 成功 ${roll}\n`;
        resultMessage += `檢定前 SAN 值: ${san}\n`;
        resultMessage += `當前 SAN 值: ${san - successSum} (輸出: ${san} - ${successSum} = ${san - successSum})`;
    } else {
        resultMessage += `檢定結果: 失敗 ${roll}\n`;
        resultMessage += `檢定前 SAN 值: ${san}\n`;
        resultMessage += `當前 SAN 值: ${san - failureSum} (輸出: ${san} - ${failureSum} = ${san - failureSum})`;
    }

    if (type === 'dr') {
        await interaction.user.send(resultMessage);
        await interaction.reply({ content: 'SAN 檢查結果已私信給你！', ephemeral: true });
    } else if (type === 'ddr') {
        const gmId = gmData[guildId]?.[threadId]?.id;
        if (gmId) {
            await interaction.user.send(resultMessage);
            await interaction.client.users.fetch(gmId).then(user => user.send(resultMessage));
            await interaction.reply({ content: 'SAN 檢查結果已私信給你和 GM！', ephemeral: true });
        } else {
            await interaction.reply({ content: '當前沒有設置 GM。', ephemeral: true });
        }
    } else if (type === 'dddr') {
        const gmId = gmData[guildId]?.[threadId]?.id;
        if (gmId) {
            await interaction.client.users.fetch(gmId).then(user => user.send(resultMessage));
            await interaction.reply({ content: 'SAN 檢查結果已私信給 GM！', ephemeral: true });
        } else {
            await interaction.reply({ content: '當前沒有設置 GM。', ephemeral: true });
        }
    } else {
        await interaction.reply(resultMessage);
    }
}