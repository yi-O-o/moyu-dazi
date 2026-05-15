const DEFAULT_WORK_CONFIG = {
  monthlySalary: 10000,
  workDaysPerMonth: 22,
  startTime: "09:00",
  endTime: "18:00"
};

const WORK_CONFIG_STORAGE_KEY = "workConfig";

function normalizeWorkConfig(config = {}) {
  const monthlySalary = Number(config.monthlySalary) || DEFAULT_WORK_CONFIG.monthlySalary;
  const workDaysPerMonth = Number(config.workDaysPerMonth) || DEFAULT_WORK_CONFIG.workDaysPerMonth;

  return {
    monthlySalary: Math.max(1, monthlySalary),
    workDaysPerMonth: Math.max(1, workDaysPerMonth),
    startTime: config.startTime || DEFAULT_WORK_CONFIG.startTime,
    endTime: config.endTime || DEFAULT_WORK_CONFIG.endTime
  };
}

function loadWorkConfig() {
  if (typeof wx === "undefined" || !wx.getStorageSync) {
    return DEFAULT_WORK_CONFIG;
  }

  try {
    return normalizeWorkConfig(wx.getStorageSync(WORK_CONFIG_STORAGE_KEY));
  } catch (error) {
    return DEFAULT_WORK_CONFIG;
  }
}

function saveWorkConfig(config) {
  const normalized = normalizeWorkConfig(config);

  if (typeof wx !== "undefined" && wx.setStorageSync) {
    wx.setStorageSync(WORK_CONFIG_STORAGE_KEY, normalized);
  }

  return normalized;
}

function parseTimeToDate(time, baseDate) {
  const parts = time.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function pad(value) {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const restSeconds = safeSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(restSeconds)}`;
}

function getPetMood(status, remainingSeconds) {
  if (status === "before") {
    return {
      label: "准备开工",
      message: "先泡杯水，等你按下开始搬砖。"
    };
  }

  if (status === "after") {
    return {
      label: "自由时间",
      message: "今天的钱已经到账，去过点自己的生活。"
    };
  }

  if (remainingSeconds <= 1800) {
    return {
      label: "准备跑路",
      message: "快下班了，我已经把下班雷达打开。"
    };
  }

  return {
    label: "陪你搬砖",
    message: "钱在慢慢涨，我们稳住节奏。"
  };
}

function getWorkStats(config = DEFAULT_WORK_CONFIG, now = new Date()) {
  const mergedConfig = normalizeWorkConfig(config);
  const start = parseTimeToDate(mergedConfig.startTime, now);
  const end = parseTimeToDate(mergedConfig.endTime, now);
  const totalSeconds = Math.max(1, Math.floor((end - start) / 1000));
  const dailyIncome = mergedConfig.monthlySalary / mergedConfig.workDaysPerMonth;
  const incomePerSecond = dailyIncome / totalSeconds;

  let workedSeconds = 0;
  let remainingSeconds = totalSeconds;
  let status = "before";

  if (now >= end) {
    workedSeconds = totalSeconds;
    remainingSeconds = 0;
    status = "after";
  } else if (now >= start) {
    workedSeconds = Math.floor((now - start) / 1000);
    remainingSeconds = Math.max(0, totalSeconds - workedSeconds);
    status = "working";
  }

  const earned = Math.min(dailyIncome, workedSeconds * incomePerSecond);
  const progressPercent = Math.min(100, Math.max(0, (workedSeconds / totalSeconds) * 100));
  const petMood = getPetMood(status, remainingSeconds);

  return {
    status,
    earned: earned.toFixed(2),
    dailyIncome: dailyIncome.toFixed(2),
    incomePerSecond: incomePerSecond.toFixed(4),
    workedTime: formatDuration(workedSeconds),
    remainingTime: formatDuration(remainingSeconds),
    progressPercent: progressPercent.toFixed(1),
    petMood,
    config: mergedConfig
  };
}

module.exports = {
  DEFAULT_WORK_CONFIG,
  loadWorkConfig,
  saveWorkConfig,
  getWorkStats
};
