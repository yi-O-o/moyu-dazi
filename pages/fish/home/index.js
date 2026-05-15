const { addPoints, buildGameSummary, loadGameState } = require("../../../utils/gamification");
const {
  CHANNELS,
  addComment,
  createPost,
  listChannelSummaries,
  listPosts,
  togglePostReaction
} = require("../../../utils/fishpond");

function getPublishChannels(selectedChannel) {
  return CHANNELS.filter((channel) => channel.id !== "all").map((channel) => {
    return Object.assign({}, channel, {
      className: channel.id === selectedChannel ? "publish-channel selected" : "publish-channel"
    });
  });
}

function getChannelTitle(channelId) {
  const channel = CHANNELS.find((item) => item.id === channelId) || CHANNELS[1];

  return channel.title;
}

function decorateVisiblePosts(posts, openCommentId) {
  return posts.map((post) => {
    return Object.assign({}, post, {
      commentOpen: Number(post.id) === Number(openCommentId)
    });
  });
}

Page({
  data: {
    publishChannels: getPublishChannels("cup"),
    channelCards: listChannelSummaries(),
    posts: listPosts("all"),
    game: buildGameSummary(loadGameState()),
    publishOpen: false,
    selectedPublishChannelTitle: getChannelTitle("cup"),
    form: {
      channel: "cup",
      content: "",
      mood: "还行",
      images: []
    },
    commentPostId: null,
    commentInput: "",
    pointFeedback: null
  },

  onShow() {
    this.refreshPosts();
  },

  onUnload() {
    if (this.pointTimer) clearTimeout(this.pointTimer);
  },

  refreshPosts() {
    this.setData({
      channelCards: listChannelSummaries(),
      posts: decorateVisiblePosts(listPosts("all"), this.data.commentPostId),
      game: buildGameSummary(loadGameState())
    });
  },

  openPublish() {
    this.setData({
      publishOpen: true,
      commentPostId: null
    });
  },

  closePublish() {
    this.setData({
      publishOpen: false
    });
  },

  goChannelDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (!id || id === "all") return;

    wx.navigateTo({
      url: `/pages/fish/channel/index?id=${id}`
    });
  },

  togglePublish() {
    if (this.data.publishOpen) {
      this.closePublish();
      return;
    }

    this.openPublish();
  },

  changePublishChannel(event) {
    const channel = event.currentTarget.dataset.id;

    this.setData({
      "form.channel": channel,
      publishChannels: getPublishChannels(channel),
      selectedPublishChannelTitle: getChannelTitle(channel)
    });
  },

  handleContentInput(event) {
    this.setData({
      "form.content": event.detail.value
    });
  },

  chooseImages() {
    const current = this.data.form.images || [];
    const remain = 6 - current.length;

    if (remain <= 0) {
      wx.showToast({
        title: "最多 6 张图",
        icon: "none",
        duration: 1000
      });
      return;
    }

    wx.chooseImage({
      count: remain,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        this.setData({
          "form.images": current.concat(res.tempFilePaths || []).slice(0, 6)
        });
      }
    });
  },

  removePublishImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const images = (this.data.form.images || []).filter((_, itemIndex) => itemIndex !== index);

    this.setData({
      "form.images": images
    });
  },

  previewImage(event) {
    const current = event.currentTarget.dataset.src;
    const urls = event.currentTarget.dataset.urls || [];

    wx.previewImage({
      current,
      urls
    });
  },

  publishPost() {
    const form = this.data.form;

    if (!form.content.trim() && !(form.images || []).length) {
      wx.showToast({
        title: "写一句话或加一张图",
        icon: "none",
        duration: 1200
      });
      return;
    }

    createPost(form);
    const pointResult = addPoints("pond_publish", 2, { dailyLimit: 3 });

    this.setData({
      publishOpen: false,
      publishChannels: getPublishChannels("cup"),
      selectedPublishChannelTitle: getChannelTitle("cup"),
      form: {
        channel: "cup",
        content: "",
        mood: "还行",
        images: []
      }
    });
    this.refreshPosts();
    this.showPointToast(pointResult, "发到鱼塘");
  },

  reactPost(event) {
    const id = event.currentTarget.dataset.id;
    const type = event.currentTarget.dataset.type;

    togglePostReaction(id, type);
    this.refreshPosts();

    if (type === "same") {
      wx.showToast({
        title: "已标记同款",
        icon: "none",
        duration: 900
      });
    }
  },

  openComment(event) {
    const id = Number(event.currentTarget.dataset.id);

    this.setData({
      commentPostId: this.data.commentPostId === id ? null : id,
      commentInput: "",
      publishOpen: false
    });
  },

  handleCommentInput(event) {
    this.setData({
      commentInput: event.detail.value
    });
  },

  submitComment(event) {
    const id = event.currentTarget.dataset.id;
    const comment = addComment(id, this.data.commentInput);

    if (!comment) {
      wx.showToast({
        title: "先写一句评论",
        icon: "none",
        duration: 1000
      });
      return;
    }

    const pointResult = addPoints("pond_comment", 1, { dailyLimit: 5 });

    this.setData({
      commentPostId: null,
      commentInput: ""
    });
    this.refreshPosts();
    this.showPointToast(pointResult, "评论");
  },

  goPostDetail(event) {
    const id = event.currentTarget.dataset.id;

    wx.navigateTo({
      url: `/pages/fish/detail/index?id=${id}`
    });
  },

  reportPost() {
    wx.showModal({
      title: "举报这条动态？",
      content: "如果包含广告、敏感信息或让人不舒服的内容，可以先标记给我们。",
      confirmText: "举报",
      cancelText: "算了",
      success(res) {
        if (!res.confirm) return;

        wx.showToast({
          title: "已收到举报",
          icon: "none",
          duration: 1000
        });
      }
    });
  },

  showPointToast(result, title) {
    this.playPointFeedback(result, title);
    wx.showToast({
      title: result.added > 0 ? `${title} +${result.added}` : "今天已达加分上限",
      icon: "none",
      duration: 1200
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

  noop() {
  }
});
