const { addPoints } = require("../../../utils/gamification");
const {
  addComment,
  getPost,
  reportPost: hideReportedPost,
  togglePostReaction
} = require("../../../utils/fishpond");

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
    postId: null,
    post: null,
    commentInput: "",
    pointFeedback: null
  },

  onLoad(options) {
    this.setData({
      postId: Number(options.id)
    });
    this.refreshPost();
  },

  onShow() {
    this.refreshPost();
  },

  refreshPost() {
    if (!this.data.postId) return;

    this.setData({
      post: getPost(this.data.postId)
    });
  },

  previewImage(event) {
    wx.previewImage({
      current: event.currentTarget.dataset.src,
      urls: this.data.post.images || []
    });
  },

  goUserProfile(event) {
    const author = event.currentTarget.dataset.author || "我";

    wx.navigateTo({
      url: `/pages/profile/user/index?author=${encodeURIComponent(author)}`
    });
  },

  reactPost(event) {
    const type = event.currentTarget.dataset.type;

    togglePostReaction(this.data.postId, type);
    this.refreshPost();

    wx.showToast({
      title: getReactionToast(type),
      icon: "none",
      duration: 900
    });
  },

  handleCommentInput(event) {
    this.setData({
      commentInput: event.detail.value
    });
  },

  submitComment() {
    const comment = addComment(this.data.postId, this.data.commentInput);

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
      commentInput: ""
    });
    this.refreshPost();
    this.playPointFeedback(pointResult, "评论");
    wx.showToast({
      title: pointResult.added > 0 ? "评论 +1" : "评论成功",
      icon: "none",
      duration: 1000
    });
  },

  reportPost() {
    wx.showModal({
      title: "举报这条动态？",
      content: "如果包含广告、敏感信息或让人不舒服的内容，可以先标记并隐藏。",
      confirmText: "举报",
      cancelText: "算了",
      success: (res) => {
        if (!res.confirm) return;

        hideReportedPost(this.data.postId);
        this.refreshPost();
        wx.showToast({
          title: "已隐藏这条动态",
          icon: "none",
          duration: 1000
        });
      }
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

  onUnload() {
    if (this.pointTimer) clearTimeout(this.pointTimer);
  }
});
