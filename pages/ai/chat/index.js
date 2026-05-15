const { askAI } = require("../../../utils/ai");

Page({
  data: {
    prompt: "",
    loading: false,
    scrollTo: "",
    messages: [
      {
        id: 1,
        role: "assistant",
        content: "你好，我是你的 AI 助手。你可以让我写文案、总结内容、规划方案或解释问题。"
      }
    ]
  },

  onInput(event) {
    this.setData({ prompt: event.detail.value });
  },

  async sendMessage() {
    const prompt = this.data.prompt.trim();
    if (!prompt || this.data.loading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: prompt
    };

    this.setData({
      prompt: "",
      loading: true,
      messages: this.data.messages.concat(userMessage),
      scrollTo: `msg-${userMessage.id}`
    });

    try {
      const result = await askAI(prompt);
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: result.text
      };
      this.setData({
        messages: this.data.messages.concat(assistantMessage),
        scrollTo: `msg-${assistantMessage.id}`
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
