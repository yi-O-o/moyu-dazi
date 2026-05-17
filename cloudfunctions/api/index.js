const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const COLLECTIONS = {
  users: "users",
  fishPosts: "fish_posts",
  meetups: "meetups",
  pointEvents: "point_events",
  welfareAppeals: "welfare_appeals"
};

const LEVELS = [
  { level: 1, title: "试用期小搭子", min: 0 },
  { level: 2, title: "准点喝水员", min: 5 },
  { level: 3, title: "工位陪伴官", min: 12 },
  { level: 4, title: "摸鱼观察员", min: 22 },
  { level: 5, title: "下班愿望守护者", min: 35 },
  { level: 6, title: "搭子圈活跃星", min: 55 },
  { level: 7, title: "打工生存专家", min: 80 },
  { level: 8, title: "宠物福利合伙人", min: 110 }
];

const CHANNEL_TITLES = {
  all: "全部",
  cup: "续命杯",
  desk: "工位角",
  outfit: "穿搭",
  lunch: "午饭",
  fish: "摸鱼",
  wish: "下班想",
  pet: "宠物"
};

const TYPE_TITLES = {
  all: "全部",
  food: "饭搭子",
  sport: "球搭子",
  mahjong: "麻将",
  walk: "散步",
  movie: "电影"
};

const POINT_RULES = {
  pond_publish: { points: 2, dailyLimit: 3 },
  pond_comment: { points: 1, dailyLimit: 5 },
  meetup_publish: { points: 3, dailyLimit: 3 },
  meetup_join: { points: 2, dailyLimit: 3 },
  meetup_comment: { points: 1, dailyLimit: 5 },
  wish_added: { points: 1, dailyLimit: 1 },
  mystic_sign: { points: 1, dailyLimit: 1 },
  fish_break: { points: 2, dailyLimit: 1 }
};

function ok(data = {}) {
  return { ok: true, data };
}

function fail(code, message) {
  return { ok: false, code, message };
}

class PublicError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.publicMessage = message;
  }
}

function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function limitText(value, max, fallback = "") {
  return String(value || fallback).trim().slice(0, max);
}

function guessImageContentType(fileId) {
  const lower = String(fileId || "").split("?")[0].toLowerCase();

  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";

  return "image/jpeg";
}

function isSafetyPass(res) {
  const result = res && res.result ? res.result : null;

  if (result && result.suggest) {
    return result.suggest === "pass";
  }

  return !res || res.errCode === 0 || res.errcode === 0;
}

async function checkTextSafety(openid, content, label) {
  const text = limitText(content, 2500);
  if (!text) return;

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      version: 2,
      scene: 2,
      openid,
      content: text
    });

    if (!isSafetyPass(res)) {
      throw new PublicError("CONTENT_RISK", `${label}包含不适合发布的内容`);
    }
  } catch (error) {
    if (error instanceof PublicError) throw error;
    console.error("msgSecCheck failed", label, error);
    throw new PublicError("REVIEW_FAILED", "内容审核暂时不可用，请稍后再试");
  }
}

async function checkImageSafety(openid, images) {
  const fileIds = (images || [])
    .filter((image) => String(image || "").indexOf("cloud://") === 0)
    .slice(0, 6);

  for (const fileId of fileIds) {
    try {
      const file = await cloud.downloadFile({ fileID: fileId });
      const res = await cloud.openapi.security.imgSecCheck({
        media: {
          contentType: guessImageContentType(fileId),
          value: file.fileContent
        }
      });

      if (!isSafetyPass(res)) {
        throw new PublicError("CONTENT_RISK", "图片包含不适合发布的内容");
      }
    } catch (error) {
      if (error instanceof PublicError) throw error;
      console.error("imgSecCheck failed", openid, fileId, error);
      throw new PublicError("REVIEW_FAILED", "图片审核暂时不可用，请稍后再试");
    }
  }
}

async function checkTextFields(openid, fields) {
  for (const item of fields) {
    await checkTextSafety(openid, item.content, item.label);
  }
}

