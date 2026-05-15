const mockDelay = 500;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function askAI(prompt) {
  await wait(mockDelay);
  return {
    text: `这是示例回复：我已经理解你的问题「${prompt}」。接入后端后，这里会返回真实 AI 模型生成的内容。`
  };
}

async function generateCopy({ topic, tone }) {
  await wait(mockDelay);
  return {
    text: `【${tone}】${topic}\n\n1. 提炼用户痛点\n2. 给出清晰利益点\n3. 用一句行动号召收尾\n\n接入 AI 接口后，这里会生成完整文案。`
  };
}

async function generateImageIdea(prompt) {
  await wait(mockDelay);
  return {
    text: `图片创意提示词：${prompt}，高清质感，主体清晰，构图干净，适合小程序封面和社交分享。`
  };
}

module.exports = {
  askAI,
  generateCopy,
  generateImageIdea
};
