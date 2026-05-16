const { deletePost, getPostsByAuthor } = require("../../../utils/fishpond");
const { buildGameSummary, loadGameState } = require("../../../utils/gamification");

const PUBLIC_SIGNS = [
  {
    level: "小吉",
    title: "宜慢慢开机",
    desc: "今天适合先从一件轻的小事开始，把状态找回来。",
    lucky: "幸运动作：补一口水再回消息"
  },
  {
    level: "中吉",
    title: "宜短暂回血",
    desc: "工作节奏不用拉满，留一点缝隙给自己，会更稳。",
    lucky: "幸运动作：离开座位走 30 秒"
  },
  {
    level: "大吉",
    title: "宜期待下班",
    desc: "今天的能量来自下班后的安排，想到那里就多一点动力。",
    lucky: "幸运动作：提前想好晚饭"
  },
  {
    level: "平安",
    title: "宜低调搬砖",
    desc: "少一点硬刚，多一点顺手推进，今天就能舒服不少。",
    lucky: "幸运动作：把最烦的消息晚两分钟回"
  }
];

function pickPublicSign(author) {
  const text = String(author || "打工人");
  const code = text.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return PUBLIC_SIGNS[code % PUBLIC_SIGNS.length];
}

function getMysticForAuthor(author) {
  if (author === "我") {
    return buildGameSummary(loadGameState()).todayMystic;
  }

  return pickPublicSign(author);
}

Page({
  data: {
    author: "打工人",
    avatar: "打",
    mystic: null,
    posts: [],
    isMine: false
  },

  onLoad(options) {
    const author = decodeURIComponent(options.author || "我");

    this.setData({
      author,
      avatar: String(author || "打").slice(0, 1),
      isMine: author === "我"
    });
    this.refreshProfile(author);
  },

  onShow() {
    this.refreshProfile(this.data.author);
  },

  refreshProfile(author) {
    this.setData({
      mystic: getMysticForAuthor(author),
      posts: getPostsByAuthor(author)
    });
  },

  goPostDetail(event) {
    wx.navigateTo({
      url: `/pages/fish/detail/index?id=${event.currentTarget.dataset.id}`
    });
  },

  deleteMyPost(event) {
    const id = event.currentTarget.dataset.id;

    wx.showModal({
      title: "删除这条动态？",
      content: "删除后会从鱼塘和你的个人主页里移除。",
      confirmText: "删除",
      confirmColor: "#B65F2A",
      cancelText: "算了",
      success: (res) => {
        if (!res.confirm) return;

        const result = deletePost(id);
        this.refreshProfile(this.data.author);
        wx.showToast({
          title: result === "success" ? "已删除" : "没找到这条动态",
          icon: "none",
          duration: 1000
        });
      }
    });
  },

  goToday() {
    wx.switchTab({
      url: "/pages/today/home/index"
    });
  }
});
