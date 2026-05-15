const STORAGE_KEY = "workBuddyMeetupState";

const TYPES = [
  { id: "all", title: "全部" },
  { id: "food", title: "饭搭子" },
  { id: "sport", title: "球搭子" },
  { id: "mahjong", title: "麻将" },
  { id: "walk", title: "散步" },
  { id: "movie", title: "电影" }
];

const SEED_MEETUPS = [
  {
    id: 2001,
    type: "sport",
    title: "今晚 8 点羽毛球",
    time: "20:00",
    location: "公司附近球馆",
    size: 4,
    joined: 2,
    joinedByMe: false,
    author: "球场续命人",
    desc: "新手友好，AA 场地费，打完可以一起买水。",
    createdAt: "刚刚"
  },
  {
    id: 2002,
    type: "food",
    title: "下班火锅饭搭子",
    time: "19:10",
    location: "地铁口附近",
    size: 3,
    joined: 1,
    joinedByMe: false,
    author: "碳水快乐",
    desc: "不聊工作，只负责吃饱。",
    createdAt: "12 分钟前"
  },
  {
    id: 2003,
    type: "mahjong",
    title: "饭后休闲麻将",
    time: "20:30",
    location: "老地方",
    size: 4,
    joined: 3,
    joinedByMe: false,
    author: "三缺一观察员",
    desc: "轻松局，主打聊天和回血。",
    createdAt: "半小时前"
  }
];

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

  return Object.assign({}, meetup, {
    typeTitle: type.title,
    remain,
    statusText: remain > 0 ? `还缺 ${remain} 人` : "已满员",
    joinText: meetup.joinedByMe ? "已报名" : remain > 0 ? "我想去" : "满员了",
    joinButtonClass: meetup.joinedByMe ? "join-button joined" : "join-button",
    cardClass: `meetup-card ${meetup.type}`
  });
}

function loadMeetupState() {
  const saved = wx.getStorageSync(STORAGE_KEY);

  if (saved && saved.meetups) return saved;

  return {
    meetups: SEED_MEETUPS
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

function createMeetup(input) {
  const state = loadMeetupState();
  const size = Math.min(20, Math.max(2, Number(input.size) || 2));
  const meetup = {
    id: Date.now(),
    type: input.type || "food",
    title: String(input.title || "").trim().slice(0, 24),
    time: String(input.time || "").trim().slice(0, 12),
    location: String(input.location || "").trim().slice(0, 24),
    size,
    joined: 1,
    joinedByMe: true,
    author: "我",
    desc: String(input.desc || "").trim().slice(0, 120),
    createdAt: "刚刚"
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

module.exports = {
  TYPES,
  createMeetup,
  decorateType,
  joinMeetup,
  listMeetups
};
