function callApi(action, data = {}) {
  if (!wx.cloud || !wx.cloud.callFunction) {
    return Promise.reject(new Error("cloud unavailable"));
  }

  return wx.cloud.callFunction({
    name: "api",
    data: {
      action,
      data
    }
  }).then((res) => {
    const result = res.result || {};

    if (!result.ok) {
      const error = new Error(result.message || "request failed");
      error.code = result.code || "UNKNOWN";
      throw error;
    }

    return result.data;
  });
}

function shouldUseLocalFallback(error) {
  const blockedCodes = ["BAD_REQUEST", "CONTENT_RISK", "REVIEW_FAILED", "FORBIDDEN"];

  return blockedCodes.indexOf(error && error.code) === -1;
}

function showErrorToast(error, fallback = "操作失败了") {
  wx.showToast({
    title: error && error.message ? error.message : fallback,
    icon: "none",
    duration: 1400
  });
}

module.exports = {
  addFishComment(data) {
    return callApi("fish.comment", data);
  },

  addMeetupComment(data) {
    return callApi("meetup.comment", data);
  },

  cancelMeetup(data) {
    return callApi("meetup.cancel", data);
  },

  createFishPost(data) {
    return callApi("fish.create", data);
  },

  createMeetup(data) {
    return callApi("meetup.create", data);
  },

  deleteFishPost(data) {
    return callApi("fish.delete", data);
  },

  getFishPost(data) {
    return callApi("fish.get", data);
  },

  getMeetup(data) {
    return callApi("meetup.get", data);
  },

  getMyFish(data) {
    return callApi("fish.mine", data);
  },

  getMyMeetups(data) {
    return callApi("meetup.mine", data);
  },

  getPointSummary() {
    return callApi("points.summary");
  },

  getUserProfile(data) {
    return callApi("user.get", data);
  },

  joinMeetup(data) {
    return callApi("meetup.join", data);
  },

  listFishPosts(data) {
    return callApi("fish.list", data);
  },

  listMeetups(data) {
    return callApi("meetup.list", data);
  },

  reportFishPost(data) {
    return callApi("fish.report", data);
  },

  submitWelfareAppeal(data) {
    return callApi("welfare.appeal", data);
  },

  toggleFishReaction(data) {
    return callApi("fish.react", data);
  },

  shouldUseLocalFallback,
  showErrorToast,

  upsertUserProfile(data) {
    return callApi("user.upsert", data);
  }
};
