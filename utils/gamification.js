const STORAGE_KEY = "workBuddyGameState";

const LEVELS = [
  { level: 1, title: "试用期小搭子", min: 0 },
  { level: 2, title: "准点喝水员", min: 5 },
  { level: 3, title: "工位陪伴官", min: 12 },
  { level: 4, title: "摸鱼观察员", min: 22 },
  { level: 5, title: "下班愿望守护者", min: 35 },
  { level: 6, title: "搭子圈活跃星", min: 55 },
  { level: 7, title: "打工生存专家", min: 80 },
  { level: 8, title: "宠物福利合伙人", min: 110 }
];

const DEFAULT_STATE = {
  points: 0,
  eventsByDay: {},
  completedTasksByDay: {},
  mysticSignsByDay: {},
  wishes: [],
  personalityResult: null
};

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadGameState() {
  const saved = wx.getStorageSync(STORAGE_KEY) || {};

  return Object.assign({}, DEFAULT_STATE, saved, {
    eventsByDay: saved.eventsByDay || {},
    completedTasksByDay: saved.completedTasksByDay || {},
    mysticSignsByDay: saved.mysticSignsByDay || {},
    wishes: saved.wishes || []
  });
}

function saveGameState(state) {
  wx.setStorageSync(STORAGE_KEY, state);
  return state;
}

function getPetLevel(points) {
  const current = LEVELS.reduce((matched, item) => {
    if (points >= item.min) return item;
    return matched;
  }, LEVELS[0]);
  const currentIndex = LEVELS.findIndex((item) => item.level === current.level);
  const next = LEVELS[currentIndex + 1] || null;
  const levelStart = current.min;
  const levelEnd = next ? next.min : current.min + 40;
  const progress = Math.min(100, Math.round(((points - levelStart) / (levelEnd - levelStart)) * 100));

  return Object.assign({}, current, {
    nextTitle: next ? next.title : "福利合伙人进阶中",
    nextPoints: next ? next.min : levelEnd,
    progress
  });
}

function buildGameSummary(state) {
  const today = getTodayKey();
  const todayEvents = state.eventsByDay[today] || {};
  const todayPoints = Object.keys(todayEvents).reduce((sum, key) => {
    return sum + todayEvents[key].points;
  }, 0);

  return {
    points: state.points,
    todayPoints,
    level: getPetLevel(state.points),
    wishes: state.wishes,
    todayMystic: state.mysticSignsByDay[today] || null,
    personalityResult: state.personalityResult,
    completedTasks: state.completedTasksByDay[today] || {}
  };
}

function addPoints(eventId, points, options = {}) {
  const today = getTodayKey();
  const state = loadGameState();
  const events = state.eventsByDay[today] || {};
  const existing = events[eventId];
  const dailyLimit = options.dailyLimit || 1;

  if (existing && existing.count >= dailyLimit) {
    return {
      added: 0,
      limited: true,
      state,
      summary: buildGameSummary(state)
    };
  }

  events[eventId] = {
    count: existing ? existing.count + 1 : 1,
    points: (existing ? existing.points : 0) + points
  };
  state.eventsByDay[today] = events;
  state.points += points;
  saveGameState(state);

  return {
    added: points,
    limited: false,
    state,
    summary: buildGameSummary(state)
  };
}

function completeDailyTask(task) {
  const today = getTodayKey();
  const state = loadGameState();
  const completed = state.completedTasksByDay[today] || {};

  if (completed[task.id]) {
    return {
      added: 0,
      limited: true,
      state,
      summary: buildGameSummary(state)
    };
  }

  completed[task.id] = true;
  state.completedTasksByDay[today] = completed;
  saveGameState(state);

  return addPoints(task.eventId || task.id, task.points || 1, { dailyLimit: task.dailyLimit || 1 });
}

function addWish(text) {
  const content = String(text || "").trim().slice(0, 24);
  if (!content) return { added: 0, empty: true, summary: buildGameSummary(loadGameState()) };

  const state = loadGameState();
  const wish = {
    id: Date.now(),
    text: content,
    date: getTodayKey()
  };
  state.wishes = [wish].concat(state.wishes || []).slice(0, 12);
  saveGameState(state);

  return addPoints("wish_added", 1, { dailyLimit: 1 });
}

function removeWish(id) {
  const state = loadGameState();
  const targetId = Number(id);

  state.wishes = (state.wishes || []).filter((wish) => Number(wish.id) !== targetId);
  saveGameState(state);

  return buildGameSummary(state);
}

function saveDailyMysticSign(sign) {
  const today = getTodayKey();
  const state = loadGameState();

  state.mysticSignsByDay[today] = Object.assign({}, sign, {
    date: today
  });
  saveGameState(state);

  return buildGameSummary(state);
}

function getDailyMysticSign() {
  const today = getTodayKey();
  const state = loadGameState();

  return state.mysticSignsByDay[today] || null;
}

function savePersonalityResult(result) {
  const state = loadGameState();
  state.personalityResult = Object.assign({}, result, {
    date: getTodayKey()
  });
  saveGameState(state);

  return addPoints("personality_test", 2, { dailyLimit: 1 });
}

module.exports = {
  addPoints,
  addWish,
  buildGameSummary,
  completeDailyTask,
  getPetLevel,
  getDailyMysticSign,
  loadGameState,
  removeWish,
  saveDailyMysticSign,
  savePersonalityResult
};
