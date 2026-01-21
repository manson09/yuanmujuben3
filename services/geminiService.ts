
import { GoogleGenAI } from "@google/genai";

/**
 * 指向性保护协议 (Directional Protection Protocol):
 * 1. 严格标签隔离：使用 XML 风格标签包裹不同性质的输入。
 * 2. 职责唯一性：明确原著是剧情的唯一来源，参考文件禁止贡献任何情节。
 * 3. 进度锚定协议：确保脚本生成不跨越规划阶段，解决节奏过快问题。
 */

export const generateStoryOutline = async (
  originalText: string,
  layoutRefText: string,
  styleRefText: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';
  
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

    请开始分析并生成。
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.85,
      thinkingConfig: { thinkingBudget: 6000 }
    }
  });

  return response.text;
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';

  const startEp = (batchIndex - 1) * 3 + 1;
  const endEp = batchIndex * 3;
  const contextHistory = previousScripts ? previousScripts.substring(previousScripts.length - 12000) : '无往期脚本';

  const prompt = `
    任务：编写动漫脚本 第 ${startEp} - ${endEp} 集。
    频道：${mode === 'male' ? '男频' : '女频'}

    【核心指令：抗 AI 痕迹与拟人化策略】：
    1. **用词随机化**：禁止使用“于是”、“竟然”、“不仅如此”、“与此同时”、“但是”等标准 AI 逻辑词。尝试使用更具画面感的动词（如：猛地一滞、嘴角微抽）或更随意的口语引导。
    2. **标点动力学**：禁止只使用逗号和句号。大量引入省略号(...)表示迟疑、破折号(——)表示思绪中断或反转、感叹号(!)增强冲击力。模仿人类写作时的高低起伏。
    3. **句式异构**：打破平铺直叙。采用“长句渲染背景+短句爆发动作”的组合。例如：不要写“他很生气地推开了门”，要写“门砰的一声，被那股按捺不住的劲头直接撞在了墙上。他进来了。”
    4. **细节噪点**：在推进剧情时，偶尔加入 1-2 处非核心动作描写（如：拍了拍袖口的灰、瞥了一眼窗外的枯枝），这种非逻辑性的“生活感”是突破 AI 检测的关键。

    【当前执行进度与关联约束】：
    1. **阶段定位**：从 <STORY_OUTLINE> 的路线图中确定当前集数对应的原著范围，严禁跨段。
    2. **扩容系数**：将大纲的一个动作点拆解为多维度的视觉描写，确保节奏扎实。

    【输入资料】：
    <ORIGINAL_SOURCE>${originalText.substring(0, 15000)}</ORIGINAL_SOURCE>
    <STORY_OUTLINE>${outlineText}</STORY_OUTLINE>
    <PREVIOUS_CONTEXT>${contextHistory}</PREVIOUS_CONTEXT>
    <STYLE_AND_LAYOUT>
    参考文笔：${styleRefText || '人类化自然叙事'}
    参考排版：${layoutRefText}
    </STYLE_AND_LAYOUT>

    请根据以上“拟人化写作”策略，输出第 ${startEp} - ${endEp} 集脚本。
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.95, // 提高采样随机性
      topP: 0.98,
      topK: 40,
      thinkingConfig: { thinkingBudget: 8000 }
    }
  });

  return response.text;
};
