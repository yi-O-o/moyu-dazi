const { addPoints } = require("../../../utils/gamification");
const {
  addMeetupComment,
  getMeetup,
  joinMeetup
} = require("../../../utils/meetups");

Page({
  data: {
    meetupId: null,
    meetup: null,
    commentInput: "",
    pointFeedback: null
  },

  onLoad(options) {
    this.setData({
      meetupId: Number(options.id)
    });
    this.refreshMeetup();
  },

  onShow() {
    this.refreshMeetup();
  },

  onUnload() {
    if (this.pointTimer) clearTimeout(this.pointTimer);
  },

  refreshMeetup() {
    if (!this.data.meetupId) return;

    this.setData({
      meetup: getMeetup(this.data.meetupId)
    });
  },

  joinMeetup() {
    const result = joinMeetup(this.data.meetupId);
    this.refreshMeetup();

    if (result === "success") {
      const pointResult = addPoints("meetup_join", 2, { dailyLimit: 3 });
      this.showPointToast(pointResult, "报名约局");
      this.showJoinReminder();
      return;
    }

    const messageMap = {
      joined: "你已经报名啦",
      full: "这个局满员了",
      missing: "这个局暂时找不到了"
    };

    wx.showToast({
      title: messageMap[result] || "报名失败了",
      icon: "none",
      duration: 1200
    });
  },

  handleCommentInput(event) {
    this.setData({
      commentInput: event.detail.value
    });
  },

  submitComment() {
    const result = addMeetupComment(this.data.meetupId, this.data.commentInput);

    if (result.result === "empty") {
      wx.showToast({
        title: "先写一句评论",
        icon: "none",
        duration: 1000
      });
      return;
    }

    if (result.result !== "success") {
      wx.showToast({
        title: "这个局暂时找不到了",
        icon: "none",
        duration: 1000
      });
      return;
    }

    const pointResult = addPoints("meetup_comment", 1, { dailyLimit: 5 });

    this.setData({
      commentInput: ""
    });
    this.refreshMeetup();
    this.showPointToast(pointResult, "评论约局");
  },

  showJoinReminder() {
    wx.showModal({
      title: "报名成功",
      content: "出发前记得在评论里确认时间、地点、人数和费用，线下见面优先选公开场所。",
      confirmText: "知道了",
      showCancel: false
    });
  },

  showPointToast(result, title) {
    this.playPointFeedback(result, title);
    wx.showToast({
      title: result.added > 0 ? `${title} +${result.added}` : `${title}成功`,
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
  }
});
