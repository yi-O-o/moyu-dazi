const { buildGameSummary, loadGameState } = require("../../../utils/gamification");

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
    actions: [
      { id: "pat", title: "摸摸头", text: "摸摸头成功，亲密度 +1。" },
      { id: "feed", title: "喂小饼干", text: "小搭子吃饱了，正在开心摇晃。" },
      { id: "play", title: "陪它玩", text: "它绕着工位跑了一圈，又回来了。" }
    ]
  },

  onReady() {
    this.initPetPosition();
  },

  onShow() {
    this.refreshGame();
  },

  refreshGame() {
    this.setData({
      game: buildGameSummary(loadGameState())
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
