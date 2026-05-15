const { generateImageIdea } = require("../../../utils/ai");

Page({
  data: {
    prompt: "",
    loading: false,
    result: ""
  },

  onInput(event) {
    this.setData({ prompt: event.detail.value });
  },

  async createIdea() {
    const prompt = this.data.prompt.trim();
    if (!prompt || this.data.loading) {
      wx.showToast({ title: "先输入图片想法", icon: "none" });
      return;
    }

    this.setData({ loading: true });
    try {
      const result = await generateImageIdea(prompt);
      this.setData({ result: result.text });
    } finally {
      this.setData({ loading: false });
    }
  }
});
