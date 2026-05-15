const { addPoints, buildGameSummary, loadGameState } = require("../../../utils/gamification");
const {
  CHANNELS,
  addComment,
  createPost,
  listPosts,
  togglePostReaction
} = require("../../../utils/fishpond");

function decorateChannels(activeChannel) {
  return CHANNELS.map((channel) => {
    return Object.assign({}, channel, {
      className: channel.id === activeChannel ? "channel-chip active" : "channel-chip"
    });
  });
}

function getPublishChannels(selectedChannel) {
  return CHANNELS.filter((channel) => channel.id !== "all").map((channel) => {
    return Object.assign({}, channel, {
      className: channel.id === selectedChannel ? "publish-channel selected" : "publish-channel"
    });
  });
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
    channels: decorateChannels("all"),
    publishChannels: getPublishChannels("cup"),
    activeChannel: "all",
    activeChannelDesc: CHANNELS[0].desc,
    posts: listPosts("all"),
    game: buildGameSummary(loadGameState()),
    publishOpen: false,
    form: {
      channel: "cup",
      title: "",
      content: "",
      tagInput: "",
      mood: "还行",
      images: []
    },
    commentPostId: null,
    commentInput: ""
  },

  onShow() {
    this.refreshPosts();
  },

  refreshPosts() {
    const channel = CHANNELS.find((item) => item.id === this.data.activeChannel) || CHANNELS[0];

    this.setData({
      channels: decorateChannels(this.data.activeChannel),
      activeChannelDesc: channel.desc,
      posts: decorateVisiblePosts(listPosts(this.data.activeChannel), this.data.commentPostId),
      game: buildGameSummary(loadGameState())
    });
  },

  switchChannel(event) {
    const id = event.currentTarget.dataset.id;

    this.setData({
      activeChannel: id,
      publishOpen: false
    });
    this.refreshPosts();
  },

  togglePublish() {
    this.setData({
      publishOpen: !this.data.publishOpen,
      commentPostId: null
    });
  },

  changePublishChannel(event) {
    const channel = event.currentTarget.dataset.id;

    this.setData({
      "form.channel": channel,
      publishChannels: getPublishChannels(channel)
    });
  },

  handleTitleInput(event) {
    this.setData({
      "form.title": event.detail.value
    });
  },

  handleContentInput(event) {
    this.setData({
      "form.content": event.detail.value
    });
  },

  handleTagInput(event) {
    this.setData({
      "form.tagInput": event.detail.value
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

    if (!form.title.trim() || !form.content.trim()) {
      wx.showToast({
        title: "标题和内容都写一点",
        icon: "none",
        duration: 1200
      });
      return;
    }

    createPost(form);
    const pointResult = addPoints("pond_publish", 2, { dailyLimit: 3 });

    this.setData({
      publishOpen: false,
      activeChannel: form.channel,
      channels: decorateChannels(form.channel),
      publishChannels: getPublishChannels("cup"),
      form: {
        channel: "cup",
        title: "",
        content: "",
        tagInput: "",
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
    wx.showToast({
      title: result.added > 0 ? `${title} +${result.added}` : "今天已达加分上限",
      icon: "none",
      duration: 1200
    });
  },

  noop() {
  }
});
