const {
  getChannelSummary,
  listPosts
} = require("../../../utils/fishpond");

Page({
  data: {
    channelId: "cup",
    channel: getChannelSummary("cup"),
    posts: listPosts("cup")
  },

  onLoad(options) {
    const channelId = options.id || "cup";

    this.setData({
      channelId
    });
    this.refreshChannel(channelId);
  },

  onShow() {
    this.refreshChannel(this.data.channelId);
  },

  refreshChannel(channelId) {
    this.setData({
      channel: getChannelSummary(channelId),
      posts: listPosts(channelId)
    });
  },

  goPostDetail(event) {
    wx.navigateTo({
      url: `/pages/fish/detail/index?id=${event.currentTarget.dataset.id}`
    });
  },

  goUserProfile(event) {
    const author = event.currentTarget.dataset.author || "我";

    wx.navigateTo({
      url: `/pages/profile/user/index?author=${encodeURIComponent(author)}`
    });
  },

  goFishHome() {
    wx.switchTab({
      url: "/pages/fish/home/index"
    });
  }
});
