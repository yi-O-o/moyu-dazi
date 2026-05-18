const { DEFAULT_WORK_CONFIG, getWorkStats, loadWorkConfig } = require("../../../utils/workday");
const {
  addPoints,
  addWish,
  buildGameSummary,
  getDailyMysticSign,
  loadGameState,
  removeWish,
  saveDailyMysticSign
} = require("../../../utils/gamification");
const { createPost } = require("../../../utils/fishpond");
const { createMeetup } = require("../../../utils/meetups");

const OPEN_FISH_PUBLISH_KEY = "openFishPublishOnShow";

const MYSTIC_SIGNS = [
  {
    title: "宜低调搬砖",
    level: "小吉",
    desc: "今天适合先处理一个最烦的小任务，别跟突然出现的会议硬碰硬。",
    lucky: "幸运动作：喝水后再回复消息",
    avoid: "忌：空腹硬撑"
  },
  {
    title: "宜合理摸鱼",
    level: "中吉",
    desc: "你的精神电量需要缓冲。休息 5 分钟回来，效率比硬扛更像个人类。",
    lucky: "幸运动作：站起来走 30 秒",
    avoid: "忌：连续盯屏到灵魂离线"
  },
  {
    title: "宜盼下班",
    level: "大吉",
    desc: "今天的动力来自下班后的那点生活。给愿望池添一件小事，会更容易撑到收工。",
    lucky: "幸运安排：约饭、运动、回家躺平三选一",
    avoid: "忌：把今晚也交给工作"
  },
  {
    title: "宜假装淡定",
    level: "平安",
    desc: "事情可能很多，但不用一次解决全部。先守住节奏，宠物会替你盯着下班时间。",
    lucky: "幸运文案：我看一下进度后同步",
    avoid: "忌：刚开电脑就精神内耗"
  }
];

function getMysticSign() {
  const index = Math.floor(Math.random() * MYSTIC_SIGNS.length);
  return MYSTIC_SIGNS[index];
}

function buildPetMessage(summary) {
  if (summary.todayMystic) {
    return `${summary.todayMystic.level}：${summary.todayMystic.title}`;
  }

  if (summary.wishes && summary.wishes.length) {
    return `今晚想${summary.wishes[0].text}，我帮你记着。`;
  }

  if (summary.todayPoints > 0) {
    return `今天已经攒了 ${summary.todayPoints} 分，蛮会过日子的。`;
  }

  return "我在首页陪你。";
}

function guessMeetupType(text) {
  if (/球|跑|运动|健身|羽毛球|篮球|网球/.test(text)) return "sport";
  if (/麻|牌|桌游/.test(text)) return "mahjong";
  if (/走|散步|逛|公园/.test(text)) return "walk";
  if (/电影|看剧|影院/.test(text)) return "movie";

  return "food";
}

function getWindowMetrics() {
  if (wx.getWindowInfo) {
    return wx.getWindowInfo();
  }

  return wx.getSystemInfoSync();
}

