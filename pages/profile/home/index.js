const { getWorkStats, loadWorkConfig } = require("../../../utils/workday");
const cloudApi = require("../../../utils/cloudApi");
const {
  deletePost,
  getMyComments,
  getMyFavorites,
  getMyPosts
} = require("../../../utils/fishpond");
const { buildGameSummary, loadGameState } = require("../../../utils/gamification");
const { cancelMeetup, getMyMeetups } = require("../../../utils/meetups");

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

function decorateMeetupTabs(activeTab) {
  return [
    { id: "all", title: "全部" },
    { id: "created", title: "我发起" },
    { id: "joined", title: "我报名" }
  ].map((tab) => {
    return Object.assign({}, tab, {
      className: tab.id === activeTab ? "meetup-tab active" : "meetup-tab"
    });
  });
}

Page({
  data: {
    todayEarned: "0.00",
    game: buildGameSummary(loadGameState()),
    meetupTab: "all",
    meetupTabs: decorateMeetupTabs("all"),
    myMeetups: [],
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
      todayEarned: stats.earned,
      game: buildGameSummary(loadGameState()),
      meetupTabs: decorateMeetupTabs(this.data.meetupTab),
      myMeetups: getMyMeetups(this.data.meetupTab),
      myPosts: getMyPosts(),
      myComments: getMyComments(),
      myFavorites: getMyFavorites()
    });
    this.refreshCloudProfile();
  },

  refreshCloudProfile() {
    cloudApi.getPointSummary().then((res) => {
      if (!res.user) return;

      this.setData({
        game: Object.assign({}, this.data.game, {
          points: res.user.points,
          level: res.user.level
        })
      });
    }).catch(() => {
    });

    cloudApi.getMyMeetups({ filter: this.data.meetupTab }).then((res) => {
      this.setData({
        myMeetups: res.meetups || []
      });
    }).catch(() => {
    });

    cloudApi.getMyFish().then((res) => {
      this.setData({
        myPosts: res.posts || [],
        myFavorites: res.favorites || []
      });
    }).catch(() => {
    });
  },

  switchPondTab(event) {
    const tab = event.currentTarget.dataset.id;

    this.setData({
      pondTab: tab,
      pondTabs: decorateTabs(tab)
    });
  },

  switchMeetupTab(event) {
    const tab = event.currentTarget.dataset.id;

    this.setData({
      meetupTab: tab,
      meetupTabs: decorateMeetupTabs(tab),
      myMeetups: getMyMeetups(tab)
    });
    cloudApi.getMyMeetups({ filter: tab }).then((res) => {
      this.setData({
        myMeetups: res.meetups || []
      });
    }).catch(() => {
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
        cloudApi.deleteFishPost({ id }).catch(() => {
        });
        this.setData({
          myPosts: getMyPosts(),
          myComments: getMyComments(),
          myFavorites: getMyFavorites()
        });
        wx.showToast({
          title: result === "success" ? "已删除" : "没找到这条动态",
          icon: "none",
          duration: 1000
        });
      }
    });
  },

  goMeetupDetail(event) {
    wx.navigateTo({
      url: `/pages/offwork/detail/index?id=${event.currentTarget.dataset.id}`
    });
  },

  cancelMyMeetup(event) {
    const id = event.currentTarget.dataset.id;

    wx.showModal({
      title: "取消报名？",
      content: "取消后这个约局会从“我报名”里移除。",
      confirmText: "取消报名",
      confirmColor: "#B65F2A",
      cancelText: "先不",
      success: (res) => {
        if (!res.confirm) return;

        const result = cancelMeetup(id);
        cloudApi.cancelMeetup({ id }).catch(() => {
        });
        this.setData({
          myMeetups: getMyMeetups(this.data.meetupTab)
        });
        wx.showToast({
          title: result === "success" ? "已取消报名" : "暂时不能取消",
          icon: "none",
          duration: 1000
        });
      }
    });
  },

  goWelfare() {
    wx.navigateTo({
      url: "/pages/profile/welfare/index"
    });
  }
});
