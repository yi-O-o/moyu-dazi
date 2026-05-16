const { addPoints, buildGameSummary, loadGameState } = require("../../../utils/gamification");
const cloudApi = require("../../../utils/cloudApi");
const {
  CHANNELS,
  addComment,
  createPost,
  deletePost,
  getFishpondHighlights,
  listChannelSummaries,
  listPosts,
  reportPost: hideReportedPost,
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
    const id = post.id || post._id;
    const canDelete = post.isMine || post.author === "我" || post.author === "摸鱼搭子";

    return Object.assign({}, post, {
      id,
      canDelete,
      commentOpen: String(id) === String(openCommentId)
    });
  });
}

function getReactionToast(type) {
  const map = {
    like: "已更新点赞",
    favorite: "已更新收藏",
    same: "已标记同款"
  };

  return map[type] || "已记录";
}

Page({
  data: {
    publishChannels: getPublishChannels("cup"),
    channelCards: listChannelSummaries(),
    highlights: getFishpondHighlights(),
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
      highlights: getFishpondHighlights(),
      posts: decorateVisiblePosts(listPosts("all"), this.data.commentPostId),
      game: buildGameSummary(loadGameState())
    });
    this.refreshCloudPosts();
  },

  refreshCloudPosts() {
    cloudApi.listFishPosts({ channel: "all" }).then((res) => {
      this.setData({
        posts: decorateVisiblePosts(res.posts || [], this.data.commentPostId)
      });
    }).catch(() => {
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
    this.uploadPublishImages(form.images || []).then((images) => {
      return cloudApi.createFishPost(Object.assign({}, form, { images }));
    }).then(() => {
      this.refreshCloudPosts();
      this.showPointToast(pointResult, "发布动态");
    }).catch(() => {
      createPost(form);
      this.refreshPosts();
      this.showPointToast(pointResult, "发布动态");
    });
  },

  uploadPublishImages(images) {
    if (!images.length || !wx.cloud || !wx.cloud.uploadFile) {
      return Promise.resolve(images);
    }

    return Promise.all(images.map((path, index) => {
      if (String(path).indexOf("cloud://") === 0 || String(path).indexOf("mock:") === 0) {
        return Promise.resolve(path);
      }

      const ext = String(path).split(".").pop() || "jpg";
      const cloudPath = `fish-posts/${Date.now()}-${index}.${ext}`;
      return wx.cloud.uploadFile({
        cloudPath,
        filePath: path
      }).then((res) => res.fileID);
    }));
  },

  reactPost(event) {
    const id = event.currentTarget.dataset.id;
    const type = event.currentTarget.dataset.type;

    togglePostReaction(id, type);
    cloudApi.toggleFishReaction({ id, type }).catch(() => {
    });
    this.refreshPosts();

    wx.showToast({
      title: getReactionToast(type),
      icon: "none",
      duration: 900
    });
  },

  openComment(event) {
    const id = event.currentTarget.dataset.id;

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
    const text = this.data.commentInput;

    if (!String(text || "").trim()) {
      wx.showToast({
        title: "先写一句评论",
        icon: "none",
        duration: 1000
      });
      return;
    }

    addComment(id, text);
    const pointResult = addPoints("pond_comment", 1, { dailyLimit: 5 });

    this.setData({
      commentPostId: null,
      commentInput: ""
    });
    cloudApi.addFishComment({ id, content: text }).then(() => {
      this.refreshCloudPosts();
      this.showPointToast(pointResult, "评论");
    }).catch(() => {
      this.refreshPosts();
      this.showPointToast(pointResult, "评论");
    });
  },

  goPostDetail(event) {
    const id = event.currentTarget.dataset.id || event.target.dataset.id;

    if (!id) return;

    wx.navigateTo({
      url: `/pages/fish/detail/index?id=${id}`
    });
  },

  goUserProfile(event) {
    const author = event.currentTarget.dataset.author || "我";

    wx.navigateTo({
      url: `/pages/profile/user/index?author=${encodeURIComponent(author)}`
    });
  },

  reportPost(event) {
    const id = event.currentTarget.dataset.id;
    const post = this.data.posts.find((item) => String(item.id) === String(id));

    if (post && post.canDelete) {
      wx.showActionSheet({
        itemList: ["删除动态", "举报/隐藏"],
        alertText: "管理这条动态",
        success: (res) => {
          if (res.tapIndex === 0) {
            this.deleteMyPost(id);
            return;
          }

          this.hidePostByReport(id);
        }
      });
      return;
    }

    this.hidePostByReport(id);
  },

  deleteMyPost(eventOrId) {
    const id = typeof eventOrId === "object"
      ? eventOrId.currentTarget.dataset.id
      : eventOrId;

    if (!id) return;

    wx.showModal({
      title: "删除这条动态？",
      content: "删除后会从鱼塘和你的个人主页里移除。",
      confirmText: "删除",
      confirmColor: "#B65F2A",
      cancelText: "算了",
      success: (res) => {
        if (!res.confirm) return;

        deletePost(id);
        cloudApi.deleteFishPost({ id }).catch(() => {
        });
        this.refreshPosts();
        wx.showToast({
          title: "已删除",
          icon: "none",
          duration: 1000
        });
      }
    });
  },

  hidePostByReport(id) {
    wx.showModal({
      title: "举报这条动态？",
      content: "如果包含广告、敏感信息或让人不舒服的内容，可以先标记并隐藏。",
      confirmText: "举报",
      cancelText: "算了",
      success: (res) => {
        if (!res.confirm) return;

        hideReportedPost(id);
        cloudApi.reportFishPost({ id }).catch(() => {
        });
        this.refreshPosts();
        wx.showToast({
          title: "已隐藏这条动态",
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
