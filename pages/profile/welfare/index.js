const { buildGameSummary, loadGameState } = require("../../../utils/gamification");

const RULES = [
  {
    title: "不是升级提现",
    desc: "积分用于宠物成长和福利池参与资格，不承诺升级后直接获得现金。"
  },
  {
    title: "达到等级后参与",
    desc: "达到指定等级后，可参与奶茶券、运动券、会员券或小额红包等活动。"
  },
  {
    title: "奖励有预算和名额",
    desc: "每期福利会展示奖品、名额、预算上限、发放时间和领取条件。"
  },
  {
    title: "异常行为会拦截",
    desc: "重复刷评论、刷发布、虚假约局、批量账号等行为不会计入长期贡献。"
  }
];

const REWARDS = [
  { level: 5, title: "奶茶回血券", desc: "下班愿望守护者可参与，适合轻量首期福利。" },
  { level: 6, title: "运动搭子券", desc: "鱼塘活跃星可参与，和下班约局自然联动。" },
  { level: 7, title: "会员体验券", desc: "打工生存专家可参与，用于提升长期留存。" },
  { level: 8, title: "小额红包池", desc: "福利合伙人可参与，必须设置固定预算和名额。" }
];

const RECORDS = [
  { id: 1, title: "奶茶回血券内测", status: "规则公示中", desc: "预算 20 份，达到 Lv.5 后可参与抽取。" },
  { id: 2, title: "运动搭子券", status: "筹备中", desc: "和下班约局联动，优先给真实报名和到场用户。" },
  { id: 3, title: "异常加分复核", status: "人工处理", desc: "重复刷发布、刷评论会进入复核，不直接计入资格。" }
];

Page({
  data: {
    game: buildGameSummary(loadGameState()),
    rules: RULES,
    rewards: [],
    records: RECORDS,
    appealInput: ""
  },

  onShow() {
    const game = buildGameSummary(loadGameState());

    this.setData({
      game,
      rewards: REWARDS.map((reward) => {
        const unlocked = game.level.level >= reward.level;

        return Object.assign({}, reward, {
          className: unlocked ? "reward-row unlocked" : "reward-row locked",
          statusText: unlocked ? "可参与" : `Lv.${reward.level} 开放`
        });
      })
    });
  },

  handleAppealInput(event) {
    this.setData({
      appealInput: event.detail.value
    });
  },

  submitAppeal() {
    const content = String(this.data.appealInput || "").trim();

    if (!content) {
      wx.showToast({
        title: "先写一下问题",
        icon: "none",
        duration: 1000
      });
      return;
    }

    this.setData({
      appealInput: ""
    });
    wx.showModal({
      title: "申诉已记录",
      content: "第一版先做本地记录和流程入口，后续接入后台后会同步处理进度。",
      confirmText: "知道了",
      showCancel: false
    });
  }
});
