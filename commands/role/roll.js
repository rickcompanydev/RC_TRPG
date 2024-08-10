import { SlashCommandBuilder } from 'discord.js';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

// 獲取 GM 的存儲路徑
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gmFilePath = path.resolve(__dirname, '../../data/gm.json');

// 讀取 GM 配置文件
export function readGMFile() {
    if (!fs.existsSync(gmFilePath)) {
        fs.writeFileSync(gmFilePath, JSON.stringify({}), 'utf8');
    }
    try {
        const data = fs.readFileSync(gmFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('🔮 讀取或解析 GM 文件時發生錯誤:', error);
        return {}; // 返回一個空對象，以避免程式崩潰
    }
}

// 擲骰子函數，支持多次擲骰並進行計算
function rollMultipleDice(diceNotation, times, modifier = '') {
    // 使用正則表達式來匹配骰子公式
    const match = diceNotation.match(/^(\d+)d(\d+)$/);
    if (!match) {
        throw new Error(`骰子公式格式不正確: ${diceNotation}. 請使用類似 "3d6" 的格式。`);
    }

    const [, rolls, sides] = match;

    let allResults = [];
    let totalSum = 0;

    for (let i = 0; i < times; i++) {
        let currentRolls = [];
        for (let j = 0; j < parseInt(rolls); j++) {
            const rollResult = Math.floor(Math.random() * parseInt(sides)) + 1;
            currentRolls.push(rollResult);
        }

        allResults.push(`第 ${i + 1} 次擲骰: [${currentRolls.join(', ')}]`);
        totalSum += currentRolls.reduce((sum, value) => sum + value, 0);
    }

    return { allResults, totalSum };
}

// 解析和計算表達式函數
function calculateExpression(baseSum, expression) {
    try {
        // 確保安全計算表達式
        const result = new Function('return ' + baseSum + expression)();
        return result;
    } catch (error) {
        console.error('⚠️ 計算表達式時出錯:', error);
        throw new Error('無法計算表達式，請檢查格式。');
    }
}

// 創建 Slash 命令
export const data = new SlashCommandBuilder()
    .setName('roll')
    .setDescription('進行擲骰操作')
    .addStringOption(option =>
        option.setName('formula')
            .setDescription('骰子的公式，例如 3d6')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('times')
            .setDescription('擲骰的次數')
            .setRequired(false))
    // .addStringOption(option =>
    //     option.setName('modifier')
    //         .setDescription('修飾符 (kh, kl, dh, dl)')
    //         .setRequired(false))
    .addStringOption(option =>
        option.setName('calculation')
            .setDescription('附加的加減計算 (例如 +5 或 -3)')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('type')
            .setDescription('骰子類型，例如 dr, ddr, dddr')
            .addChoices(
                { name: '私訊自己', value: 'dr' },
                { name: '私訊 GM 和自己', value: 'ddr' },
                { name: '私訊 GM', value: 'dddr' }
            )
            .setRequired(false));

// 執行 Slash 命令的處理函數
export async function execute(interaction) {
    const formula = interaction.options.getString('formula');
    const times = interaction.options.getInteger('times') || 1;
    const modifier = interaction.options.getString('modifier') || '';
    const calculation = interaction.options.getString('calculation') || '';
    const type = interaction.options.getString('type');
    const guildId = interaction.guild.id;
    const threadId = interaction.channel.id; // 獲取當前線程 ID
    const gmData = readGMFile();
    const gmId = gmData[guildId]?.[threadId]?.id;

    try {
        // 調用擲骰子函數
        const { allResults, totalSum } = rollMultipleDice(formula, times, modifier);
        let resultMessage = `🎲 ${interaction.user.tag} 擲出了 ${times} 次 ${formula} ${modifier ? modifier : ''}:\n${allResults.join('\n')}\n`;
        resultMessage += `初始總和: ${totalSum}\n`;

        // 如果有附加的計算，則進行計算
        if (calculation) {
            const finalResult = calculateExpression(totalSum, calculation);
            resultMessage += `最終結果: ${totalSum} ${calculation} = ${finalResult}`;
        } else {
            resultMessage += `最終結果: ${totalSum}`;
        }

        // 根據類型處理結果
        if (type === 'dr') {
            await interaction.user.send(resultMessage);
            await interaction.reply({ content: '擲骰結果已私訊給你！', ephemeral: true });
        } else if (type === 'ddr') {
            if (gmId) {
                await interaction.user.send(resultMessage);
                await interaction.client.users.fetch(gmId).then(user => user.send(resultMessage));
                await interaction.reply({ content: '擲骰結果已私訊給你和 GM！', ephemeral: true });
            } else {
                await interaction.reply({ content: '當前沒有設置 GM。', ephemeral: true });
            }
        } else if (type === 'dddr') {
            if (gmId) {
                await interaction.client.users.fetch(gmId).then(user => user.send(resultMessage));
                await interaction.reply({ content: '擲骰結果已私訊給 GM！', ephemeral: true });
            } else {
                await interaction.reply({ content: '當前沒有設置 GM。', ephemeral: true });
            }
        } else {
            await interaction.reply(resultMessage);
        }
    } catch (error) {
        console.error('🚨 擲骰子或計算時發生錯誤:', error);
        await interaction.reply({ content: '⚠️ 哎呀！擲骰子或計算的過程中發生了錯誤。', ephemeral: true });
    }
}

export {
    rollMultipleDice,
    calculateExpression
}