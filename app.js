App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: this.globalData.cloudEnvId || undefined,
        traceUser: true
      });
    }
  },

  globalData: {
    appName: "摸鱼搭子",
    cloudEnvId: "cloud1-d1gxjo88lf80e1ace",
    apiBaseUrl: ""
  }
});
