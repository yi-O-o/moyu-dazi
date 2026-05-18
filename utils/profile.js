const STORAGE_KEY = "workBuddyUserProfile";

const DEFAULT_PROFILE = {
  nickName: "摸鱼搭子",
  avatarText: "搭",
  avatarUrl: ""
};

function getAvatarText(nickName) {
  const text = String(nickName || DEFAULT_PROFILE.nickName).trim();

  return (text.slice(0, 1) || DEFAULT_PROFILE.avatarText).slice(0, 1);
}

function normalizeProfile(profile = {}) {
  const nickName = String(profile.nickName || DEFAULT_PROFILE.nickName).trim().slice(0, 24) || DEFAULT_PROFILE.nickName;
  const avatarText = String(profile.avatarText || getAvatarText(nickName)).trim().slice(0, 1) || getAvatarText(nickName);
  const avatarUrl = String(profile.avatarUrl || "").trim();

  return {
    nickName,
    avatarText,
    avatarUrl
  };
}

function loadUserProfile() {
  try {
    return normalizeProfile(wx.getStorageSync(STORAGE_KEY) || DEFAULT_PROFILE);
  } catch (error) {
    return normalizeProfile(DEFAULT_PROFILE);
  }
}

function saveUserProfile(profile) {
  const next = normalizeProfile(Object.assign({}, loadUserProfile(), profile || {}));

  wx.setStorageSync(STORAGE_KEY, next);
  return next;
}

function getCloudProfilePayload() {
  return loadUserProfile();
}

module.exports = {
  DEFAULT_PROFILE,
  getAvatarText,
  getCloudProfilePayload,
  loadUserProfile,
  normalizeProfile,
  saveUserProfile
};
