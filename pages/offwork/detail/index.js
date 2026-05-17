const { addPoints } = require("../../../utils/gamification");
const cloudApi = require("../../../utils/cloudApi");
const {
  addMeetupComment,
  cancelMeetup: cancelMeetupById,
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
      meetupId: options.id
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
      meetup: null
    });
    cloudApi.getMeetup({ id: this.data.meetupId }).then((res) => {
      this.setData({
        meetup: res.meetup
      });
    }).catch(() => {
      this.setData({
        meetup: getMeetup(this.data.meetupId)
      });
    });
  },

  joinMeetup() {
    const result = joinMeetup(this.data.meetupId);
    this.refreshMeetup();

    cloudApi.joinMeetup({ id: this.data.meetupId }).then((res) => {
      this.refreshMeetup();
      if (res.result === "success") {
        const pointResult = addPoints("meetup_join", 2, { dailyLimit: 3 });
        this.showPointToast(pointResult, "报名约局");
        this.showJoinReminder();
        return;
      }

      wx.showToast({
        title: res.result === "joined" ? "你已经报名啦" : res.result === "full" ? "这个局满员了" : "报名失败了",
        icon: "none",
        duration: 1200
      });
    }).catch(() => {
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
    });
  },

  cancelMeetup() {
    wx.showModal({
      title: "取消报名？",
      content: "取消后如果还想去，需要重新报名。",
      confirmText: "取消报名",
      confirmColor: "#B65F2A",
      cancelText: "先不",
      success: (res) => {
        if (!res.confirm) return;

        const localResult = cancelMeetupById(this.data.meetupId);
        cloudApi.cancelMeetup({ id: this.data.meetupId }).then(() => {
          this.refreshMeetup();
          wx.showToast({
            title: "已取消报名",
            icon: "none",
            duration: 1000
          });
        }).catch(() => {
          this.refreshMeetup();
          wx.showToast({
            title: localResult === "success" ? "已取消报名" : "暂时不能取消",
            icon: "none",
            duration: 1000
          });
        });
      }
    });
  },

  openMeetupLocation() {
    const meetup = this.data.meetup;

    if (!meetup || !meetup.hasLocationMap) {
      wx.showToast({
        title: "这个约局还没有地图位置",
        icon: "none",
        duration: 1200
      });
      return;
    }

    wx.openLocation({
      latitude: Number(meetup.latitude),
      longitude: Number(meetup.longitude),
      name: meetup.location || "约局地点",
      address: meetup.locationAddress || meetup.location || ""
    });
  },

  handleCommentInput(event) {
    this.setData({
      commentInput: event.detail.value
    });
  },

  submitComment() {
    const text = this.data.commentInput;
    const result = addMeetupComment(this.data.meetupId, text);

    if (!String(text || "").trim() || result.result === "empty") {
      wx.showToast({
        title: "先写一句评论",
        icon: "none",
        duration: 1000
      });
      return;
    }

    const pointResult = addPoints("meetup_comment", 1, { dailyLimit: 5 });

    this.setData({
      commentInput: ""
    });
    cloudApi.addMeetupComment({ id: this.data.meetupId, text }).then(() => {
      this.refreshMeetup();
      this.showPointToast(pointResult, "评论约局");
    }).catch((error) => {
      if (!cloudApi.shouldUseLocalFallback(error)) {
        this.setData({
          commentInput: text
        });
        cloudApi.showErrorToast(error, "评论失败");
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

      this.refreshMeetup();
      this.showPointToast(pointResult, "评论约局");
    });
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
