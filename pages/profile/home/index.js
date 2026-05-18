const { getWorkStats, loadWorkConfig } = require("../../../utils/workday");
const cloudApi = require("../../../utils/cloudApi");
const {
  deletePost,
  getMyComments,
  getMyFavorites,
  getMyPosts
} = require("../../../utils/fishpond");
const { buildGameSummary, loadGameState } = require("../../../utils/gamification");
const { cancelMeetup, getMyMeetups } = require("../../../utils/meetups");
const { DEFAULT_PROFILE, getAvatarText, loadUserProfile, saveUserProfile } = require("../../../utils/profile");

function decorateTabs(activeTab) {
  return [
    { id: "posts", title: "发布" },
    { id: "comments", title: "评论" },
    { id: "favorites", title: "收藏" }
  ].map((tab) => {
    return Object.assign({}, tab, {
      className: tab.id === activeTab ? "pond-tab active" : "pond-tab"
    });
  });
}

function decorateMeetupTabs(activeTab) {
  return [
    { id: "all", title: "全部" },
    { id: "created", title: "我发起" },
    { id: "joined", title: "我报名" }
  ].map((tab) => {
    return Object.assign({}, tab, {
      className: tab.id === activeTab ? "meetup-tab active" : "meetup-tab"
    });
  });
}

function shouldHydrateProfileFromCloud(localProfile, cloudUser) {
  if (!cloudUser) return false;

  const localIsDefault = localProfile.nickName === DEFAULT_PROFILE.nickName
    && localProfile.avatarText === DEFAULT_PROFILE.avatarText
    && !localProfile.avatarUrl;
  const cloudHasCustomProfile = cloudUser.nickName && cloudUser.nickName !== DEFAULT_PROFILE.nickName
    || cloudUser.avatarUrl;

  return localIsDefault && !!cloudHasCustomProfile;
}

function getEventValue(event = {}) {
  if (!event.detail) return undefined;
  if (event.detail.value !== undefined) return event.detail.value;
  if (event.detail.nickName !== undefined) return event.detail.nickName;
  return undefined;
}

