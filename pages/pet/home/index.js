const { buildGameSummary, loadGameState } = require("../../../utils/gamification");

function buildPetMessage(summary) {
  if (summary.todayMystic) {
    return `今日工位签是「${summary.todayMystic.title}」，我替你记着节奏。`;
  }

  if (summary.wishes && summary.wishes.length) {
    return `今晚想${summary.wishes[0].text}，下班后别把自己弄丢。`;
  }

  const unlocked = (summary.accessories || []).filter((item) => item.unlocked);
  const latest = unlocked[unlocked.length - 1];

  if (latest) {
    return `我已经戴上「${latest.title}」了，继续攒分还能解锁更多。`;
  }

  return "我今天不住框里了，正在桌面上晃悠。";
}

function buildActions(summary) {
  return [
    {
      id: "pat",
      title: "摸摸头",
      text: summary.todayPoints > 0 ? `今天已经攒了 ${summary.todayPoints} 分，我有认真看见。` : "摸摸头成功，先把肩膀放松一点。"
    },
    {
      id: "feed",
      title: "喂小饼干",
      text: summary.wishes && summary.wishes.length ? `吃完这块，我们一起等下班去${summary.wishes[0].text}。` : "小搭子吃饱了，正在开心摇晃。"
    },
    {
      id: "play",
      title: "陪它玩",
      text: summary.level.level >= 4 ? "它戴着新装扮绕工位跑了一圈，又精神了。" : "它绕着工位跑了一圈，又回来了。"
    }
  ];
}

Page({
  data: {
    actionClass: "idle",
    dragClass: "",
    message: "我今天不住框里了，正在桌面上晃悠。",
    game: buildGameSummary(loadGameState()),
    petPosition: {
      x: 0,
      y: 0
    },
    hearts: [
      { id: 1, className: "heart one" },
      { id: 2, className: "heart two" },
      { id: 3, className: "heart three" }
    ],
    actions: buildActions(buildGameSummary(loadGameState()))
  },

  onReady() {
    this.initPetPosition();
  },

  onShow() {
    this.refreshGame();
  },

  refreshGame() {
    const game = buildGameSummary(loadGameState());

    this.setData({
      game,
      message: buildPetMessage(game),
      actions: buildActions(game)
    });
  },

  initPetPosition() {
    const systemInfo = wx.getSystemInfoSync();
    const scale = systemInfo.windowWidth / 750;
    const petWidth = 260 * scale;

    this.getStageRect((stageRect) => {
      if (!stageRect) return;

      this.setDragBounds(stageRect, scale);
      this.setData({
        petPosition: {
          x: Math.max(0, (stageRect.width - petWidth) / 2),
          y: 92 * scale
        }
      });
    });
  },

  getStageRect(callback) {
    wx.createSelectorQuery()
      .in(this)
      .select("#petStage")
      .boundingClientRect((rect) => {
        callback(rect);
      })
      .exec();
  },

  playPet(event) {
    if (this.didDrag || Date.now() < (this.suppressTapUntil || 0)) {
      this.didDrag = false;
      return;
    }

    const text = event.currentTarget.dataset.text || "它开心地跳了一下。";

    this.setData({
      actionClass: "play",
      message: text
    });

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.setData({
        actionClass: "idle"
      });
    }, 1000);
  },

  startPetDrag(event) {
    const touch = event.touches[0];
    if (!touch) return;

    this.updateDragBounds();
    this.dragStart = {
      x: touch.clientX,
      y: touch.clientY,
      petX: this.data.petPosition.x,
      petY: this.data.petPosition.y
    };
    this.didDrag = false;
    this.setData({
      dragClass: "dragging",
      actionClass: "idle"
    });
  },

  movePet(event) {
    const touch = event.touches[0];
    if (!touch || !this.dragStart || !this.dragBounds) return;

    const deltaX = touch.clientX - this.dragStart.x;
    const deltaY = touch.clientY - this.dragStart.y;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      this.didDrag = true;
    }

    const nextX = this.clamp(this.dragStart.petX + deltaX, this.dragBounds.minX, this.dragBounds.maxX);
    const nextY = this.clamp(this.dragStart.petY + deltaY, this.dragBounds.minY, this.dragBounds.maxY);

    this.setData({
      petPosition: {
        x: nextX,
        y: nextY
      }
    });
  },

  endPetDrag() {
    if (this.didDrag) {
      this.suppressTapUntil = Date.now() + 220;
    }

    this.dragStart = null;
    this.setData({
      dragClass: ""
    });
    this.didDrag = false;
  },

  updateDragBounds() {
    const systemInfo = wx.getSystemInfoSync();
    const scale = systemInfo.windowWidth / 750;

    this.getStageRect((stageRect) => {
      if (!stageRect) return;

      this.setDragBounds(stageRect, scale);
    });
  },

  setDragBounds(stageRect, scale) {
    this.dragBounds = {
      minX: -12 * scale,
      maxX: stageRect.width - 260 * scale + 12 * scale,
      minY: 0,
      maxY: stageRect.height - 292 * scale
    };
  },

  clamp(value, min, max) {
    if (max < min) return min;

    return Math.min(Math.max(value, min), max);
  },

  onUnload() {
    if (this.timer) clearTimeout(this.timer);
  }
});
