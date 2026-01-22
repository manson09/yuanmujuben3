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

// 修改点 2: 函数参数调整，移除 batchIndex，加入阶段起始/结束集数及该阶段大纲描述
export const generateScriptStage = async (
  startEp: number,            // 阶段起始集数
  endEp: number,              // 阶段结束集数
  currentStagePlan: string,   // 当前阶段的大纲描述/目标
  mode: 'male' | 'female',
  originalText: string,
  outlineText: string,
  previousScripts: string,
  layoutRefText: string,
  styleRefText: string,
  previousSummary: string,
) => {
  const totalLength = originalText.length;
  // 修改点 3: 逻辑定位改为基于起始集数在总体量（假设80集）中的比例
  const progressRatio = (startEp - 1) / 80; 
  let startPos = Math.floor(totalLength * progressRatio);
  
  // 修改点 4: 扩大正文视野至 12 万字，确保覆盖整个阶段所需素材
  const windowSize = 120000; 
  startPos = Math.max(0, startPos - 15000); 
  const dynamicSource = originalText.substring(startPos, startPos + windowSize);

  // 修改点 5: 增加剧本记忆长度至 25000 字符，确保多集衔接不乱
  const contextHistory = previousScripts ? previousScripts.substring(previousScripts.length - 25000) : '无往期脚本';


  const prompt = `
    任务：编写动漫脚本 【全阶段任务：第 ${startEp} - ${endEp} 集】。
    本阶段核心目标：${currentStagePlan}
    频道：${mode === 'male' ? '男频' : '女频'}

    【当前剧情档案 - 绝对不可遗忘】：
    ${previousSummary}

    【上一集精确结尾】：
    ${contextHistory.substring(contextHistory.length - 1200)} 

    【⚠️ 衔接接力棒 - 极其重要】：
    1. 你必须无缝接戏。第 ${startEp} 集的第一场戏，必须直接复读上一集最后那句台词或动作。
    2. 严禁跳跃时间，严禁出现“次日”，必须是 0 秒衔接。

    【阶段生成指令】：
    1. 你必须一次性输出第 ${startEp} 集到第 ${endEp} 集的完整脚本。
    2. 严格遵循 <STORY_OUTLINE> 中关于本阶段的剧情路线，不得遗漏核心钩子。
    3. 每一集必须保持高质量的细节描写，严禁因为集数多而压缩内容。

    【角色身份透明化协议 (Character Clarity Protocol)】：
    1. **严禁匿名**：禁止使用“黑袍女子”等模糊称呼，必须实名。
    2. **强制主语**：每一行动作描写必须直接使用角色全名（如：▲ 项云拔剑）。

    【⚠️ 输出格式要求】：
    1. 请先输出 [第 ${startEp} - ${endEp} 集完整剧本]。
    2. 剧本结束后，必须另起一行，输出 【本次剧情快照更新】。
    3. 【本次剧情快照更新】要求：用200字总结截至第 ${endEp} 集，主角的位置、人际关系状态、关键矛盾、以及下一阶段必须立刻处理的悬念。

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
