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
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "请求失败");
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const generateStoryOutline = async (
  originalText: string,
  layoutRefText: string,
  styleRefText: string
) => {     
  const outlineSource = originalText.substring(0, 300000); 
 const prompt = `
    你现在是一名专业的漫剧总编剧。你的任务是基于【原著小说内容】创作深度大纲。
    
    【输入指令 - 优先级声明】：
    1. <ORIGINAL_NOVEL> 标签内是【唯一剧情来源】。严禁从其他标签中提取任何人物、背景或事件。
    2. <STYLE_REFERENCE> 标签内仅用于【词汇与语气参考】。
    3. <LAYOUT_TEMPLATE> 标签内仅用于【排版符号参考】。

    <ORIGINAL_NOVEL>
    ${outlineSource}
    </ORIGINAL_NOVEL>

    <STYLE_REFERENCE>
    ${styleRefText || '无特定的文笔参考，请保持人类化的爽剧叙事感。'}
    </STYLE_REFERENCE>

    <LAYOUT_TEMPLATE>
    ${layoutRefText || '无特定排版模版。'}
    </LAYOUT_TEMPLATE>

    【核心任务 - 阶段化规划】：
    在生成 2000-3000 字大纲之前，必须首先输出一份【剧本进度路线图】，确保 60-80 集的体量。
    格式要求：
    ---
    【剧本进度路线图】
    第 1-10 集：[阶段标题] | 原著对应章节：[第X章-第Y章] | 核心剧情钩子：...
    第 11-20 集：[阶段标题] | 原著对应章节：[第Y+1章-第Z章] | 核心剧情钩子：...
    （依此类推，覆盖 60-80 集全篇）
    ---

    【大纲创作要求】：
    - **逻辑溯源**：确保大纲中的每一个冲突都直接源自 <ORIGINAL_NOVEL>。
    - **节奏控制**：大纲内容必须详尽，尤其是前中期的铺垫，禁止直接写结局，要为 60-80 集预留足够的冲突空间。
    - **视觉克隆**：如果 <LAYOUT_TEMPLATE> 中使用了特殊的括号（如【】）或分段标记，请在输出中完整复刻。
    - **输出目标**：先输出《剧本进度路线图》，再输出 2000-3000 字的深度大纲。
    - **禁止事项**：禁止生成排版参考文件里没有的符号，保持排版整洁。

    请开始分析并生成。
  `;

    return await callAI(prompt, 0.85, MODEL_ID);
};

// 修复点 2: 函数名改回 generateScriptSegment 以免 build 报错
// 逻辑修改：将 batchIndex 映射为“阶段”。例如 batchIndex=1 生成 1-10集
export const generateScriptSegment = async (
  batchIndex: number,
  mode: 'male' | 'female',
  originalText: string,
  outlineText: string,
  previousScripts: string,
  layoutRefText: string,
  styleRefText: string,
  previousSummary: string,
) => {
  const totalLength = originalText.length;
  
  // 设定每个阶段生成的集数（例如改为 10 集一个阶段）
  const epsPerStage = 10; 
  const startEp = (batchIndex - 1) * epsPerStage + 1;
  const endEp = batchIndex * epsPerStage;

  // 动态定位原著位置（基于阶段进度）
  const progressRatio = (startEp - 1) / 80; 
  let startPos = Math.max(0, Math.floor(totalLength * progressRatio) - 15000);
  
  // 扩大正文视野至 12 万字，确保覆盖整个阶段素材
  const windowSize = 120000; 
  const dynamicSource = originalText.substring(startPos, startPos + windowSize);

  // 剧本记忆长度增加到 25000 字符
  const contextHistory = previousScripts ? previousScripts.substring(previousScripts.length - 25000) : '无往期脚本';

  const prompt = `
    任务：【全阶段剧本创作】编写动漫脚本 第 ${startEp} - ${endEp} 集。
    频道：${mode === 'male' ? '男频' : '女频'}

    【当前剧情档案 - 绝对存档点】：
    ${previousSummary || '初次开始，请基于大纲第一阶段进行。'}

    【上一集精确结尾（用于0秒衔接）】：
    ${contextHistory.substring(contextHistory.length - 1200)} 

    【核心指令】：
    1. 你必须一次性完成第 ${startEp} 到第 ${endEp} 集的完整脚本。
    2. 第 ${startEp} 集的第一场戏必须与 <PREVIOUS_CONTEXT> 结尾动作无缝接戏。
    3. 禁止压缩剧情，确保每一集都有充足的对话和视觉描写。

    【角色身份透明化协议】：
    1. **强制实名**：严禁使用“他、她、黑袍人”，必须直接写名字（如：▲ 项云睁眼）。
    2. **动作归属**：每一行动作描写必须明确主语。

    【⚠️ 重要输出格式要求】：
    1. 请先输出 [第 ${startEp} - ${endEp} 集完整剧本]。
    2. 剧本结束后，必须另起一行，输出 【本次剧情快照更新】。
    3. 快照更新内容：用150字总结截至第 ${endEp} 集，主角的位置、人际关系状态、关键矛盾。

    【输入资料】：
    <ORIGINAL_SOURCE>
    ${dynamicSource} 
    </ORIGINAL_SOURCE>

    <STORY_OUTLINE>
    ${outlineText}
    </STORY_OUTLINE>

    <PREVIOUS_CONTEXT>
    ${contextHistory}
    </PREVIOUS_CONTEXT>

    <STYLE_AND_LAYOUT>
    参考文笔：${styleRefText || '人类化自然叙事'}
    参考排版：${layoutRefText}
    </STYLE_AND_LAYOUT>

    请开始编写第 ${startEp} - ${endEp} 集脚本。
  `;

  return await callAI(prompt, 0.85, MODEL_ID);
};
