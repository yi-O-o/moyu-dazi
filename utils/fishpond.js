const STORAGE_KEY = "workBuddyFishpondState";

const CHANNELS = [
  {
    id: "all",
    title: "全部",
    desc: "看看大家怎么上班",
    prompts: ["今天工位发生了什么", "晒一个回血小物", "说一句上班实话"],
    safeTip: "不要露出公司敏感信息、工牌、客户资料和业务屏幕。"
  },
  {
    id: "cup",
    title: "续命杯",
    desc: "咖啡、奶茶、保温杯",
    prompts: ["今天靠哪杯续命", "杯子里装着什么", "求同款杯子链接"],
    safeTip: "杯子图尽量避开工牌、电脑屏幕和公司文件。"
  },
  {
    id: "desk",
    title: "工位角",
    desc: "桌搭、键盘、工位小物",
    prompts: ["晒桌面小物", "工位收纳前后", "键盘鼠标和小摆件"],
    safeTip: "发布前请遮挡屏幕、工牌、文件、姓名和公司敏感信息。"
  },
  {
    id: "outfit",
    title: "穿搭",
    desc: "通勤、开会、舒适办公",
    prompts: ["通勤穿搭", "开会不累套装", "办公室舒适穿法"],
    safeTip: "穿搭图注意保护个人隐私，避免暴露住址和公司定位。"
  },
  {
    id: "lunch",
    title: "午饭",
    desc: "外卖、便当、食堂",
    prompts: ["今天吃什么", "公司食堂打分", "外卖避雷或推荐"],
    safeTip: "晒小票时记得遮挡手机号、地址和订单号。"
  },
  {
    id: "fish",
    title: "摸鱼",
    desc: "短暂回血和发呆方式",
    prompts: ["三分钟回血方式", "工位小零食", "今日发呆角落"],
    safeTip: "摸鱼可以轻松，但不要发布影响自己工作的敏感内容。"
  },
  {
    id: "wish",
    title: "下班想",
    desc: "今晚想做什么",
    prompts: ["下班想吃什么", "今晚想去哪", "有没有人一起"],
    safeTip: "线下约见建议选择公开场所，先在评论里确认细节。"
  },
  {
    id: "pet",
    title: "宠物",
    desc: "晒宠物等级和气泡",
    prompts: ["今天宠物几级了", "宠物说了什么", "升级截图"],
    safeTip: "分享截图前确认没有露出个人隐私或账号信息。"
  }
];

const SEED_POST_IDS = [1001, 1002, 1003];

function getChannel(id) {
  return CHANNELS.find((channel) => channel.id === id) || CHANNELS[0];
}

function getHotTags(posts) {
  const tagMap = {};

  posts.forEach((post) => {
    (post.tags || []).forEach((tag) => {
      tagMap[tag] = (tagMap[tag] || 0) + 1;
    });
  });

  return Object.keys(tagMap)
    .sort((first, second) => tagMap[second] - tagMap[first])
    .slice(0, 6);
}

function getFeaturedPosts(posts) {
  return posts
    .filter((post) => !post.reported)
    .slice()
    .sort((first, second) => {
      const firstScore = first.likeCount + first.favoriteCount * 2 + (first.comments || []).length * 2 + first.sameCount;
      const secondScore = second.likeCount + second.favoriteCount * 2 + (second.comments || []).length * 2 + second.sameCount;

      return secondScore - firstScore;
    })
    .slice(0, 3)
    .map(decoratePost);
}

function decoratePost(post) {
  const channel = getChannel(post.channel);
  const comments = (post.comments || []).map((comment) => {
    return Object.assign({}, comment, {
      avatar: String(comment.author || "评").slice(0, 1)
    });
  });
  const tags = post.tags || [];
  const images = post.images || [];
  const imageTiles = images.map((image, index) => {
    const isMock = String(image).indexOf("mock:") === 0;
    const mockType = isMock ? String(image).replace("mock:", "") : "";

    return {
      id: `${post.id}-${index}`,
      src: image,
      isMock,
      mockClass: `mock-image ${mockType}`,
      mockText: mockType ? mockType.slice(0, 1).toUpperCase() : "图"
    };
  });

  return Object.assign({}, post, {
    channelTitle: channel.title,
    avatar: String(post.author || "鱼").slice(0, 1),
    tags,
    images,
    imageTiles,
    imageCount: images.length,
    comments,
    commentCount: comments.length,
    likeText: post.liked ? "已赞" : "赞",
    favoriteText: post.favorited ? "已藏" : "收藏",
    latestComments: comments.slice(-2)
  });
}

function isSeedPost(post) {
  return SEED_POST_IDS.indexOf(Number(post.id)) !== -1;
}

function removeSeedPosts(posts) {
  return (posts || []).filter((post) => !isSeedPost(post));
}

function loadFishpondState() {
  const saved = wx.getStorageSync(STORAGE_KEY);

  if (saved && saved.posts) {
    const posts = removeSeedPosts(saved.posts);
    const cleaned = Object.assign({}, saved, { posts });

    if (posts.length !== saved.posts.length) {
      saveFishpondState(cleaned);
    }

    return cleaned;
  }

  return {
    posts: []
  };
}

function saveFishpondState(state) {
  wx.setStorageSync(STORAGE_KEY, state);
  return state;
}

function listPosts(channel) {
  const state = loadFishpondState();
  const posts = (state.posts || []).filter((post) => !post.reported);
  const filtered = channel && channel !== "all"
    ? posts.filter((post) => post.channel === channel)
    : posts;

  return filtered.map(decoratePost);
}