Page({
  data: {
    config: DEFAULT_WORK_CONFIG,
    stats: getWorkStats(DEFAULT_WORK_CONFIG),
    statusText: "打开今天，先给自己一点耐心。",
    dashboardMoney: [
      { id: 1, className: "dashboard-coin one" },
      { id: 2, className: "dashboard-bill two" },
      { id: 3, className: "dashboard-coin three" },
      { id: 4, className: "dashboard-bill four" },
      { id: 5, className: "dashboard-coin five" },
      { id: 6, className: "dashboard-bill six" }
    ],
    petMessage: "我在首页陪你。",
    petActionClass: "idle",
    petDragClass: "",
    homePetPosition: {
      x: 0,
      y: 0
    },
    game: buildGameSummary(loadGameState()),
    wishInput: "",
    mysticResult: null,
    pointFeedback: null
  },

  onLoad() {
    this.refreshStats();
  },

  onReady() {
    this.initHomePetPosition();
  },

  onShow() {
    this.active = true;
    this.setData({
      config: loadWorkConfig()
    });
    this.refreshGame();
    this.startTicker();
  },

  onHide() {
    this.active = false;
    this.stopTicker();
  },

  onUnload() {
    this.active = false;
    this.stopTicker();
    if (this.petTimer) clearTimeout(this.petTimer);
    if (this.pointTimer) clearTimeout(this.pointTimer);
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
    const stats = getWorkStats(this.data.config);
    this.setData({
      stats,
      statusText: this.getStatusText(stats.status)
    });
  },

  getStatusText(status) {
    if (status === "before") return "还没到点，先慢慢醒一醒。";
    if (status === "after") return "今天已经收工，把时间还给自己。";
    return "别急，今天也在一点点往前走。";
  },

  refreshGame() {
    const summary = buildGameSummary(loadGameState());

    this.setData({
      game: summary,
      mysticResult: summary.todayMystic,
      petMessage: buildPetMessage(summary)
    });
  },

  goOffwork() {
    wx.switchTab({
      url: "/pages/offwork/home/index"
    });
  },

  goFish() {
    wx.switchTab({
      url: "/pages/fish/home/index"
    });
  },

  openFishPublish() {
    try {
      wx.setStorageSync(OPEN_FISH_PUBLISH_KEY, true);
    } catch (error) {
    }

    wx.switchTab({
      url: "/pages/fish/home/index"
    });
  },

  goSalary() {
    wx.navigateTo({
      url: "/pages/salary/index"
    });
  },

  goPet() {
    wx.navigateTo({
      url: "/pages/pet/home/index"
    });
  },

  initHomePetPosition() {
    const systemInfo = getWindowMetrics();
    const scale = systemInfo.windowWidth / 750;
    const petWidth = 166 * scale;

    this.setHomePetBounds(systemInfo, scale);
    this.setData({
      homePetPosition: {
        x: systemInfo.windowWidth - petWidth - 22 * scale,
        y: 138 * scale
      }
    });
  },

  playWithPet() {
    if (Date.now() < (this.suppressHomePetTapUntil || 0)) return;

    const messages = [
      "我在首页陪你。",
      "摸摸头成功。",
      "肩膀也放松一下。",
      "慢慢来就很好。"
    ];
    const next = messages[Math.floor(Math.random() * messages.length)];

    this.setData({
      petMessage: next,
      petActionClass: "play"
    });

    if (this.petTimer) clearTimeout(this.petTimer);
    this.petTimer = setTimeout(() => {
      this.setData({
        petActionClass: "idle"
      });
    }, 900);
  },

  handleWishInput(event) {
    this.setData({
      wishInput: event.detail.value
    });
  },

  submitWish() {
    const result = addWish(this.data.wishInput);
    if (result.empty) {
      wx.showToast({
        title: "先写一个下班愿望",
        icon: "none",
        duration: 1200
      });
      return;
    }

    this.setData({
      wishInput: ""
    });
    this.refreshGame();
    this.showPointToast(result, "愿望已放进池子");
  },

  deleteWish(event) {
    const id = event.currentTarget.dataset.id;

    wx.showModal({
      title: "删除这个愿望？",
      content: "删掉后不会影响已经获得的积分。",
      confirmText: "删除",
      confirmColor: "#b65f2a",
      success: (res) => {
        if (!res.confirm) return;

        const summary = removeWish(id);
        this.setData({
          game: summary,
          petMessage: buildPetMessage(summary)
        });
        wx.showToast({
          title: "愿望已删除",
          icon: "none",
          duration: 1000
        });
      }
    });
  },

  shareWishToFish(event) {
    const text = event.currentTarget.dataset.text;
    if (!text) return;

    createPost({
      channel: "wish",
      title: "今天下班想：" + text,
      content: "先把愿望放进鱼塘，看看有没有同样想法的搭子。",
      tagInput: "下班 愿望 搭子",
      mood: "想下班"
    });
    const result = addPoints("pond_publish", 2, { dailyLimit: 3 });

    this.refreshGame();
    this.playPointFeedback(result, "发到鱼塘");
    wx.showToast({
      title: result.added > 0 ? "已发到鱼塘 +2" : "已发到鱼塘",
      icon: "none",
      duration: 1200
    });
  },

  turnWishToMeetup(event) {
    const text = event.currentTarget.dataset.text;
    if (!text) return;

    createMeetup({
      type: guessMeetupType(text),
      title: "今晚想" + text,
      time: "下班后",
      location: "公司附近",
      size: 2,
      desc: "从下班许愿池一键转来的约局，细节可以在评论里慢慢定。"
    });
    const result = addPoints("meetup_publish", 3, { dailyLimit: 3 });

    this.refreshGame();
    this.playPointFeedback(result, "转成约局");
    wx.showToast({
      title: result.added > 0 ? "已转成约局 +3" : "已转成约局",
      icon: "none",
      duration: 1200
    });
    setTimeout(() => {
      wx.switchTab({
        url: "/pages/offwork/home/index"
      });
    }, 450);
  },

  drawMysticSign() {
    const savedSign = getDailyMysticSign();
    const sign = savedSign || getMysticSign();
    const result = savedSign
      ? { added: 0, limited: true }
      : addPoints("mystic_sign", 1, { dailyLimit: 1 });

    if (!savedSign) {
      saveDailyMysticSign(sign);
    }

    this.setData({
      mysticResult: sign,
      petMessage: sign.level + "：" + sign.title,
      petActionClass: "play"
    });
    this.refreshGame();
    if (savedSign) {
      wx.showToast({
        title: "今天就是这支签",
        icon: "none",
        duration: 1200
      });
    } else {
      this.showPointToast(result, "玄学一下");
    }

    if (this.petTimer) clearTimeout(this.petTimer);
    this.petTimer = setTimeout(() => {
      this.setData({
        petActionClass: "idle"
      });
    }, 900);
  },

  showPointToast(result, title) {
    this.playPointFeedback(result, title);
    wx.showToast({
      title: result.added > 0 ? `${title} +${result.added}` : "今天已经记过啦",
      icon: "none",
      duration: 1300
    });
  },

  playPointFeedback(result, title) {
    if (!result || result.added <= 0) return;

    if (this.pointTimer) clearTimeout(this.pointTimer);
    this.setData({
      pointFeedback: {
        title,
        value: `+${result.added}`
      }
    });
    this.pointTimer = setTimeout(() => {
      this.setData({
        pointFeedback: null
      });
    }, 1350);
  },

  startHomePetDrag(event) {
    const touch = event.touches[0];
    if (!touch) return;

    const systemInfo = getWindowMetrics();
    const scale = systemInfo.windowWidth / 750;
    this.setHomePetBounds(systemInfo, scale);
    this.homePetDragStart = {
      x: touch.clientX,
      y: touch.clientY,
      petX: this.data.homePetPosition.x,
      petY: this.data.homePetPosition.y
    };
    this.homePetDidDrag = false;
    this.setData({
      petDragClass: "dragging",
      petActionClass: "idle"
    });
  },

  moveHomePet(event) {
    const touch = event.touches[0];
    if (!touch || !this.homePetDragStart || !this.homePetBounds) return;

    const deltaX = touch.clientX - this.homePetDragStart.x;
    const deltaY = touch.clientY - this.homePetDragStart.y;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      this.homePetDidDrag = true;
    }

    this.setData({
      homePetPosition: {
        x: this.clamp(this.homePetDragStart.petX + deltaX, this.homePetBounds.minX, this.homePetBounds.maxX),
        y: this.clamp(this.homePetDragStart.petY + deltaY, this.homePetBounds.minY, this.homePetBounds.maxY)
      }
    });
  },

  endHomePetDrag() {
    if (this.homePetDidDrag) {
      this.suppressHomePetTapUntil = Date.now() + 220;
    }

    this.homePetDragStart = null;
    this.homePetDidDrag = false;
    this.setData({
      petDragClass: ""
    });
  },

  setHomePetBounds(systemInfo, scale) {
    this.homePetBounds = {
      minX: 8 * scale,
      maxX: systemInfo.windowWidth - 166 * scale,
      minY: 84 * scale,
      maxY: systemInfo.windowHeight - 196 * scale
    };
  },

  clamp(value, min, max) {
    if (max < min) return min;

    return Math.min(Math.max(value, min), max);
  },

  showToast(event) {
    wx.showToast({
      title: event.currentTarget.dataset.text || "已记录",
      icon: "none",
      duration: 1200
    });
  }
});
