const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1"; 

const MODEL_ID = "google/gemini-3-flash-Preview"; 

const callAI = async (prompt: string, temperature: number, model: string = MODEL_ID) => {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "YuanMu AI Script Workshop",
    },
    body: JSON.stringify({
      model: model, 
      messages: [{ role: "user", content: prompt }],
      temperature: temperature,
      max_tokens: 8192, // 确保长脚本输出不被截断
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "请求失败");
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

/**
 * 1. 深度大纲生成：按阶段划分 (5-9集一阶段)
 */
export const generateStoryOutline = async (
  originalText: string,
  layoutRefText: string,
  styleRefText: string
) => {     
  const outlineSource = originalText.substring(0, 300000); 
  const prompt = `
    你现在是一名专业的短剧总编剧。你的任务是基于【原著小说内容】进行剧本阶段规划。
    
    【核心任务】：
    请将 60-80 集的体量划分为多个【剧情阶段】，每个阶段必须包含 5-9 集。
    
    【阶段规划要求】：
    1. **爽剧节奏**：每个阶段必须设定一个明确的【阶段高能爽点/大高潮】。
    2. **结构清晰**：每个阶段必须注明：包含集数、原著对应章节、核心冲突、本阶段终极钩子。
    3. **改编权重**：允许在不偏离原著核心逻辑的前提下，为了爽感调整剧情节奏。

    【输出格式】：
    ---
    【阶段规划路线图】
    阶段 1（第 1-9 集）：[阶段标题] | 原著对应：第X章-第Y章
    - 核心爽点：...
    - 阶段终点：...
    
    阶段 2（第 10-15 集）：...
    (以此类推，覆盖全篇)
    ---

    【大纲创作要求】：
    - 逻辑溯源：确保阶段高潮直接源自 <ORIGINAL_NOVEL> 的冲突。
    - 视觉克隆：复刻 <LAYOUT_TEMPLATE> 的排版。

    <ORIGINAL_NOVEL>
    ${outlineSource}
    </ORIGINAL_NOVEL>

    <LAYOUT_TEMPLATE>
    ${layoutRefText || '标准排版'}
    </LAYOUT_TEMPLATE>

    请开始生成阶段规划。
  `;

  return await callAI(prompt, 0.85, MODEL_ID);
};

/**
 * 2. 阶段剧本生成：递增式快照逻辑
 */
export const generateScriptSegment = async (
  startEp: number,            // 本阶段起始集数
  endEp: number,              // 本阶段结束集数
  currentPhasePlan: string,   // 当前阶段的大纲计划内容
  mode: 'male' | 'female',
  originalText: string,
  outlineText: string,
  previousScripts: string,
  layoutRefText: string,
  styleRefText: string,
  accumulatedSummary: string, // 【核心】递增式的累积快照总结
) => {
  const totalLength = originalText.length;
  // 根据起始集数动态定位原著位置 (以80集为基准)
  const progressRatio = (startEp - 1) / 80; 
  let startPos = Math.max(0, Math.floor(totalLength * progressRatio) - 20000);
  const windowSize = 150000; // 阶段生成需要更广的正文视野
  const dynamicSource = originalText.substring(startPos, startPos + windowSize);
  
  // 提供最近 2.5 万字的脚本细节记忆
  const contextHistory = previousScripts ? previousScripts.substring(previousScripts.length - 25000) : '暂无前序脚本';

  const prompt = `
    任务：【阶段剧本创作】编写第 ${startEp} - ${endEp} 集全量脚本。
    
    【递增式剧情快照（你必须先阅读并承接）】：
    ${accumulatedSummary || '这是故事的开篇。'}

    【阶段目标】：
    ${currentPhasePlan}

    【核心指令】：
    1. **0秒接戏**：检查 <PREVIOUS_CONTEXT> 最后一行，第 ${startEp} 集第一场必须无缝衔接。
    2. **1:10 扩容描写**：每一集包含 2-3 个冲突点。将原著细节视觉化，单集体量需支撑 2-3 分钟视频。
    3. **具象化协议**：严禁“大量信息灌入”等模糊词。必须写出主角看到了什么、听到了什么、做了什么。
    4. **拒绝魔改**：在节奏适配爽剧的同时，严禁自创原著中没有的关键人物和设定。

    【⚠️ 重要：递增式快照更新要求】：
    在输出完本阶段所有剧本后，你必须以【全剧累积剧情快照更新】为标题，输出一段文字。
    要求：将本阶段（第 ${startEp}-${endEp} 集）发生的核心事件，有机地整合进之前的 <递增式剧情快照> 中，形成一份截至目前最完整的“递增式全剧档案”。

    【输入资料】：
    <ORIGINAL_SOURCE>
    ${dynamicSource} 
    </ORIGINAL_SOURCE>

    <PREVIOUS_CONTEXT>
    ${contextHistory.substring(contextHistory.length - 1500)} 
    </PREVIOUS_CONTEXT>

    请开始编写第 ${startEp} - ${endEp} 集脚本，并更新累积快照。
  `;

  return await callAI(prompt, 0.85, MODEL_ID);
};
