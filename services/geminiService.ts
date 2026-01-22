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

  const epsPerStage = 5; 
  const startEp = (batchIndex - 1) * epsPerStage + 1;
  const endEp = batchIndex * epsPerStage;

  const progressRatio = (startEp - 1) / 80; 
  let startPos = Math.max(0, Math.floor(totalLength * progressRatio) - 15000);
  const windowSize = 120000; 
  const dynamicSource = originalText.substring(startPos, startPos + windowSize);
  const contextHistory = previousScripts ? previousScripts.substring(previousScripts.length - 25000) : '无往期脚本';

  const prompt = `
    任务：【深度扩容创作】编写动漫脚本 第 ${startEp} - ${endEp} 集。
    
    【核心目标：单集体量 2-3 分钟】：
    1. **扩容比例 (1:10)**：严禁直接翻译原著。你必须将原著的一句描述拆解为多组【动作、神态、环境、潜台词】。
       - 原著：项云走进大厅，众人震惊。
       - 你的扩容：[镜头1：项云沾血的靴子踏入大厅]、[镜头2：众人停止议论，杯子摔碎声]、[镜头3：反派瞳孔微缩，手按住刀柄]、[对话：...潜台词交锋...]。
    2. **冲突密度 (3-Beat-Rule)**：每一集必须包含 2-3 个小型冲突（或情绪反转）。
    3. **黄金钩子**：每一集的最后一行，必须停在一个巨大的【悬念】或【情绪爆发点】上，强迫观众点击下一集。

    【绝对死线：拒绝魔改】：
    1. **忠于原著逻辑**：扩容是指“增加视觉表现力”，而不是“乱加剧情”。
    2. **严禁自创人物**：所有出场人物、关键道具、功法设定必须直接取自 <ORIGINAL_SOURCE>。
    3. **禁止降智**：保持原著人物的性格深度。

    【单集结构模版（强制执行）】：
    - [开场]：接续上一集钩子，迅速进入本集主矛盾。
    - [中段]：1-2 次情绪拉扯或动作交锋，展现原著细节。
    - [结尾]：爆发本集最大的冲突点，并在悬念处戛然而止。

    【衔接与档案】：
    存档点：${previousSummary}
    接戏点：${contextHistory.substring(contextHistory.length - 1200)}

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

    请根据以上要求，以${mode === 'male' ? '男频' : '女频'}爽剧节奏，输出第 ${startEp} - ${endEp} 集。
    并在文末输出：【本次剧情快照更新】。
  `;

  return await callAI(prompt, 0.85, MODEL_ID);
};
