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
  const epsPerStage = 10; 
  const startEp = (batchIndex - 1) * epsPerStage + 1;
  const endEp = batchIndex * epsPerStage;

  const progressRatio = (startEp - 1) / 80; 
  let startPos = Math.max(0, Math.floor(totalLength * progressRatio) - 15000);
  const windowSize = 120000; 
  const dynamicSource = originalText.substring(startPos, startPos + windowSize);
  const contextHistory = previousScripts ? previousScripts.substring(previousScripts.length - 25000) : '无往期脚本';

  const prompt = `
    任务：编写动漫脚本 第 ${startEp} - ${endEp} 集。
    
    【！！具象化死线协议 - 严禁模糊！！】：
    1. **禁止使用抽象词**：严禁出现“记忆洪流”、“庞大的信息”、“复杂的知识”、“一股暖流”等万金油描述。
    2. **必须拆解细节**：如果原著中主角获得了记忆或传承，你必须根据 <ORIGINAL_SOURCE> 拆解成具体的画面、声音或招式。
       - 错误：大量记忆灌入项云大脑。
       - 正确示例：▲ 项云识海剧震，他看到了：[三千年前青云剑仙斩断山脉的残影]、[一套名为‘吞天诀’的运行经脉图]、以及[一个满头白发的残魂在耳边的嘶吼]。
    3. **视觉传达**：所有的“知道”都要转化为“看到”或“听到”。

    【衔接与档案】：
    存档点：${previousSummary || '初次开始'}
    接戏点：${contextHistory.substring(contextHistory.length - 1000)}

    【角色与动作规则】：
    - **强制实名**：严禁使用“他、她、它”。动作描述必须带角色全名。
    - **禁止脑补**：所有剧情必须源自 <ORIGINAL_SOURCE>，严禁自创原著没有的设定。

    【输出格式】：
    1. [第 ${startEp} - ${endEp} 集剧本]
    2. 【本次剧情快照更新】（150字，总结目前主角的状态和关键变量）

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

    请开始编写。
  `;

  return await callAI(prompt, 0.85, MODEL_ID);
};
