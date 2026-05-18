const DEFAULT_CONFIG = {
  monthlySalary: 10000,
  workDaysPerMonth: 22,
  startTime: "09:00",
  endTime: "18:00"
};

const DEFAULT_STATS = {
  status: "before",
  earned: "0.00",
  dailyIncome: "454.55",
  incomePerSecond: "0.0140",
  workedTime: "00:00:00",
  remainingTime: "09:00:00",
  progressPercent: "0.0",
  config: DEFAULT_CONFIG
};

let workdayApi = null;

function copyConfig(config) {
  return Object.assign({}, DEFAULT_CONFIG, config || {});
}

function localGetWorkStats(config) {
  const mergedConfig = copyConfig(config);
  const monthlySalary = Number(mergedConfig.monthlySalary) || DEFAULT_CONFIG.monthlySalary;
  const workDaysPerMonth = Number(mergedConfig.workDaysPerMonth) || DEFAULT_CONFIG.workDaysPerMonth;
  const dailyIncome = monthlySalary / Math.max(1, workDaysPerMonth);

  return Object.assign({}, DEFAULT_STATS, {
    dailyIncome: dailyIncome.toFixed(2),
    config: mergedConfig
  });
}

function getWorkdayApi() {
  if (workdayApi) return workdayApi;

  try {
    const api = require("../../utils/workday");
    workdayApi = {
      loadWorkConfig: api.loadWorkConfig,
      saveWorkConfig: api.saveWorkConfig,
      getWorkStats: api.getWorkStats
    };
  } catch (error) {
    workdayApi = {
      loadWorkConfig() {
        return DEFAULT_CONFIG;
      },
      saveWorkConfig(config) {
        return copyConfig(config);
      },
      getWorkStats(config) {
        return localGetWorkStats(config);
      }
    };
  }

  return workdayApi;
}

Page({
  data: {
    config: DEFAULT_CONFIG,
    stats: DEFAULT_STATS,
    form: DEFAULT_CONFIG,
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

    const api = getWorkdayApi();
    const config = copyConfig(api.loadWorkConfig());
    const stats = api.getWorkStats(config);

    this.setData({
      config,
      form: copyConfig(config),
      stats
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
    const stats = getWorkdayApi().getWorkStats(this.data.config);
    this.setData({
      stats
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
      form: copyConfig(this.data.config)
    });
  },

  closeSettings() {
    this.setData({
      showSettings: false,
      form: copyConfig(this.data.config)
    });
  },

  noop() {},

  saveSettings() {
    const api = getWorkdayApi();
    const config = copyConfig(api.saveWorkConfig(this.data.form));
    const stats = api.getWorkStats(config);

    this.setData({
      config,
      form: copyConfig(config),
      stats,
      showSettings: false
    });

    wx.showToast({
      title: "已保存",
      icon: "success",
      duration: 1200
    });
  }
});