Page({
  data: {
    todayEarned: "0.00",
    userProfile: loadUserProfile(),
    nickNameDraft: loadUserProfile().nickName,
    game: buildGameSummary(loadGameState()),
    meetupTab: "all",
    meetupTabs: decorateMeetupTabs("all"),
    myMeetups: [],
    pondTab: "posts",
    pondTabs: decorateTabs("posts"),
    myPosts: [],
    myComments: [],
    myFavorites: [],
    badges: [
      { id: "first", icon: "¥", title: "准时开工", desc: "今日仪表盘已点亮" },
      { id: "fish", icon: "鱼", title: "理性摸鱼", desc: "休息也是回血的一部分" },
      { id: "off", icon: "约", title: "下班有局", desc: "生活不能只剩工位" }
    ]
  },

  onShow() {
    const settings = loadWorkConfig();
    const stats = getWorkStats(settings);
    const userProfile = loadUserProfile();
    const nextData = {
      todayEarned: stats.earned,
      userProfile,
      game: buildGameSummary(loadGameState()),
      meetupTabs: decorateMeetupTabs(this.data.meetupTab),
      myMeetups: [],
      myPosts: getMyPosts(),
      myComments: getMyComments(),
      myFavorites: getMyFavorites()
    };

    if (!this.editingNickName) {
      nextData.nickNameDraft = userProfile.nickName;
    }

    this.setData({
      ...nextData
    });
    this.refreshCloudProfile();
  },

  onUnload() {
    if (this.nickNameSaveTimer) clearTimeout(this.nickNameSaveTimer);
  },

  refreshCloudProfile() {
    cloudApi.getPointSummary().then((res) => {
      if (!res.user) return;
      const localProfile = loadUserProfile();
      const userProfile = shouldHydrateProfileFromCloud(localProfile, res.user)
        ? saveUserProfile(res.user)
        : localProfile;

      const nextData = {
        userProfile,
        game: Object.assign({}, this.data.game, {
          points: res.user.points,
          level: res.user.level
        })
      };

      if (!this.editingNickName) {
        nextData.nickNameDraft = userProfile.nickName;
      }

      this.setData(nextData);
    }).catch(() => {
    });

    cloudApi.getMyMeetups({ filter: this.data.meetupTab }).then((res) => {
      this.setData({
        myMeetups: res.meetups || []
      });
    }).catch(() => {
      this.setData({
        myMeetups: getMyMeetups(this.data.meetupTab)
      });
    });

    cloudApi.getMyFish().then((res) => {
      this.setData({
        myPosts: res.posts || [],
        myFavorites: res.favorites || []
      });
    }).catch(() => {
    });
  },

  buildProfileWithNickName(value) {
    const nickName = String(value || "").trim().slice(0, 24);
    return Object.assign({}, this.data.userProfile, {
      nickName,
      avatarText: getAvatarText(nickName)
    });
  },

  handleNickNameInput(event) {
    const value = getEventValue(event);
    if (value === undefined) return;

    this.editingNickName = true;
    const nickNameDraft = String(value || "").trim().slice(0, 24);
    this.setData({
      nickNameDraft
    });
    this.queueNickNameSave();
  },

  handleNickNameFocus() {
    this.editingNickName = true;
  },

  handleNickNameBlur(event) {
    const value = getEventValue(event);
    if (value === undefined) return;

    const incomingNickName = String(value || "").trim().slice(0, 24);
    const savedNickName = this.data.userProfile.nickName;
    const draftNickName = String(this.data.nickNameDraft || "").trim().slice(0, 24);

    if (incomingNickName === savedNickName && draftNickName && draftNickName !== savedNickName) {
      return;
    }

    this.handleNickNameInput(event);
  },

  queueNickNameSave() {
    if (this.nickNameSaveTimer) clearTimeout(this.nickNameSaveTimer);

    this.nickNameSaveTimer = setTimeout(() => {
      const savedNickName = this.data.userProfile.nickName;
      const draftNickName = String(this.data.nickNameDraft || "").trim().slice(0, 24);

      if (!draftNickName || draftNickName === savedNickName) return;

      this.saveProfile(this.buildProfileWithNickName(draftNickName), "资料已保存");
    }, 350);
  },

  chooseAvatar(event) {
    const avatarUrl = event.detail && event.detail.avatarUrl;
    if (!avatarUrl) return;

    this.saveProfile({ avatarUrl }, "头像已更新");
  },

  saveProfile(change = {}, toastTitle = "资料已保存") {
    if (this.nickNameSaveTimer) {
      clearTimeout(this.nickNameSaveTimer);
      this.nickNameSaveTimer = null;
    }

    const current = Object.assign({}, this.data.userProfile, change || {});
    const userProfile = saveUserProfile(current);

    this.setData({
      userProfile,
      nickNameDraft: userProfile.nickName
    });
    this.editingNickName = false;
    this.syncProfile(userProfile, toastTitle);
  },

  saveProfileFromInput(event = {}) {
    const value = getEventValue(event);
    const savedNickName = this.data.userProfile.nickName;
    const draftNickName = String(this.data.nickNameDraft || "").trim().slice(0, 24);

    if (value !== undefined) {
      const incomingNickName = String(value || "").trim().slice(0, 24);

      if (incomingNickName === savedNickName && draftNickName && draftNickName !== savedNickName) {
        return;
      }

      const userProfile = this.buildProfileWithNickName(incomingNickName || draftNickName || savedNickName);
      this.saveProfile(userProfile, "资料已保存");
      return;
    }

    this.saveProfile(this.buildProfileWithNickName(draftNickName || savedNickName), "资料已保存");
  },

  syncProfile(profile, toastTitle) {
    const finish = (nextProfile) => {
      cloudApi.upsertUserProfile({ profile: nextProfile }).then((res) => {
        const saved = saveUserProfile(Object.assign({}, res.user || {}, nextProfile));
      this.setData({
        userProfile: saved,
        nickNameDraft: saved.nickName
      });
      this.editingNickName = false;
        wx.showToast({
          title: toastTitle,
          icon: "none",
          duration: 1000
        });
      }).catch((error) => {
        cloudApi.showErrorToast(error, "资料暂时只保存在本地");
      });
    };

    if (!profile.avatarUrl || String(profile.avatarUrl).indexOf("http://tmp") !== 0 && String(profile.avatarUrl).indexOf("wxfile://") !== 0) {
      finish(profile);
      return;
    }

    this.uploadAvatar(profile.avatarUrl).then((avatarUrl) => {
      const nextProfile = saveUserProfile(Object.assign({}, profile, { avatarUrl }));

      this.setData({
        userProfile: nextProfile,
        nickNameDraft: nextProfile.nickName
      });
      finish(nextProfile);
    }).catch(() => {
      wx.showToast({
        title: "头像暂时只保存在本地",
        icon: "none",
        duration: 1200
      });
    });
  },

  uploadAvatar(filePath) {
    if (!wx.cloud || !wx.cloud.uploadFile) {
      return Promise.reject(new Error("cloud unavailable"));
    }

    const ext = String(filePath).split(".").pop() || "jpg";
    return wx.cloud.uploadFile({
      cloudPath: `profile-avatars/${Date.now()}.${ext}`,
      filePath
    }).then((res) => res.fileID);
  },

  switchPondTab(event) {
    const tab = event.currentTarget.dataset.id;

    this.setData({
      pondTab: tab,
      pondTabs: decorateTabs(tab)
    });
  },

  switchMeetupTab(event) {
    const tab = event.currentTarget.dataset.id;

    this.setData({
      meetupTab: tab,
      meetupTabs: decorateMeetupTabs(tab),
      myMeetups: []
    });
    cloudApi.getMyMeetups({ filter: tab }).then((res) => {
      this.setData({
        myMeetups: res.meetups || []
      });
    }).catch(() => {
      this.setData({
        myMeetups: getMyMeetups(tab)
      });
    });
  },

  goPostDetail(event) {
    wx.navigateTo({
      url: `/pages/fish/detail/index?id=${event.currentTarget.dataset.id}`
    });
  },

  deleteMyPost(event) {
    const id = event.currentTarget.dataset.id;

    wx.showModal({
      title: "删除这条动态？",
      content: "删除后会从鱼塘和你的个人主页里移除。",
      confirmText: "删除",
      confirmColor: "#B65F2A",
      cancelText: "算了",
      success: (res) => {
        if (!res.confirm) return;

        const result = deletePost(id);
        cloudApi.deleteFishPost({ id }).catch(() => {
        });
        this.setData({
          myPosts: getMyPosts(),
          myComments: getMyComments(),
          myFavorites: getMyFavorites()
        });
        wx.showToast({
          title: result === "success" ? "已删除" : "没找到这条动态",
          icon: "none",
          duration: 1000
        });
      }
    });
  },

  goMeetupDetail(event) {
    wx.navigateTo({
      url: `/pages/offwork/detail/index?id=${event.currentTarget.dataset.id}`
    });
  },

  cancelMyMeetup(event) {
    const id = event.currentTarget.dataset.id;

    wx.showModal({
      title: "取消报名？",
      content: "取消后这个约局会从“我报名”里移除。",
      confirmText: "取消报名",
      confirmColor: "#B65F2A",
      cancelText: "先不",
      success: (res) => {
        if (!res.confirm) return;

        const result = cancelMeetup(id);
        cloudApi.cancelMeetup({ id }).catch(() => {
        });
        this.setData({
          myMeetups: getMyMeetups(this.data.meetupTab)
        });
        wx.showToast({
          title: result === "success" ? "已取消报名" : "暂时不能取消",
          icon: "none",
          duration: 1000
        });
      }
    });
  },

  noop() {
  }
});
