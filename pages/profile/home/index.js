const { DEFAULT_WORK_CONFIG, getWorkStats, loadWorkConfig } = require("../../../utils/workday");
const {
  getMyComments,
  getMyFavorites,
  getMyPosts
} = require("../../../utils/fishpond");

function decorateTabs(activeTab) {
  return [
    { id: "posts", title: "发布" },
    { id: "comments", title: "评论" },
    { id: "favorites", title: "收藏" }
  ].map((tab) => {
    return Object.assign({}, tab, {
      className: tab.id === activeTab ? "pond-tab active" : "pond-tab"
    });
  });
}

Page({
  data: {
    settings: DEFAULT_WORK_CONFIG,
    todayEarned: "0.00",
    pondTab: "posts",
    pondTabs: decorateTabs("posts"),
    myPosts: [],
    myComments: [],
    myFavorites: [],
    badges: [
      { id: "first", icon: "¥", title: "准时开工", desc: "今日仪表盘已点亮" },
      { id: "fish", icon: "鱼", title: "理性摸鱼", desc: "休息也是回血的一部分" },
      { id: "off", icon: "约", title: "下班有局", desc: "生活不能只剩工位" }
    ]
  },

  onShow() {
    const settings = loadWorkConfig();
    const stats = getWorkStats(settings);
    this.setData({
      settings,
      todayEarned: stats.earned,
      myPosts: getMyPosts(),
      myComments: getMyComments(),
      myFavorites: getMyFavorites()
    });
  },

  switchPondTab(event) {
    const tab = event.currentTarget.dataset.id;

    this.setData({
      pondTab: tab,
      pondTabs: decorateTabs(tab)
    });
  },

  goPostDetail(event) {
    wx.navigateTo({
      url: `/pages/fish/detail/index?id=${event.currentTarget.dataset.id}`
    });
  }
});
