const STORAGE_KEY = "workBuddyMeetupState";
const { loadUserProfile } = require("./profile");

const TYPES = [
  { id: "all", title: "全部" },
  { id: "food", title: "饭搭子" },
  { id: "sport", title: "球搭子" },
  { id: "mahjong", title: "麻将" },
  { id: "walk", title: "散步" },
  { id: "movie", title: "电影" }
];

const LEGACY_SEED_IDS = [2001, 2002, 2003];

function getType(id) {
  return TYPES.find((type) => type.id === id) || TYPES[0];
}

function decorateType(activeType) {
  return TYPES.map((type) => {
    return Object.assign({}, type, {
      className: type.id === activeType ? "type-chip active" : "type-chip"
    });
  });
}

function decorateMeetup(meetup) {
  const type = getType(meetup.type);
  const remain = Math.max(0, meetup.size - meetup.joined);
  const isMine = meetup.isMine || meetup.author === "我";
  const canCancel = meetup.joinedByMe && !isMine;
  const hasLocationMap = meetup.latitude !== null
    && meetup.latitude !== undefined
    && meetup.latitude !== ""
    && meetup.longitude !== null
    && meetup.longitude !== undefined
    && meetup.longitude !== ""
    && Number.isFinite(Number(meetup.latitude))
    && Number.isFinite(Number(meetup.longitude));

  return Object.assign({}, meetup, {
    typeTitle: type.title,
    hasLocationMap,
    remain,
    statusText: remain > 0 ? `还缺 ${remain} 人` : "已满员",
    joinText: meetup.joinedByMe ? "已报名" : remain > 0 ? "我想去" : "满员了",
    joinButtonClass: meetup.joinedByMe ? "join-button joined" : "join-button",
    cancelVisible: canCancel,
    myRoleText: isMine ? "我发起" : meetup.joinedByMe ? "已报名" : "",
    commentCount: (meetup.comments || []).length,
    previewComments: (meetup.comments || []).slice(0, 2),
    cardClass: `meetup-card ${meetup.type}`
  });
}

function loadMeetupState() {
  const saved = wx.getStorageSync(STORAGE_KEY);

  if (saved && Array.isArray(saved.meetups)) {
    const meetups = saved.meetups.filter((meetup) => {
      return LEGACY_SEED_IDS.indexOf(Number(meetup.id)) === -1;
    });

    if (meetups.length !== saved.meetups.length) {
      return saveMeetupState(Object.assign({}, saved, { meetups }));
    }

    return Object.assign({}, saved, { meetups });
  }

  return {
    meetups: []
  };
}

function saveMeetupState(state) {
  wx.setStorageSync(STORAGE_KEY, state);
  return state;
}

function listMeetups(type) {
  const state = loadMeetupState();
  const meetups = state.meetups || [];
  const filtered = type && type !== "all"
    ? meetups.filter((meetup) => meetup.type === type)
    : meetups;

  return filtered.map(decorateMeetup);
}

function getMyMeetups(filter = "all") {
  const state = loadMeetupState();

  return (state.meetups || [])
    .filter((meetup) => {
      const isMine = meetup.isMine || meetup.author === "我";

      if (filter === "created") return isMine;
      if (filter === "joined") return meetup.joinedByMe && !isMine;

      return isMine || meetup.joinedByMe;
    })
    .map(decorateMeetup);
}

function getMeetup(id) {
  const state = loadMeetupState();
  const targetId = Number(id);
  const meetup = (state.meetups || []).find((item) => Number(item.id) === targetId);

  return meetup ? decorateMeetup(meetup) : null;
}

function createMeetup(input) {
  const state = loadMeetupState();
  const profile = loadUserProfile();
  const size = Math.min(20, Math.max(2, Number(input.size) || 2));
  const meetup = {
    id: Date.now(),
    type: input.type || "food",
    title: String(input.title || "").trim().slice(0, 24),
    time: String(input.time || "").trim().slice(0, 12),
    location: String(input.location || "").trim().slice(0, 24),
    locationAddress: String(input.locationAddress || "").trim().slice(0, 80),
    latitude: Number(input.latitude) || null,
    longitude: Number(input.longitude) || null,
    size,
    joined: 1,
    joinedByMe: true,
    author: profile.nickName,
    avatarText: profile.avatarText,
    avatarUrl: profile.avatarUrl,
    isMine: true,
    desc: String(input.desc || "").trim().slice(0, 120),
    createdAt: "刚刚",
    comments: []
  };

  state.meetups = [meetup].concat(state.meetups || []);
  saveMeetupState(state);

  return meetup;
}

function joinMeetup(id) {
  const state = loadMeetupState();
  const targetId = Number(id);
  let result = "missing";

  state.meetups = (state.meetups || []).map((meetup) => {
    if (Number(meetup.id) !== targetId) return meetup;
    if (meetup.joinedByMe) {
      result = "joined";
      return meetup;
    }
    if (meetup.joined >= meetup.size) {
      result = "full";
      return meetup;
    }

    result = "success";
    return Object.assign({}, meetup, {
      joined: meetup.joined + 1,
      joinedByMe: true
    });
  });

  saveMeetupState(state);

  return result;
}

function cancelMeetup(id) {
  const state = loadMeetupState();
  const targetId = Number(id);
  let result = "missing";

  state.meetups = (state.meetups || []).map((meetup) => {
    if (Number(meetup.id) !== targetId) return meetup;
    if (meetup.isMine || meetup.author === "我") {
      result = "owner";
      return meetup;
    }
    if (!meetup.joinedByMe) {
      result = "not_joined";
      return meetup;
    }

    result = "success";
    return Object.assign({}, meetup, {
      joined: Math.max(0, meetup.joined - 1),
      joinedByMe: false
    });
  });

  saveMeetupState(state);

  return result;
}

function addMeetupComment(id, text) {
  const content = String(text || "").trim().slice(0, 60);
  if (!content) return { result: "empty" };

  const state = loadMeetupState();
  const profile = loadUserProfile();
  const targetId = Number(id);
  let result = "missing";

  state.meetups = (state.meetups || []).map((meetup) => {
    if (Number(meetup.id) !== targetId) return meetup;

    result = "success";
    return Object.assign({}, meetup, {
      comments: [
        {
          id: Date.now(),
          author: profile.nickName,
          avatarText: profile.avatarText,
          avatarUrl: profile.avatarUrl,
          isMine: true,
          text: content,
          createdAt: "刚刚"
        }
      ].concat(meetup.comments || []).slice(0, 30)
    });
  });

  saveMeetupState(state);

  return { result };
}

module.exports = {
  TYPES,
  addMeetupComment,
  cancelMeetup,
  createMeetup,
  decorateType,
  getMeetup,
  getMyMeetups,
  joinMeetup,
  listMeetups
};
