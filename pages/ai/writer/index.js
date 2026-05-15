const { generateCopy } = require("../../../utils/ai");

Page({
  data: {
    topic: "",
    tones: ["专业可信", "轻松口语", "高转化营销", "温暖治愈"],
    toneIndex: 0,
    loading: false,
    result: ""
  },

  onTopicInput(event) {
    this.setData({ topic: event.detail.value });
  },

  onToneChange(event) {
    this.setData({ toneIndex: Number(event.detail.value) });
  },

  async createCopy() {
    const topic = this.data.topic.trim();
    if (!topic || this.data.loading) {
      wx.showToast({ title: "先输入主题", icon: "none" });
      return;
    }

    this.setData({ loading: true });
    try {
      const result = await generateCopy({
        topic,
        tone: this.data.tones[this.data.toneIndex]
      });
      this.setData({ result: result.text });
    } finally {
      this.setData({ loading: false });
    }
  }
});