function formatTime(value) {
  if (!value) return "刚刚";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";

  const now = new Date();
  const diff = Math.max(0, now.getTime() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;

  const today = dateKey(now);
  if (dateKey(date) === today) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  return `${date.getMonth() + 1}-${date.getDate()}`;
}

function getPetLevel(points) {
  const current = LEVELS.reduce((matched, item) => {
    return points >= item.min ? item : matched;
  }, LEVELS[0]);
  const currentIndex = LEVELS.findIndex((item) => item.level === current.level);
  const next = LEVELS[currentIndex + 1] || null;
  const levelEnd = next ? next.min : current.min + 40;
  const progress = Math.min(100, Math.round(((points - current.min) / (levelEnd - current.min)) * 100));

  return Object.assign({}, current, {
    nextTitle: next ? next.title : "福利合伙人进阶中",
    nextPoints: next ? next.min : levelEnd,
    progress
  });
}

function normalizeId(input) {
  return String(input || "").trim();
}

async function getUser(openid) {
  try {
    const res = await db.collection(COLLECTIONS.users).doc(openid).get();
    return res.data || null;
  } catch (error) {
    return null;
  }
}

async function ensureUser(openid, profile = {}) {
  const existing = await getUser(openid);
  const data = {
    _openid: openid,
    nickName: limitText(profile.nickName, 24, existing && existing.nickName ? existing.nickName : "摸鱼搭子"),
    avatarText: limitText(profile.avatarText, 1, existing && existing.avatarText ? existing.avatarText : "搭"),
    avatarUrl: limitText(profile.avatarUrl, 240, existing && existing.avatarUrl ? existing.avatarUrl : ""),
    updatedAt: db.serverDate()
  };

  if (!existing) {
    await db.collection(COLLECTIONS.users).doc(openid).set({
      data: Object.assign({}, data, {
        points: 0,
        createdAt: db.serverDate()
      })
    });
    return Object.assign({}, data, { points: 0 });
  }

  await db.collection(COLLECTIONS.users).doc(openid).update({ data });
  return Object.assign({}, existing, data);
}

async function addPoints(openid, eventType) {
  const rule = POINT_RULES[eventType];
  if (!rule) return { added: 0, limited: true };

  await ensureUser(openid);

  const today = dateKey();
  const eventId = `${openid}_${today}_${eventType}`;
  let event = null;

  try {
    const res = await db.collection(COLLECTIONS.pointEvents).doc(eventId).get();
    event = res.data;
  } catch (error) {
    event = null;
  }

  if (event && event.count >= rule.dailyLimit) {
    return { added: 0, limited: true };
  }

  if (event) {
    await db.collection(COLLECTIONS.pointEvents).doc(eventId).update({
      data: {
        count: _.inc(1),
        points: _.inc(rule.points),
        updatedAt: db.serverDate()
      }
    });
  } else {
    await db.collection(COLLECTIONS.pointEvents).doc(eventId).set({
      data: {
        _openid: openid,
        date: today,
        eventType,
        count: 1,
        points: rule.points,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });
  }

  await db.collection(COLLECTIONS.users).doc(openid).update({
    data: {
      points: _.inc(rule.points),
      updatedAt: db.serverDate()
    }
  });

  return { added: rule.points, limited: false };
}

function decorateUser(user, openid) {
  const points = Number(user && user.points) || 0;

  return {
    openid,
    nickName: user && user.nickName ? user.nickName : "摸鱼搭子",
    avatarText: user && user.avatarText ? user.avatarText : "搭",
    avatarUrl: user && user.avatarUrl ? user.avatarUrl : "",
    points,
    level: getPetLevel(points),
    todayMystic: user && user.todayMystic ? user.todayMystic : null
  };
}

function decoratePost(post, openid) {
  const likedBy = post.likedBy || [];
  const favoritedBy = post.favoritedBy || [];
  const sameBy = post.sameBy || [];
  const comments = (post.comments || []).map((comment) => {
    return Object.assign({}, comment, {
      avatar: comment.avatarText || String(comment.author || "评").slice(0, 1),
      createdAt: formatTime(comment.createdAt)
    });
  });
  const images = post.images || [];
  const imageTiles = images.map((image, index) => {
    const isMock = String(image).indexOf("mock:") === 0;
    const mockType = isMock ? String(image).replace("mock:", "") : "";

    return {
      id: `${post._id}-${index}`,
      src: image,
      isMock,
      mockClass: `mock-image ${mockType}`,
      mockText: mockType ? mockType.slice(0, 1).toUpperCase() : "图"
    };
  });

  return Object.assign({}, post, {
    id: post._id,
    isMine: post._openid === openid,
    avatar: post.avatarText || String(post.author || "鱼").slice(0, 1),
    channelTitle: CHANNEL_TITLES[post.channel] || "鱼塘",
    images,
    imageTiles,
    imageCount: images.length,
    liked: likedBy.indexOf(openid) >= 0,
    favorited: favoritedBy.indexOf(openid) >= 0,
    sameMarked: sameBy.indexOf(openid) >= 0,
    likeCount: likedBy.length,
    favoriteCount: favoritedBy.length,
    sameCount: sameBy.length,
    comments,
    commentCount: comments.length,
    latestComments: comments.slice(-2),
    likeText: likedBy.indexOf(openid) >= 0 ? "已赞" : "赞",
    favoriteText: favoritedBy.indexOf(openid) >= 0 ? "已藏" : "收藏",
    createdAt: formatTime(post.createdAt)
  });
}

function decorateMeetup(meetup, openid) {
  const joinedBy = meetup.joinedBy || [];
  const joinedByMe = joinedBy.indexOf(openid) >= 0;
  const isMine = meetup._openid === openid;
  const remain = Math.max(0, Number(meetup.size || 0) - joinedBy.length);
  const hasLocationMap = meetup.latitude !== null
    && meetup.latitude !== undefined
    && meetup.latitude !== ""
    && meetup.longitude !== null
    && meetup.longitude !== undefined
    && meetup.longitude !== ""
    && Number.isFinite(Number(meetup.latitude))
    && Number.isFinite(Number(meetup.longitude));

  return Object.assign({}, meetup, {
    id: meetup._id,
    typeTitle: TYPE_TITLES[meetup.type] || "约局",
    hasLocationMap,
    joined: joinedBy.length,
    joinedByMe,
    isMine,
    remain,
    statusText: remain > 0 ? `还缺 ${remain} 人` : "已满员",
    joinText: joinedByMe ? "已报名" : remain > 0 ? "我想去" : "满员了",
    joinButtonClass: joinedByMe ? "join-button joined" : "join-button",
    cancelVisible: joinedByMe && !isMine,
    commentCount: (meetup.comments || []).length,
    previewComments: (meetup.comments || []).slice(0, 2).map((comment) => {
      return Object.assign({}, comment, {
        createdAt: formatTime(comment.createdAt)
      });
    }),
    comments: (meetup.comments || []).map((comment) => {
      return Object.assign({}, comment, {
        createdAt: formatTime(comment.createdAt)
      });
    }),
    cardClass: `meetup-card ${meetup.type}`,
    createdAt: formatTime(meetup.createdAt)
  });
}

async function userGet(openid, data) {
  const targetOpenid = normalizeId(data.openid) || openid;
  const user = await getUser(targetOpenid);

  return ok({
    user: decorateUser(user, targetOpenid),
    isMine: targetOpenid === openid
  });
}

async function userUpsert(openid, data) {
  const profile = data.profile || data;

  await checkTextFields(openid, [
    { label: "昵称", content: profile.nickName },
    { label: "头像文字", content: profile.avatarText }
  ]);

  const user = await ensureUser(openid, data.profile || data);
  return ok({ user: decorateUser(user, openid) });
}

async function pointsSummary(openid) {
  const user = await ensureUser(openid);
  return ok({ user: decorateUser(user, openid) });
}

async function fishList(openid, data) {
  const channel = limitText(data.channel, 24, "all");
  const authorOpenid = normalizeId(data.openid);
  const pageSize = Math.min(50, Math.max(1, Number(data.pageSize) || 20));
  const where = {
    deleted: _.neq(true),
    reported: _.neq(true)
  };

  if (channel && channel !== "all") where.channel = channel;
  if (authorOpenid) where._openid = authorOpenid;

  const res = await db.collection(COLLECTIONS.fishPosts)
    .where(where)
    .orderBy("createdAt", "desc")
    .limit(pageSize)
    .get();

  return ok({
    posts: (res.data || []).map((post) => decoratePost(post, openid))
  });
}

async function fishGet(openid, data) {
  const id = normalizeId(data.id);
  if (!id) return fail("BAD_REQUEST", "缺少动态 id");

  const res = await db.collection(COLLECTIONS.fishPosts).doc(id).get();
  const post = res.data;
  if (!post || post.deleted || post.reported) return fail("NOT_FOUND", "动态不存在");

  return ok({ post: decoratePost(post, openid) });
}

async function fishCreate(openid, data) {
  const content = limitText(data.content, 200);
  const rawImages = Array.isArray(data.images) ? data.images.slice(0, 6) : [];
  const images = rawImages.filter((image) => String(image || "").indexOf("cloud://") === 0);
  if (rawImages.length !== images.length) return fail("BAD_REQUEST", "图片上传失败，请重新选择图片");
  if (!content && !images.length) return fail("BAD_REQUEST", "写一句话或加一张图");

  await checkTextFields(openid, [
    { label: "动态内容", content },
    { label: "动态标题", content: data.title },
    { label: "动态心情", content: data.mood },
    { label: "动态标签", content: Array.isArray(data.tags) ? data.tags.join(" ") : "" }
  ]);
  await checkImageSafety(openid, images);

  const user = await ensureUser(openid, data.profile || {});
  const title = limitText(data.title, 24, content.split(/\n/)[0].slice(0, 24) || "今天的上班小动态");
  const post = {
    _openid: openid,
    author: user.nickName || "我",
    avatarText: user.avatarText || String(user.nickName || "我").slice(0, 1),
    channel: limitText(data.channel, 24, "cup"),
    title,
    content,
    images,
    tags: Array.isArray(data.tags) ? data.tags.slice(0, 4) : [],
    mood: limitText(data.mood, 12, "还行"),
    likedBy: [],
    favoritedBy: [],
    sameBy: [],
    comments: [],
    deleted: false,
    reported: false,
    reviewStatus: "pass",
    reviewedAt: db.serverDate(),
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };
  const res = await db.collection(COLLECTIONS.fishPosts).add({ data: post });
  const pointResult = await addPoints(openid, "pond_publish");

  return ok({ id: res._id, points: pointResult });
}

async function fishDelete(openid, data) {
  const id = normalizeId(data.id);
  if (!id) return fail("BAD_REQUEST", "缺少动态 id");

  const res = await db.collection(COLLECTIONS.fishPosts).doc(id).get();
  const post = res.data;
  if (!post || post.deleted) return fail("NOT_FOUND", "动态不存在");
  if (post._openid !== openid) return fail("FORBIDDEN", "只能删除自己的动态");

  await db.collection(COLLECTIONS.fishPosts).doc(id).update({
    data: {
      deleted: true,
      updatedAt: db.serverDate()
    }
  });

  return ok({ id });
}

async function fishReport(openid, data) {
  const id = normalizeId(data.id);
  if (!id) return fail("BAD_REQUEST", "缺少动态 id");

  await db.collection(COLLECTIONS.fishPosts).doc(id).update({
    data: {
      reported: true,
      reports: _.push({
        _openid: openid,
        reason: limitText(data.reason, 80, "用户举报"),
        createdAt: db.serverDate()
      }),
      updatedAt: db.serverDate()
    }
  });

  return ok({ id });
}

async function fishReact(openid, data) {
  const id = normalizeId(data.id);
  const type = limitText(data.type, 20);
  const fieldMap = {
    like: "likedBy",
    favorite: "favoritedBy",
    same: "sameBy"
  };
  const field = fieldMap[type];
  if (!id || !field) return fail("BAD_REQUEST", "参数错误");

  const res = await db.collection(COLLECTIONS.fishPosts).doc(id).get();
  const post = res.data;
  const list = post && post[field] ? post[field] : [];
  const exists = list.indexOf(openid) >= 0;
  const nextList = exists
    ? list.filter((item) => item !== openid)
    : list.concat(openid);

  await db.collection(COLLECTIONS.fishPosts).doc(id).update({
    data: {
      [field]: nextList,
      updatedAt: db.serverDate()
    }
  });

  return ok({ active: !exists });
}

async function fishComment(openid, data) {
  const id = normalizeId(data.id);
  const content = limitText(data.content, 80);
  if (!id || !content) return fail("BAD_REQUEST", "先写一句评论");

  await checkTextSafety(openid, content, "评论");

  const user = await ensureUser(openid, data.profile || {});
  const comment = {
    id: `${Date.now()}_${openid.slice(-6)}`,
    _openid: openid,
    author: user.nickName || "我",
    avatarText: user.avatarText || "我",
    content,
    reviewStatus: "pass",
    createdAt: db.serverDate()
  };

  await db.collection(COLLECTIONS.fishPosts).doc(id).update({
    data: {
      comments: _.push(comment),
      updatedAt: db.serverDate()
    }
  });
  const pointResult = await addPoints(openid, "pond_comment");

  return ok({ comment, points: pointResult });
}

async function fishMine(openid) {
  const posts = await fishList(openid, { openid });
  const favoriteRes = await db.collection(COLLECTIONS.fishPosts)
    .where({
      deleted: _.neq(true),
      reported: _.neq(true),
      favoritedBy: openid
    })
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return ok({
    posts: posts.data.posts,
    favorites: (favoriteRes.data || []).map((post) => decoratePost(post, openid))
  });
}

async function meetupList(openid, data) {
  const type = limitText(data.type, 24, "all");
  const pageSize = Math.min(50, Math.max(1, Number(data.pageSize) || 20));
  const where = {
    deleted: _.neq(true)
  };
  if (type && type !== "all") where.type = type;

  const res = await db.collection(COLLECTIONS.meetups)
    .where(where)
    .orderBy("createdAt", "desc")
    .limit(pageSize)
    .get();

  return ok({
    meetups: (res.data || []).map((meetup) => decorateMeetup(meetup, openid))
  });
}

async function meetupGet(openid, data) {
  const id = normalizeId(data.id);
  if (!id) return fail("BAD_REQUEST", "缺少约局 id");

  const res = await db.collection(COLLECTIONS.meetups).doc(id).get();
  const meetup = res.data;
  if (!meetup || meetup.deleted) return fail("NOT_FOUND", "约局不存在");

  return ok({ meetup: decorateMeetup(meetup, openid) });
}

async function meetupCreate(openid, data) {
  const title = limitText(data.title, 24);
  const time = limitText(data.time, 12);
  const location = limitText(data.location, 24);
  const locationAddress = limitText(data.locationAddress, 80);
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  const hasLocationMap = data.latitude !== null
    && data.latitude !== undefined
    && data.latitude !== ""
    && data.longitude !== null
    && data.longitude !== undefined
    && data.longitude !== ""
    && Number.isFinite(latitude)
    && Number.isFinite(longitude);
  if (!title || !time || !location) return fail("BAD_REQUEST", "标题、时间、地点都写一下");

  await checkTextFields(openid, [
    { label: "约局标题", content: title },
    { label: "约局时间", content: time },
    { label: "约局地点", content: location },
    { label: "约局地址", content: locationAddress },
    { label: "约局说明", content: data.desc }
  ]);

  const user = await ensureUser(openid, data.profile || {});
  const meetup = {
    _openid: openid,
    author: user.nickName || "我",
    avatarText: user.avatarText || "我",
    type: limitText(data.type, 24, "food"),
    title,
    time,
    location,
    locationAddress,
    latitude: hasLocationMap ? latitude : null,
    longitude: hasLocationMap ? longitude : null,
    size: Math.min(20, Math.max(2, Number(data.size) || 2)),
    desc: limitText(data.desc, 120),
    joinedBy: [openid],
    comments: [],
    deleted: false,
    reviewStatus: "pass",
    reviewedAt: db.serverDate(),
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };
  const res = await db.collection(COLLECTIONS.meetups).add({ data: meetup });
  const pointResult = await addPoints(openid, "meetup_publish");

  return ok({ id: res._id, points: pointResult });
}

async function meetupJoin(openid, data) {
  const id = normalizeId(data.id);
  if (!id) return fail("BAD_REQUEST", "缺少约局 id");

  const res = await db.collection(COLLECTIONS.meetups).doc(id).get();
  const meetup = res.data;
  if (!meetup || meetup.deleted) return fail("NOT_FOUND", "约局不存在");

  const joinedBy = meetup.joinedBy || [];
  if (joinedBy.indexOf(openid) >= 0) return ok({ result: "joined" });
  if (joinedBy.length >= Number(meetup.size || 0)) return ok({ result: "full" });

  await db.collection(COLLECTIONS.meetups).doc(id).update({
    data: {
      joinedBy: joinedBy.concat(openid),
      updatedAt: db.serverDate()
    }
  });
  const pointResult = await addPoints(openid, "meetup_join");

  return ok({ result: "success", points: pointResult });
}

async function meetupCancel(openid, data) {
  const id = normalizeId(data.id);
  if (!id) return fail("BAD_REQUEST", "缺少约局 id");

  const res = await db.collection(COLLECTIONS.meetups).doc(id).get();
  const meetup = res.data;
  if (!meetup || meetup.deleted) return fail("NOT_FOUND", "约局不存在");
  if (meetup._openid === openid) return fail("FORBIDDEN", "发起人不能取消报名");

  await db.collection(COLLECTIONS.meetups).doc(id).update({
    data: {
      joinedBy: (meetup.joinedBy || []).filter((item) => item !== openid),
      updatedAt: db.serverDate()
    }
  });

  return ok({ result: "success" });
}

async function meetupComment(openid, data) {
  const id = normalizeId(data.id);
  const text = limitText(data.text || data.content, 60);
  if (!id || !text) return fail("BAD_REQUEST", "先写一句评论");

  await checkTextSafety(openid, text, "评论");

  const user = await ensureUser(openid, data.profile || {});
  const comment = {
    id: `${Date.now()}_${openid.slice(-6)}`,
    _openid: openid,
    author: user.nickName || "我",
    text,
    reviewStatus: "pass",
    createdAt: db.serverDate()
  };
  await db.collection(COLLECTIONS.meetups).doc(id).update({
    data: {
      comments: _.push(comment),
      updatedAt: db.serverDate()
    }
  });
  const pointResult = await addPoints(openid, "meetup_comment");

  return ok({ comment, points: pointResult });
}

async function meetupMine(openid, data) {
  const filter = limitText(data.filter, 16, "all");
  const where = {
    deleted: _.neq(true)
  };

  if (filter === "created") {
    where._openid = openid;
  } else if (filter === "joined") {
    where.joinedBy = openid;
    where._openid = _.neq(openid);
  } else {
    where.joinedBy = openid;
  }

  const res = await db.collection(COLLECTIONS.meetups)
    .where(where)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return ok({
    meetups: (res.data || []).map((meetup) => decorateMeetup(meetup, openid))
  });
}

async function welfareAppeal(openid, data) {
  const content = limitText(data.content, 120);
  if (!content) return fail("BAD_REQUEST", "先写一下问题");

  await checkTextSafety(openid, content, "反馈内容");

  const user = await ensureUser(openid, data.profile || {});
  const res = await db.collection(COLLECTIONS.welfareAppeals).add({
    data: {
      _openid: openid,
      nickName: user.nickName || "摸鱼搭子",
      content,
      status: "pending",
      reviewStatus: "pass",
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    }
  });

  return ok({ id: res._id, status: "pending" });
}

const handlers = {
  "user.get": userGet,
  "user.upsert": userUpsert,
  "points.summary": pointsSummary,
  "fish.list": fishList,
  "fish.get": fishGet,
  "fish.create": fishCreate,
  "fish.delete": fishDelete,
  "fish.report": fishReport,
  "fish.react": fishReact,
  "fish.comment": fishComment,
  "fish.mine": fishMine,
  "meetup.list": meetupList,
  "meetup.get": meetupGet,
  "meetup.create": meetupCreate,
  "meetup.join": meetupJoin,
  "meetup.cancel": meetupCancel,
  "meetup.comment": meetupComment,
  "meetup.mine": meetupMine,
  "welfare.appeal": welfareAppeal
};

exports.main = async (event = {}) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event.action;
  const data = event.data || {};
  const handler = handlers[action];

  if (!openid) return fail("NO_OPENID", "无法获取用户身份");
  if (!handler) return fail("NO_ACTION", "未知操作");

  try {
    return await handler(openid, data);
  } catch (error) {
    if (error instanceof PublicError) {
      return fail(error.code, error.publicMessage);
    }

    console.error(action, error);
    return fail("SERVER_ERROR", error.message || "服务暂时不可用");
  }
};
