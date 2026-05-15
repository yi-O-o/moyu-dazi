const { addPoints } = require("../../../utils/gamification");
const {
  TYPES,
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
    meetups: listMeetups("all"),
    hasMeetups: true,
    emptyVisible: false,
    publishOpen: false,
    publishButtonText: "发约局",
    form: {
      type: "food",
      title: "",
      time: "",
      location: "",
      size: 2,
      desc: ""
    }
  },

  onShow() {
    this.refreshMeetups();
  },

  refreshMeetups() {
    const meetups = listMeetups(this.data.activeType);

    this.setData({
      types: decorateType(this.data.activeType),
      meetups,
      hasMeetups: meetups.length > 0,
      emptyVisible: meetups.length === 0
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
      "form.location": event.detail.value
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

  publishMeetup() {
    const form = this.data.form;

    if (!form.title.trim() || !form.time.trim() || !form.location.trim()) {
      wx.showToast({
        title: "标题、时间、地点都写一下",
        icon: "none",
        duration: 1200
      });
      return;
    }

    createMeetup(form);
    const pointResult = addPoints("meetup_publish", 3, { dailyLimit: 3 });

    this.setData({
      activeType: form.type,
      publishOpen: false,
      publishButtonText: "发约局",
      publishTypes: getPublishTypes("food"),
      form: {
        type: "food",
        title: "",
        time: "",
        location: "",
        size: 2,
        desc: ""
      }
    });
    this.refreshMeetups();
    this.showPointToast(pointResult, "发布约局");
  },

  joinMeetup(event) {
    const id = event.currentTarget.dataset.id;
    const result = joinMeetupById(id);

    this.refreshMeetups();

    if (result === "success") {
      const pointResult = addPoints("meetup_join", 2, { dailyLimit: 3 });
      this.showPointToast(pointResult, "报名约局");
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

  showPointToast(result, title) {
    wx.showToast({
      title: result.added > 0 ? `${title} +${result.added}` : `${title}成功`,
      icon: "none",
      duration: 1200
    });
  }
});
