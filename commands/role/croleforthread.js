import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// 定義 link.json 檔案路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const linkFilePath = path.resolve(__dirname, '../../data/link.json');

// 讀取 link.json 檔案
function readLinkFile() {
    if (!fs.existsSync(linkFilePath)) {
        fs.writeFileSync(linkFilePath, JSON.stringify({}), 'utf8');
    }
    const data = fs.readFileSync(linkFilePath, 'utf8');
    return JSON.parse(data);
}

// 寫入 link.json 檔案
function writeLinkFile(data) {
    fs.writeFileSync(linkFilePath, JSON.stringify(data, null, 2), 'utf8');
}

// 創建 Slash 命令
export const data = new SlashCommandBuilder()
    .setName('createroleforthread')
    .setDescription('創建一個新的身份組並將其分配給當前線程中的所有成員')
    .addStringOption(option =>
        option.setName('role_name')
            .setDescription('身份組的名稱')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('color')
            .setDescription('身份組的顏色'));

// 執行 Slash 命令的處理函數
export async function execute(interaction) {
    const roleName = interaction.options.getString('role_name');
    const color = interaction.options.getString('color') || '"#41bb3d"';

    let responseMessage = '';

    try {
        // 創建新角色
        const newRole = await interaction.guild.roles.create({
            name: roleName,
            color: color,
            reason: '創建新的身份組',
        });

        const roleId = newRole.id;
        const RoleName = newRole.name;
        const threadId = interaction.channel.id; // 獲取線程 ID
        const guildId = interaction.guild.id; // 獲取伺服器 ID

        // 讀取 link.json
        const linkData = readLinkFile();

        // 如果伺服器 ID 不存在，初始化它
        if (!linkData[guildId]) {
            linkData[guildId] = {};
        }

        // 使用 Map 來存儲角色 ID
        const roleMap = new Map(Object.entries(linkData[guildId]));

        // 確保每個 threadId 對應的角色 ID 是一個數組
        if (!roleMap.has(threadId)) {
            roleMap.set(threadId, []);
        }
        roleMap.get(threadId).push(roleId);

        // 將 Map 轉換為普通對象並寫回 link.json
        linkData[guildId] = Object.fromEntries(roleMap);
        writeLinkFile(linkData);

        responseMessage += `✨ PL們！一個新的身份組 **${newRole.name}** 已經在這裡創建了！\n`;

        // 調用函數將角色分配給線程中的所有成員
        responseMessage += await fetchAllThreadMembers(interaction, roleId, RoleName);

    } catch (error) {
        console.error('🔮 創建身份組時發生錯誤:', error);
        responseMessage += '⚠️ 哎呀！創建身份組的過程中發生了錯誤。';
    }

    // 發送最終的回覆
    await interaction.reply(responseMessage);
}

// 從交互中獲取線程成員並分配角色
async function fetchAllThreadMembers(interaction, roleId, RoleName) {
    const threadId = interaction.channel.id; // 從交互中獲取線程 ID
    const giveRoleId = roleId; // 角色 ID
    const giveRoleName = RoleName; // 角色名稱

    let message = '';

    try {
        // 獲取線程對象
        const thread = await interaction.client.channels.fetch(threadId);

        // 確保線程對象存在並是 ThreadChannel 類型
        if (!thread || !thread.isThread()) {
            throw new Error('對象不是線程');
        }

        // 獲取線程成員
        const threadMembers = await thread.members.fetch();

        // 獲取伺服器成員
        const guild = interaction.guild;

        // 給每個成員添加角色
        for (const [memberId, threadMember] of threadMembers) {
            try {
                const member = await guild.members.fetch(memberId);
                if (member.roles.cache.has(giveRoleId)) {
                    message += `🌟 成員 ${member.displayName} 已經擁有了角色 ${giveRoleName}，看來他們準備好面對命運！\n`;
                } else {
                    await member.roles.add(giveRoleId);
                    message += `🎉 成員 ${member.displayName} 現在獲得了角色 ${giveRoleName}，願命運女神祝福你！\n`;
                }
            } catch (error) {
                console.error(`🚨 給成員 ${memberId} 添加角色 ${giveRoleId} 時出錯:`, error);
                message += `⚠️ 哎呀！給成員 ${memberId} 添加角色 ${giveRoleId} 時出錯了。\n`;
            }
        }
    } catch (error) {
        console.error('🔮 獲取線程成員時發生錯誤:', error);
        message += '⚠️ 獲取線程成員的過程中發生了錯誤。';
    }

    return message;
}