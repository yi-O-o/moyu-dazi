const { addPoints } = require("../../../utils/gamification");
const cloudApi = require("../../../utils/cloudApi");
const { getCloudProfilePayload } = require("../../../utils/profile");
const {
  TYPES,
  addMeetupComment,
  cancelMeetup: cancelMeetupById,
  createMeetup,
  decorateType,
  joinMeetup: joinMeetupById,
  listMeetups
} = require("../../../utils/meetups");

function getPublishTypes(selectedType) {
  return TYPES.filter((type) => type.id !== "all").map((type) => {
    return Object.assign({}, type, {
      className: type.id === selectedType ? "publish-type selected" : "publish-type"
    });
  });
}

Page({
  data: {
    activeType: "all",
    types: decorateType("all"),
    publishTypes: getPublishTypes("food"),
    meetups: [],
    hasMeetups: false,
    emptyVisible: false,
    publishOpen: false,
    publishButtonText: "发约局",
    manualLocationOpen: false,
    commentInputs: {},
    pointFeedback: null,
    form: {
      type: "food",
      title: "",
      time: "",
      location: "",
      locationAddress: "",
      latitude: null,
      longitude: null,
      size: 2,
      desc: ""
    }
  },

  onShow() {
    this.refreshMeetups();
  },

  onUnload() {
    if (this.pointTimer) clearTimeout(this.pointTimer);
  },

  refreshMeetups() {
    this.setData({
      types: decorateType(this.data.activeType),
      meetups: [],
      hasMeetups: false,
      emptyVisible: false
    });
    this.refreshCloudMeetups();
  },

  refreshLocalMeetups() {
    const meetups = listMeetups(this.data.activeType).map((meetup) => {
      return Object.assign({}, meetup, {
        commentDraft: this.data.commentInputs[meetup.id] || ""
      });
    });

    this.setData({
      meetups,
      hasMeetups: meetups.length > 0,
      emptyVisible: meetups.length === 0
    });
  },

  refreshCloudMeetups() {
    cloudApi.listMeetups({ type: this.data.activeType }).then((res) => {
      const meetups = (res.meetups || []).map((meetup) => {
        return Object.assign({}, meetup, {
          commentDraft: this.data.commentInputs[meetup.id] || ""
        });
      });

      this.setData({
        meetups,
        hasMeetups: meetups.length > 0,
        emptyVisible: meetups.length === 0
      });
    }).catch(() => {
      this.refreshLocalMeetups();
    });
  },

  switchType(event) {
    const type = event.currentTarget.dataset.id;

    this.setData({
      activeType: type,
      publishOpen: false,
      publishButtonText: "发约局"
    });
    this.refreshMeetups();
  },

  togglePublish() {
    const nextOpen = !this.data.publishOpen;

    this.setData({
      publishOpen: nextOpen,
      publishButtonText: nextOpen ? "收起" : "发约局"
    });
  },

  closePublish() {
    this.setData({
      publishOpen: false,
      publishButtonText: "发约局"
    });
  },

  changePublishType(event) {
    const type = event.currentTarget.dataset.id;

    this.setData({
      "form.type": type,
      publishTypes: getPublishTypes(type)
    });
  },

  handleTitleInput(event) {
    this.setData({
      "form.title": event.detail.value
    });
  },

  handleTimeInput(event) {
    this.setData({
      "form.time": event.detail.value
    });
  },

  handleLocationInput(event) {
    this.setData({
      "form.location": event.detail.value,
      "form.locationAddress": "",
      "form.latitude": null,
      "form.longitude": null
    });
  },

  toggleManualLocation() {
    this.setData({
      manualLocationOpen: !this.data.manualLocationOpen
    });
  },

  chooseMeetupLocation() {
    if (!wx.chooseLocation) {
      wx.showToast({
        title: "当前微信版本暂不支持选点",
        icon: "none",
        duration: 1200
      });
      return;
    }

    wx.chooseLocation({
      success: (res) => {
        const name = String(res.name || "").trim();
        const address = String(res.address || "").trim();

        this.setData({
          "form.location": (name || address).slice(0, 24),
          "form.locationAddress": address.slice(0, 80),
          "form.latitude": res.latitude,
          "form.longitude": res.longitude,
          manualLocationOpen: false
        });
      },
      fail: (error) => {
        if (error && String(error.errMsg || "").indexOf("cancel") >= 0) return;

        wx.showToast({
          title: "位置选择失败，可以先手动填写",
          icon: "none",
          duration: 1400
        });
      }
    });
  },

  handleSizeInput(event) {
    this.setData({
      "form.size": event.detail.value
    });
  },

  handleDescInput(event) {
    this.setData({
      "form.desc": event.detail.value
    });
  },

  handleCommentInput(event) {
    const id = event.currentTarget.dataset.id;

    this.setData({
      [`commentInputs.${id}`]: event.detail.value
    });
  },

  publishMeetup() {
    const form = Object.assign({}, this.data.form);

    if (!form.title.trim() || !form.time.trim() || !form.location.trim()) {
      wx.showToast({
        title: "标题、时间、地点都写一下",
        icon: "none",
        duration: 1200
      });
      return;
    }

    const pointResult = addPoints("meetup_publish", 3, { dailyLimit: 3 });

    this.setData({
      activeType: form.type,
      publishOpen: false,
      publishButtonText: "发约局",
      manualLocationOpen: false,
      publishTypes: getPublishTypes("food"),
      form: {
        type: "food",
        title: "",
        time: "",
        location: "",
        locationAddress: "",
        latitude: null,
        longitude: null,
        size: 2,
        desc: ""
      }
    });
    cloudApi.createMeetup(Object.assign({}, form, {
      profile: getCloudProfilePayload()
    })).then(() => {
      this.refreshCloudMeetups();
      this.showPointToast(pointResult, "发布约局");
    }).catch((error) => {
      if (!cloudApi.shouldUseLocalFallback(error)) {
        this.setData({
          activeType: form.type || "food",
          publishOpen: true,
          publishButtonText: "收起",
          publishTypes: getPublishTypes(form.type || "food"),
          form
        });
        cloudApi.showErrorToast(error, "约局发布失败");
        return;
      }

      createMeetup(form);
      this.refreshLocalMeetups();
      this.showPointToast(pointResult, "发布约局");
    });
  },

  joinMeetup(event) {
    const id = event.currentTarget.dataset.id;
    const result = joinMeetupById(id);

    this.refreshMeetups();

    cloudApi.joinMeetup({ id }).then((res) => {
      this.refreshCloudMeetups();
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

  cancelMeetup(event) {
    const id = event.currentTarget.dataset.id;

    wx.showModal({
      title: "取消报名？",
      content: "取消后如果还想去，需要重新报名。",
      confirmText: "取消报名",
      confirmColor: "#B65F2A",
      cancelText: "先不",
      success: (res) => {
        if (!res.confirm) return;

        const localResult = cancelMeetupById(id);
        cloudApi.cancelMeetup({ id }).then(() => {
          this.refreshCloudMeetups();
          wx.showToast({
            title: "已取消报名",
            icon: "none",
            duration: 1000
          });
        }).catch(() => {
          this.refreshMeetups();
          wx.showToast({
            title: localResult === "success" ? "已取消报名" : "暂时不能取消",
            icon: "none",
            duration: 1000
          });
        });
      }
    });
  },

  goMeetupDetail(event) {
    wx.navigateTo({
      url: `/pages/offwork/detail/index?id=${event.currentTarget.dataset.id}`
    });
  },

  openMeetupLocation(event) {
    const id = String(event.currentTarget.dataset.id || "");
    const meetup = (this.data.meetups || []).find((item) => String(item.id) === id);

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

  submitComment(event) {
    const id = event.currentTarget.dataset.id;
    const text = this.data.commentInputs[id] || "";
    const result = addMeetupComment(id, text);

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
      [`commentInputs.${id}`]: ""
    });
    cloudApi.addMeetupComment({
      id,
      text,
      profile: getCloudProfilePayload()
    }).then(() => {
      this.refreshCloudMeetups();
      this.showPointToast(pointResult, "评论约局");
    }).catch((error) => {
      if (!cloudApi.shouldUseLocalFallback(error)) {
        this.setData({
          [`commentInputs.${id}`]: text
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

      this.refreshMeetups();
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
  },

  noop() {
  }
});
