const { getWorkStats, loadWorkConfig, saveWorkConfig } = require("../../../utils/workday");

Page({
  data: {
    config: loadWorkConfig(),
    stats: getWorkStats(loadWorkConfig()),
    form: loadWorkConfig(),
    showSettings: false,
    coins: [
      { id: 1, className: "coin one", text: "¥" },
      { id: 2, className: "bill two", text: "¥" },
      { id: 3, className: "coin three large", text: "¥" },
      { id: 4, className: "bill four wide", text: "¥" },
      { id: 5, className: "coin five small", text: "¥" },
      { id: 6, className: "bill six", text: "¥" },
      { id: 7, className: "coin seven", text: "¥" },
      { id: 8, className: "bill eight wide", text: "¥" },
      { id: 9, className: "coin nine small", text: "¥" },
      { id: 10, className: "bill ten", text: "¥" },
      { id: 11, className: "coin eleven large", text: "¥" },
      { id: 12, className: "bill twelve", text: "¥" }
    ]
  },

  onShow() {
    this.active = true;
    const config = loadWorkConfig();
    this.setData({
      config,
      form: config
    });
    this.startTicker();
  },

  onHide() {
    this.active = false;
    this.stopTicker();
  },

  onUnload() {
    this.active = false;
    this.stopTicker();
  },

  startTicker() {
    this.stopTicker();
    this.refreshStats();
    this.scheduleNextTick();
  },

  stopTicker() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  },

  scheduleNextTick() {
    if (!this.active) return;

    this.timer = setTimeout(() => {
      this.refreshStats();
      this.scheduleNextTick();
    }, 1000);
  },

  refreshStats() {
    this.setData({
      stats: getWorkStats(this.data.config)
    });
  },

  onSalaryInput(event) {
    this.setData({
      "form.monthlySalary": event.detail.value
    });
  },

  onDaysInput(event) {
    this.setData({
      "form.workDaysPerMonth": event.detail.value
    });
  },

  onStartTimeChange(event) {
    this.setData({
      "form.startTime": event.detail.value
    });
  },

  onEndTimeChange(event) {
    this.setData({
      "form.endTime": event.detail.value
    });
  },

  openSettings() {
    this.setData({
      showSettings: true,
      form: this.data.config
    });
  },

  closeSettings() {
    this.setData({
      showSettings: false,
      form: this.data.config
    });
  },

  noop() {},

  saveSettings() {
    const config = saveWorkConfig(this.data.form);
    this.setData({
      config,
      form: config,
      stats: getWorkStats(config),
      showSettings: false
    });

    wx.showToast({
      title: "已保存",
      icon: "success",
      duration: 1200
    });
  }
});
