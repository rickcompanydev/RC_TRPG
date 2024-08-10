import { SlashCommandBuilder } from 'discord.js';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

// 獲取 GM 的存儲路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gmFilePath = path.resolve(__dirname, '../../data/gm.json');

// 讀取 GM 配置文件
function readGMFile() {
    if (!fs.existsSync(gmFilePath)) {
        fs.writeFileSync(gmFilePath, JSON.stringify({}), 'utf8');
    }
    let data;
    try {
        const fileContent = fs.readFileSync(gmFilePath, 'utf8');
        data = JSON.parse(fileContent);
    } catch (error) {
        console.error('🔮 讀取或解析 GM 檔案時發生錯誤:', error);
        data = {}; // 返回一個空對象，以避免程式崩潰
    }
    return data;
}

// 寫入 GM 配置文件
function writeGMFile(data) {
    try {
        fs.writeFileSync(gmFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('🔮 寫入 GM 檔案時發生錯誤:', error);
    }
}

// 創建 Slash 命令
export const data = new SlashCommandBuilder()
    .setName('gm')
    .setDescription('管理 GM 列表')
    .addSubcommand(subcommand =>
        subcommand
            .setName('add')
            .setDescription('添加一個 GM'))
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('移除 GM')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('要移除的 GM 使用者')
                    .setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('顯示所有 GM'));

// 執行 Slash 命令的處理函數
export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const threadId = interaction.channel.id; // 獲取當前線程 ID
    const userId = interaction.options.getUser('user')?.id;

    const gmData = readGMFile();

    try {
        if (subcommand === 'add') {
            if (!gmData[guildId]) {
                gmData[guildId] = {};
            }
            gmData[guildId][threadId] = { id: interaction.user.id };
            writeGMFile(gmData);
            await interaction.reply(`🎲 GM (ID: ${interaction.user.tag}) 已成功設置。`);
        } else if (subcommand === 'remove') {
            if (gmData[guildId] && gmData[guildId][threadId] && gmData[guildId][threadId].id === userId) {
                delete gmData[guildId][threadId];
                if (Object.keys(gmData[guildId]).length === 0) {
                    delete gmData[guildId];
                }
                writeGMFile(gmData);
                await interaction.reply('🎲 已成功移除 GM。');
            } else {
                await interaction.reply('🔮 沒有找到該 GM。');
            }
        } else if (subcommand === 'list') {
            const gmInfo = gmData[guildId]?.[threadId];
            if (gmInfo) {
                const gm = await interaction.client.users.fetch(gmInfo.id);
                await interaction.reply(`📜 當前 GM: <@${gm.id}>`);
            } else {
                await interaction.reply('🔮 當前沒有設置 GM。');
            }
        }
    } catch (error) {
        console.error('🔮 管理 GM 時發生錯誤:', error);
        await interaction.reply('⚠️ 處理 GM 列表時發生錯誤。');
    }
}