function getChannelSummary(channelId) {
  const state = loadFishpondState();
  const channel = getChannel(channelId);
  const posts = channel.id === "all"
    ? (state.posts || []).filter((post) => !post.reported)
    : (state.posts || []).filter((post) => post.channel === channel.id && !post.reported);
  const comments = posts.reduce((sum, post) => sum + (post.comments || []).length, 0);

  return Object.assign({}, channel, {
    postCount: posts.length,
    commentCount: comments,
    hotTags: getHotTags(posts),
    latestPosts: posts.slice(0, 3).map(decoratePost)
  });
}

function listChannelSummaries() {
  return CHANNELS.filter((channel) => channel.id !== "all").map((channel) => {
    return getChannelSummary(channel.id);
  });
}

function getFishpondHighlights() {
  const state = loadFishpondState();
  const posts = (state.posts || []).filter((post) => !post.reported);

  return {
    hotTags: getHotTags(posts),
    featuredPosts: getFeaturedPosts(posts)
  };
}

function getPost(postId) {
  const state = loadFishpondState();
  const targetId = Number(postId);
  const post = (state.posts || []).find((item) => Number(item.id) === targetId && !item.reported);

  return post ? decoratePost(post) : null;
}

function getMyPosts() {
  const state = loadFishpondState();

  return (state.posts || [])
    .filter((post) => post.author === "我" && !post.reported)
    .map(decoratePost);
}

function getPostsByAuthor(author) {
  const state = loadFishpondState();
  const targetAuthor = String(author || "我");

  return (state.posts || [])
    .filter((post) => post.author === targetAuthor && !post.reported)
    .map(decoratePost);
}

function getMyFavorites() {
  const state = loadFishpondState();

  return (state.posts || [])
    .filter((post) => post.favorited && !post.reported)
    .map(decoratePost);
}

function getMyComments() {
  const state = loadFishpondState();
  const items = [];

  (state.posts || []).forEach((post) => {
    if (post.reported) return;

    (post.comments || []).forEach((comment) => {
      if (comment.author !== "我") return;

      const channel = getChannel(post.channel);
      items.push({
        id: comment.id,
        postId: post.id,
        content: comment.content,
        postTitle: post.title,
        channelTitle: channel.title
      });
    });
  });

  return items.reverse();
}

function createPost(input) {
  const state = loadFishpondState();
  const content = String(input.content || "").trim().slice(0, 200);
  const autoTitle = content.split(/\n/)[0].slice(0, 24) || "今天的上班小动态";
  const tags = String(input.tagInput || "")
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4);
  const post = {
    id: Date.now(),
    channel: input.channel || "cup",
    title: String(input.title || "").trim().slice(0, 24) || autoTitle,
    content,
    tags,
    images: (input.images || []).slice(0, 6),
    mood: input.mood || "还行",
    author: "我",
    createdAt: "刚刚",
    likeCount: 0,
    favoriteCount: 0,
    sameCount: 0,
    liked: false,
    favorited: false,
    comments: []
  };

  state.posts = [post].concat(state.posts || []);
  saveFishpondState(state);

  return post;
}

function deletePost(postId) {
  const state = loadFishpondState();
  const targetId = Number(postId);
  const beforeCount = (state.posts || []).length;

  state.posts = (state.posts || []).filter((post) => {
    return !(Number(post.id) === targetId && post.author === "我");
  });

  saveFishpondState(state);

  return state.posts.length < beforeCount ? "success" : "missing";
}

function togglePostReaction(postId, type) {
  const state = loadFishpondState();
  const targetId = Number(postId);

  state.posts = (state.posts || []).map((post) => {
    if (Number(post.id) !== targetId) return post;

    if (type === "like") {
      const liked = !post.liked;
      return Object.assign({}, post, {
        liked,
        likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1))
      });
    }

    if (type === "favorite") {
      const favorited = !post.favorited;
      return Object.assign({}, post, {
        favorited,
        favoriteCount: Math.max(0, post.favoriteCount + (favorited ? 1 : -1))
      });
    }

    if (type === "same") {
      return Object.assign({}, post, {
        sameCount: post.sameCount + 1
      });
    }

    return post;
  });

  return saveFishpondState(state);
}

function addComment(postId, content) {
  const text = String(content || "").trim().slice(0, 80);
  if (!text) return null;

  const state = loadFishpondState();
  const targetId = Number(postId);
  let comment = null;

  state.posts = (state.posts || []).map((post) => {
    if (Number(post.id) !== targetId) return post;

    comment = {
      id: Date.now(),
      author: "我",
      content: text
    };

    return Object.assign({}, post, {
      comments: (post.comments || []).concat(comment)
    });
  });

  saveFishpondState(state);

  return comment;
}

function reportPost(postId) {
  const state = loadFishpondState();
  const targetId = Number(postId);
  let result = "missing";

  state.posts = (state.posts || []).map((post) => {
    if (Number(post.id) !== targetId) return post;

    result = "success";
    return Object.assign({}, post, {
      reported: true
    });
  });

  saveFishpondState(state);

  return result;
}

module.exports = {
  CHANNELS,
  addComment,
  createPost,
  deletePost,
  getChannel,
  getChannelSummary,
  getFishpondHighlights,
  getPost,
  getMyComments,
  getMyFavorites,
  getMyPosts,
  getPostsByAuthor,
  listChannelSummaries,
  listPosts,
  loadFishpondState,
  reportPost,
  togglePostReaction
};
