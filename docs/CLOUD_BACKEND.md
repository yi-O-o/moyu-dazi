# 微信云开发后端说明

## 1. 云开发结构

第一版后端使用微信云开发，不需要自建服务器。

当前新增：

- `cloudfunctions/api`：统一云函数入口
- `utils/cloudApi.js`：小程序端云函数调用封装
- `app.js`：初始化 `wx.cloud`
- `project.config.json`：配置 `cloudfunctionRoot`

## 2. 需要创建的云数据库集合

在微信开发者工具的云开发控制台创建这些集合：

- `users`：用户资料、积分、等级状态
- `fish_posts`：鱼塘动态、图片、评论、点赞、收藏、举报
- `meetups`：下班约局、报名、取消报名、评论
- `point_events`：积分流水和每日上限
- `welfare_appeals`：福利池申诉

## 3. 云函数 action

统一调用云函数 `api`，通过 `action` 分发。

用户：

- `user.get`
- `user.upsert`
- `points.summary`

鱼塘：

- `fish.list`
- `fish.get`
- `fish.create`
- `fish.delete`
- `fish.report`
- `fish.react`
- `fish.comment`
- `fish.mine`

下班约局：

- `meetup.list`
- `meetup.get`
- `meetup.create`
- `meetup.join`
- `meetup.cancel`
- `meetup.comment`
- `meetup.mine`

福利池：

- `welfare.appeal`

## 4. 权限和规则

云函数里已经做了第一版必要校验：

- 使用微信 openid 识别用户
- 只能删除自己的鱼塘动态
- 举报会隐藏动态
- 约局发起人不能取消自己的报名
- 报名满员后不能继续报名
- 积分按行为设置每日上限
- 福利申诉记录到 `welfare_appeals`

## 5. 部署步骤

1. 在微信开发者工具里开通云开发。
2. 复制云环境 ID。
3. 在 `app.js` 中填写：

```js
cloudEnvId: "你的云环境 ID"
```

4. 右键 `cloudfunctions/api`，选择“上传并部署：云端安装依赖”。
5. 在云开发控制台创建上面的 5 个集合。
6. 先用开发者工具调用 `user.upsert` 或进入页面触发云函数，确认云函数能拿到 openid。

## 6. 后续接入顺序

当前已接入云端优先、本地兜底的页面：

- 鱼塘首页：列表、发布、评论、点赞、收藏、同款、举报
- 鱼塘频道页：频道动态列表
- 鱼塘详情页：详情、评论、点赞、收藏、同款、删除、举报
- 下班页：列表、发布、报名、取消报名、评论
- 下班详情页：详情、报名、取消报名、评论
- 我的页：云端积分等级、我的鱼塘动态、我的约局

本地缓存仍作为兜底使用。云函数失败时页面不会白屏，会退回本地演示数据。

后续建议按这个顺序继续完善：

1. 个人主页资料编辑和云端用户资料
2. 鱼塘图片上传后的内容安全审核
3. 下班约局内容安全审核
4. 福利池申诉云端列表和处理状态
5. 云数据库权限规则细化

这样每次替换一个模块，出问题也容易回滚。
