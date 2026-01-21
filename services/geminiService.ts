const QWEN_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const QWEN_URL = import.meta.env.VITE_BASE_URL;

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = import.meta.env.VITE_GEMINI_BASE_URL;

const OUTLINE_MODEL = "google/gemini-3-flash-Preview"; 
const SCRIPT_MODEL = "qwen3-max"; 

const callAI = async (prompt: string, temperature: number, config: { url: string, key: string, model: string }) => {
  const response = await fetch(`${config.url}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "YuanMu AI Workshop",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};
export const generateStoryOutline = async (
  originalText: string,
  layoutRefText: string,
  styleRefText: string
) => {     
   const outlineSource = originalText.substring(0, 400000); 
 const prompt = `
    你现在是一名专业的漫剧总编剧。你的任务是基于【原著小说内容】创作深度大纲。
    
    【输入指令 - 优先级声明】：
    1. <ORIGINAL_NOVEL> 标签内是【唯一剧情来源】。严禁从其他标签中提取任何人物、背景或事件。
    2. <STYLE_REFERENCE> 标签内仅用于【词汇与语气参考】。
    3. <LAYOUT_TEMPLATE> 标签内仅用于【排版符号参考】。

    <ORIGINAL_NOVEL>
    ${originalText}
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

  return await callAI(prompt, 0.85, {
    url: GEMINI_URL,
    key: GEMINI_KEY,
    model: OUTLINE_MODEL
  });
};

export const generateScriptSegment = async (
  batchIndex: number,
  mode: 'male' | 'female',
  originalText: string,
  outlineText: string,
  previousScripts: string,
  layoutRefText: string,
  styleRefText: string
) => {
  const totalLength = originalText.length;
  const totalBatches = 27; 

  const progressRatio = (batchIndex - 1) / totalBatches;
  let startPos = Math.floor(totalLength * progressRatio);
  
  startPos = Math.max(0, startPos - 5000);
  let endPos = Math.min(totalLength, startPos + 50000); 

  const dynamicSource = originalText.substring(startPos, endPos);

  const startEp = (batchIndex - 1) * 3 + 1;
  const endEp = batchIndex * 3;
  const contextHistory = previousScripts ? previousScripts.substring(previousScripts.length - 2500) : '无往期脚本';


  const prompt = `
    任务：编写动漫脚本 第 ${startEp} - ${endEp} 集。
    频道：${mode === 'male' ? '男频' : '女频'}

        【核心指令：抗 AI 痕迹与拟人化策略】：
    1. **用词随机化**：禁止使用“于是”、“竟然”、“不仅如此”、“与此同时”、“但是”等标准 AI 逻辑词。尝试使用更具画面感的动词（如：猛地一滞、嘴角微抽）或更随意的口语引导。
    2. **标点动力学**：禁止只使用逗号和句号。大量引入省略号(...)表示迟疑、破折号(——)表示思绪中断或反转、感叹号(!)增强冲击力。模仿人类写作时的高低起伏。
    3. **句式异构**：打破平铺直叙。采用“长句渲染背景+短句爆发动作”的组合。例如：不要写“他很生气地推开了门”，要写“门砰的一声，被那股按捺不住的劲头直接撞在了墙上。他进来了。”
    4. **细节噪点**：在推进剧情时，偶尔加入 1-2 处非核心动作描写（如：拍了拍袖口的灰、瞥了一眼窗外的枯枝），这种非逻辑性的“生活感”是突破 AI 检测的关键。
    5. **视觉克隆**：如果 <LAYOUT_TEMPLATE> 中使用了特殊的括号（如【】）或分段标记，请在输出中完整复刻。禁止生成<LAYOUT_TEMPLATE>没有的符号 
    6. **抗AI干扰**：保持语言的熵值，避免使用 AI 常用连接词（如“然而”、“因此”）。
    7. **禁止成语与辞藻堆砌**：除了原著小说有的台词之外，严禁使用任何四字成语（如：气吞山河、惊疑不定、深不见底）。如果必须表达这些意思，请换成大白话（例如：气势很凶、被吓了一跳、黑得看不见底）。

    【角色身份透明化协议 (Character Clarity Protocol)】：
1. **严禁匿名**：禁止在动作描写或对白中使用“黑袍女子”、“中年文士”、“神秘人”等模糊称呼。
2. **强制实名**：如果该角色在大纲或原著中有名字，必须直接写名字（例如：▲ 这里的黑袍女子是【青妩】，必须写：▲ 青妩睁眼）。
3. **身份备注**：如果是新出现的龙套或反派，必须在第一次出现时用括号注明身份（例如：▲ [大内高手]黑衣人、▲ [相府死士]中年人）。
4. **视觉关联**：所有人物动作必须锚定身份，让导演和演员一眼看出是谁在推动剧情。

     【默认归属规则】
   - 若动作紧接某角色台词出现，且未明确指向其他人，
     则该动作必须直接使用该角色名作为主语，而不是代词。
     必须实名：每一行动作描写必须直接使用角色全名。
     错误示例： ▲ 他盯着林枫，一字一顿。
     正确示例： ▲ 项云盯着林枫，一字一顿。
     多角色识别：如果场景中有多个角色，必须清晰标注谁在做动作（例如：▲ 项云拔剑，林枫后退）。
     
         【零秒衔接指令】：
    - 严格分析下方的 <PREVIOUS_CONTEXT> 最后一段。
    - 第 ${startEp} 集的第一句台词或第一个动作，必须完美承接上一集的最后一秒，严禁时间跳跃！

    【当前执行进度与关联约束】：
    1. **阶段定位**：从 <STORY_OUTLINE> 的路线图中确定当前集数对应的原著范围，严禁跨段。
    2. **扩容系数**：将大纲的一个动作点拆解为多维度的视觉描写，确保节奏扎实。

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

    请根据以上“拟人化写作”策略，输出第 ${startEp} - ${endEp} 集脚本。
  `;

  return await callAI(prompt, 0.95, {
        url: QWEN_URL,
        key: QWEN_KEY,
        model: SCRIPT_MODEL
    });
};
