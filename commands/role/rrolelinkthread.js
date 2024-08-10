import { SlashCommandBuilder } from 'discord.js';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const linkFilePath = path.resolve(__dirname, '../../data/link.json');

// 创建 Slash 命令
export const data = new SlashCommandBuilder()
    .setName('deleteroleforthread')
    .setDescription('刪除當前線程中與線程關聯的身份組');

// 執行 Slash 命令的處理函數
export async function execute(interaction) {
    const threadId = interaction.channel.id; // 從交互中獲取線程 ID
    const guildId = interaction.guild.id; // 獲取伺服器 ID
    
    let responseMessage = '';

    try {
        // 讀取 link.json 文件
        const linkData = JSON.parse(fs.readFileSync(linkFilePath, 'utf8'));

        // 確認伺服器 ID 是否存在於 linkData 中
        if (!linkData[guildId]) {
            responseMessage = '⚔️ PL們，這個伺服器中似乎沒有找到與這個線程相關聯的身份組。';
            await interaction.reply(responseMessage);
            return;
        }

        // 從 linkData 中獲取與線程 ID 關聯的角色 ID
        const roleIds = linkData[guildId][threadId];

        if (!roleIds || roleIds.length === 0) {
            responseMessage = '⚔️ PL們，似乎沒有找到與這個線程相關聯的身份組。';
            await interaction.reply(responseMessage);
            return;
        }

        for (const roleId of roleIds) {
            try {
                const role = await interaction.guild.roles.fetch(roleId);
                if (role) {
                    console.log(`找到角色: ${role.name} (ID: ${role.id})`);
                    await role.delete('刪除身份組');
                    console.log(`🔄 成功刪除身份組 **${role.name}** (ID: ${roleId})`);
                } else {
                    console.log(`角色 ID ${roleId} 不存在`);
                }
            } catch (deleteError) {
                console.error(`🔮 刪除身份組 ${roleId} 時發生錯誤:`, deleteError);
                responseMessage = `⚠️ 嘿，身份組 (ID: ${roleId}) 刪除過程中發生了錯誤。`;
                await interaction.reply(responseMessage);
                return;
            }
        }

        // 更新 link.json，刪除與線程 ID 相關的條目
        delete linkData[guildId][threadId];

        // 如果伺服器下沒有其他線程，則刪除伺服器的條目
        if (Object.keys(linkData[guildId]).length === 0) {
            delete linkData[guildId];
        }

        fs.writeFileSync(linkFilePath, JSON.stringify(linkData, null, 2));
        console.log(`🔄 已成功更新 link.json，刪除與線程 ${threadId} 相關的身份組`);

        responseMessage = `✨ PL們，所有與這個線程相關聯的身份組已成功刪除！恭喜結團。`;

    } catch (error) {
        console.error('🔮 刪除身份組時發生錯誤:', error);
        responseMessage = '⚠️ 哎呀！在刪除身份組的過程中發生了錯誤。';
    }

    // 發送最終的回覆
    await interaction.reply(responseMessage);
}