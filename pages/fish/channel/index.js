const cloudApi = require("../../../utils/cloudApi");
const {
  CHANNELS,
  getChannelSummary,
  listPosts
} = require("../../../utils/fishpond");

function getChannel(id) {
  return CHANNELS.find((channel) => channel.id === id) || CHANNELS[1];
}

function buildChannelSummary(channelId, posts) {
  const channel = getChannel(channelId);
  const channelPosts = posts || [];
  const tagMap = {};

  channelPosts.forEach((post) => {
    (post.tags || []).forEach((tag) => {
      tagMap[tag] = (tagMap[tag] || 0) + 1;
    });
  });

  return Object.assign({}, channel, {
    postCount: channelPosts.length,
    commentCount: channelPosts.reduce((sum, post) => sum + Number(post.commentCount || (post.comments || []).length || 0), 0),
    hotTags: Object.keys(tagMap)
      .sort((first, second) => tagMap[second] - tagMap[first])
      .slice(0, 6),
    latestPosts: channelPosts.slice(0, 3)
  });
}

Page({
  data: {
    channelId: "cup",
    channel: buildChannelSummary("cup", []),
    posts: []
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
      channel: buildChannelSummary(channelId, [])
    });
    cloudApi.listFishPosts({ channel: channelId }).then((res) => {
      const posts = res.posts || [];

      this.setData({
        channel: buildChannelSummary(channelId, posts),
        posts
      });
    }).catch(() => {
      const posts = listPosts(channelId);

      this.setData({
        channel: getChannelSummary(channelId),
        posts
      });
    });
  },

  goPostDetail(event) {
    wx.navigateTo({
      url: `/pages/fish/detail/index?id=${event.currentTarget.dataset.id}`
    });
  },

  goUserProfile(event) {
    const author = event.currentTarget.dataset.author || "我";
    const openid = event.currentTarget.dataset.openid || "";
    const avatarUrl = event.currentTarget.dataset.avatarUrl || "";
    const query = [
      `author=${encodeURIComponent(author)}`,
      openid ? `openid=${encodeURIComponent(openid)}` : "",
      avatarUrl ? `avatarUrl=${encodeURIComponent(avatarUrl)}` : ""
    ].filter(Boolean).join("&");

    wx.navigateTo({
      url: `/pages/profile/user/index?${query}`
    });
  },

  goFishHome() {
    wx.switchTab({
      url: "/pages/fish/home/index"
    });
  }
});
