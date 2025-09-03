# 使用说明

## 快速开始

### 1. 获取 API 密钥

#### RapidAPI 密钥
1. 访问 [RapidAPI](https://rapidapi.com/)
2. 注册并登录账号
3. 搜索 "YouTube v2" 或访问 [YouTube v2 API](https://rapidapi.com/Glavier/api/youtube-v2)
4. 点击 "Subscribe to Test" 订阅免费计划
5. 在 "Code Snippets" 页面找到你的 API 密钥

#### DeepSeek API 密钥
1. 访问 [DeepSeek 官网](https://www.deepseek.com/)
2. 注册账号并登录
3. 在控制台中创建 API 密钥

### 2. 配置环境变量

复制示例文件并创建 `.env.local` 文件：

```bash
cp env.example .env.local
```

编辑 `.env.local` 文件，替换为你的实际 API 密钥：

```env
RAPIDAPI_KEY=你的实际RapidAPI密钥
DEEPSEEK_API_KEY=你的实际DeepSeek密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

**注意**: 不要使用示例中的占位符值，必须替换为真实的 API 密钥。

### 3. 安装依赖并运行

```bash
npm install
npm run dev
```

### 4. 测试 API 集成

测试 API 集成：

```bash
# 使用 HTTP 模块测试
node test-rapidapi.js

# 如果 HTTP 模块有问题，使用 curl 测试
node test-curl.js
```

## 使用流程

1. **输入视频链接**: 在页面中输入 YouTube 视频链接
2. **开始分析**: 点击"开始分析"按钮
3. **等待处理**: 系统会自动获取评论并进行情绪分析
4. **查看结果**: 查看情绪评分和详细统计

## 支持的视频链接格式

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

## 注意事项

### RapidAPI 限制
- 免费计划通常有请求次数限制
- 如果遇到 403 错误，请确保已订阅服务
- 建议使用热门视频以获得更多评论

### DeepSeek API 限制
- 有 token 使用限制
- 建议合并评论文本以减少 API 调用次数
- 确保账户有足够余额

### 性能优化
- 系统会自动限制最多 100 条评论
- 评论文本会自动清理 HTML 标签
- 使用原生 HTTP 模块提高性能

## 故障排除

### 常见错误及解决方案

1. **"RapidAPI 密钥无效"**
   - 检查密钥是否正确复制
   - 确认已订阅 YouTube v2 服务

2. **"未找到评论"**
   - 确认视频存在且允许评论
   - 尝试使用其他热门视频

3. **"情绪分析失败"**
   - 检查 DeepSeek API 密钥
   - 确认账户余额充足

4. **"请求超时"**
   - 检查网络连接
   - 稍后重试

## 技术细节

### Fetch API 实现
- 使用 Node.js 18+ 内置的 `fetch` API
- 更好的错误处理和超时控制
- 减少依赖包大小
- 支持 AbortController 取消请求

### 评论处理
- 自动清理 HTML 标签和实体
- 支持多种排序方式
- 智能文本长度限制

### 情绪分析
- 批量处理评论文本
- 智能 JSON 解析
- 数据归一化处理
