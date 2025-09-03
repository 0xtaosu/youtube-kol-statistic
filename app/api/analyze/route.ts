import { NextRequest, NextResponse } from 'next/server'

// 确保环境变量正确加载
if (typeof window === 'undefined') {
    require('dotenv').config({ path: '.env.local' })
}

interface YouTubeComment {
    textDisplay: string
    authorDisplayName: string
    likeCount: number
    publishedAt: string
}

interface SentimentResult {
    positive: number
    neutral: number
    negative: number
}



interface CommentSummary {
    mainTopics: string[]
    overallSentiment: string
    keyInsights: string[]
    commonPhrases: string[]
}

// Fetch 请求辅助函数
async function makeFetchRequest(url: string, options: RequestInit): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...options.headers,
            }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('请求超时')
        }
        throw error
    }
}

export async function POST(request: NextRequest) {
    const startTime = Date.now()
    console.log('🚀 开始处理情绪分析请求')

    try {
        const { videoId } = await request.json()
        console.log('📹 视频ID:', videoId)

        if (!videoId) {
            console.log('❌ 缺少视频ID')
            return NextResponse.json(
                { error: '缺少视频ID' },
                { status: 400 }
            )
        }

        // 获取 YouTube 评论
        console.log('🔍 开始获取 YouTube 评论...')
        const comments = await fetchYouTubeComments(videoId)
        console.log(`✅ 成功获取 ${comments.length} 条评论`)

        if (comments.length === 0) {
            console.log('❌ 未找到评论')
            return NextResponse.json(
                { error: '未找到评论或视频不存在' },
                { status: 404 }
            )
        }

        // 进行情绪分析
        console.log('🧠 开始进行情绪分析...')
        const sentimentResult = await analyzeSentiment(comments)
        console.log('📊 情绪分析结果:', sentimentResult)

        // 生成评论总结
        console.log('📝 开始生成评论总结...')
        const commentSummary = await generateCommentSummary(comments, sentimentResult)
        console.log('✅ 评论总结生成完成')

        // 计算评分
        const score = calculateScore(sentimentResult)
        console.log('🎯 计算得出评分:', score)

        // 计算统计数据
        const totalComments = comments.length
        const positiveCount = Math.round(sentimentResult.positive * totalComments)
        const neutralCount = Math.round(sentimentResult.neutral * totalComments)
        const negativeCount = totalComments - positiveCount - neutralCount

        const result = {
            score,
            totalComments,
            positiveCount,
            neutralCount,
            negativeCount,
            positivePercentage: (positiveCount / totalComments) * 100,
            neutralPercentage: (neutralCount / totalComments) * 100,
            negativePercentage: (negativeCount / totalComments) * 100,
            summary: commentSummary,
        }

        const processingTime = Date.now() - startTime
        console.log(`🎉 分析完成，耗时: ${processingTime}ms`)
        console.log('📈 最终结果:', result)

        return NextResponse.json(result)

    } catch (error) {
        const processingTime = Date.now() - startTime
        console.error(`❌ 分析失败，耗时: ${processingTime}ms`)
        console.error('错误详情:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : '分析失败' },
            { status: 500 }
        )
    }
}

async function fetchYouTubeComments(videoId: string): Promise<YouTubeComment[]> {
    console.log('🔑 检查 RapidAPI 密钥配置...')
    const apiKey = process.env.RAPIDAPI_KEY

    if (!apiKey) {
        console.log('❌ RapidAPI 密钥未配置')
        throw new Error('RapidAPI 密钥未配置')
    }
    console.log('✅ RapidAPI 密钥已配置')

    const headers = {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'youtube-v2.p.rapidapi.com'
    }

    try {
        // 首先验证视频是否存在
        console.log('📺 验证视频是否存在...')
        const videoUrl = `https://youtube-v2.p.rapidapi.com/video/details?video_id=${videoId}`
        console.log('🌐 请求视频详情 URL:', videoUrl)

        const videoResponse = await makeFetchRequest(videoUrl, {
            method: 'GET',
            headers
        })

        if (!videoResponse) {
            console.log('❌ 视频不存在或无法访问')
            throw new Error('视频不存在或无法访问')
        }
        console.log('✅ 视频验证成功，标题:', videoResponse.title || '未知')

        // 获取评论 - 尝试多种排序方式
        console.log('💬 开始获取评论数据...')
        let commentsResponse
        const sortOptions = ['top_comments', 'newest_first', 'oldest_first']

        for (const sortBy of sortOptions) {
            try {
                console.log(`🔄 尝试排序方式: ${sortBy}`)
                const commentsUrl = `https://youtube-v2.p.rapidapi.com/video/comments?video_id=${videoId}&sort_by=${sortBy}&type=video&next=0`
                console.log('🌐 请求评论 URL:', commentsUrl)

                commentsResponse = await makeFetchRequest(commentsUrl, {
                    method: 'GET',
                    headers
                })

                if (commentsResponse?.comments && commentsResponse.comments.length > 0) {
                    console.log(`✅ 使用排序方式 ${sortBy} 成功获取 ${commentsResponse.comments.length} 条评论`)
                    break
                } else {
                    console.log(`⚠️ 排序方式 ${sortBy} 返回空评论`)
                }
            } catch (sortError) {
                console.warn(`❌ 排序方式 ${sortBy} 失败:`, sortError)
                continue
            }
        }

        if (!commentsResponse || !commentsResponse.comments) {
            console.log('❌ 所有排序方式都失败，无法获取评论数据')
            throw new Error('无法获取评论数据')
        }

        // 处理评论数据
        console.log('🧹 开始处理评论数据...')
        const comments: YouTubeComment[] = []
        const rawComments = commentsResponse.comments

        // 限制最多100条评论
        const limitedComments = rawComments.slice(0, 100)
        console.log(`📊 原始评论数: ${rawComments.length}, 限制后: ${limitedComments.length}`)

        for (const comment of limitedComments) {
            if (comment.text && comment.text.trim()) {
                // 清理评论文本，移除HTML标签
                const cleanText = comment.text
                    .replace(/<[^>]*>/g, '') // 移除HTML标签
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .trim()

                if (cleanText.length > 0) {
                    comments.push({
                        textDisplay: cleanText,
                        authorDisplayName: comment.author?.name || '匿名用户',
                        likeCount: comment.likes_count || 0,
                        publishedAt: comment.created_at || new Date().toISOString(),
                    })
                }
            }
        }

        console.log(`✅ 成功处理 ${comments.length} 条有效评论`)

        if (comments.length === 0) {
            console.log('❌ 未找到有效的评论内容')
            throw new Error('未找到有效的评论内容')
        }

        // 打印前几条评论作为示例
        console.log('📝 评论示例:')
        comments.slice(0, 3).forEach((comment, index) => {
            console.log(`  ${index + 1}. ${comment.textDisplay.substring(0, 50)}...`)
        })

        return comments
    } catch (error) {
        console.error('❌ RapidAPI 错误详情:', error)
        throw new Error('获取 YouTube 评论失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
}

async function analyzeSentiment(comments: YouTubeComment[]): Promise<SentimentResult> {
    console.log('🔑 检查 DeepSeek API 密钥配置...')
    const apiKey = process.env.DEEPSEEK_API_KEY
    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'

    if (!apiKey) {
        console.log('❌ DeepSeek API 密钥未配置')
        throw new Error('DeepSeek API 密钥未配置')
    }
    console.log('✅ DeepSeek API 密钥已配置')

    // 合并所有评论文本，避免逐条请求
    console.log('📝 合并评论文本...')
    const allComments = comments.map(comment => comment.textDisplay).join('\n')
    console.log(`📊 合并后文本长度: ${allComments.length} 字符`)

    // 限制文本长度，避免超出 API 限制
    const maxLength = 8000
    const textToAnalyze = allComments.length > maxLength
        ? allComments.substring(0, maxLength)
        : allComments

    if (allComments.length > maxLength) {
        console.log(`⚠️ 文本过长，截取前 ${maxLength} 字符进行分析`)
    }

    try {
        console.log('🤖 构建 DeepSeek API 请求...')
        const requestData = {
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: `你是一个专业的情绪分析专家。请分析以下 YouTube 评论的整体情绪倾向。

请按照以下格式返回结果，只返回 JSON 格式，不要包含其他文字：
{
  "positive": 0.0-1.0,
  "neutral": 0.0-1.0, 
  "negative": 0.0-1.0
}

其中 positive、neutral、negative 分别代表正面、中性、负面情绪的比例，三个数值之和应该等于 1.0。`
                },
                {
                    role: 'user',
                    content: `请分析以下评论的情绪倾向：\n\n${textToAnalyze}`
                }
            ],
            temperature: 0.3,
            max_tokens: 200,
        }

        console.log('🌐 发送请求到 DeepSeek API...')
        const response = await makeFetchRequest(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })

        console.log('✅ DeepSeek API 响应成功')
        const content = response.choices[0].message.content.trim()
        console.log('📄 AI 响应内容:', content)

        // 尝试解析 JSON 响应
        console.log('🔍 解析 AI 响应...')
        let sentimentData: SentimentResult
        try {
            sentimentData = JSON.parse(content)
            console.log('✅ JSON 解析成功')
        } catch (parseError) {
            console.log('⚠️ 直接 JSON 解析失败，尝试提取 JSON 部分...')
            // 如果解析失败，尝试提取 JSON 部分
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                sentimentData = JSON.parse(jsonMatch[0])
                console.log('✅ 提取 JSON 部分解析成功')
            } else {
                console.log('❌ 无法找到有效的 JSON 格式')
                throw new Error('无法解析情绪分析结果')
            }
        }

        console.log('📊 原始情绪分析结果:', sentimentData)

        // 验证数据格式
        if (typeof sentimentData.positive !== 'number' ||
            typeof sentimentData.neutral !== 'number' ||
            typeof sentimentData.negative !== 'number') {
            console.log('❌ 情绪分析结果格式错误')
            throw new Error('情绪分析结果格式错误')
        }

        // 归一化，确保三个值之和为 1
        const total = sentimentData.positive + sentimentData.neutral + sentimentData.negative
        console.log(`📈 原始数值总和: ${total}`)

        if (total === 0) {
            console.log('⚠️ 数值总和为 0，使用默认值')
            sentimentData = { positive: 0.33, neutral: 0.34, negative: 0.33 }
        } else {
            console.log('🔄 归一化处理...')
            sentimentData.positive /= total
            sentimentData.neutral /= total
            sentimentData.negative /= total
        }

        console.log('✅ 最终情绪分析结果:', sentimentData)
        return sentimentData

    } catch (error) {
        console.error('❌ DeepSeek API 错误:', error)
        throw new Error('情绪分析失败: ' + (error instanceof Error ? error.message : '未知错误'))
    }
}

function calculateScore(sentiment: SentimentResult): number {
    console.log('🧮 开始计算情绪评分...')
    console.log('📊 输入情绪数据:', sentiment)

    // 使用加权算法计算 0-100 分的情绪评分
    // 正面情绪权重最高，中性次之，负面最低
    const positiveScore = sentiment.positive * 100
    const neutralScore = sentiment.neutral * 50
    const negativeScore = sentiment.negative * 0

    console.log(`📈 各项得分: 正面=${positiveScore.toFixed(2)}, 中性=${neutralScore.toFixed(2)}, 负面=${negativeScore.toFixed(2)}`)

    const rawScore = positiveScore + neutralScore + negativeScore
    const score = Math.round(rawScore)
    const finalScore = Math.max(0, Math.min(100, score))

    console.log(`🎯 原始得分: ${rawScore.toFixed(2)}, 四舍五入: ${score}, 最终得分: ${finalScore}`)

    return finalScore
}



async function generateCommentSummary(comments: YouTubeComment[], sentimentResult: SentimentResult): Promise<CommentSummary> {
    console.log('🤖 开始使用 AI 生成评论总结...')

    const apiKey = process.env.DEEPSEEK_API_KEY
    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com'

    if (!apiKey) {
        console.log('❌ DeepSeek API 密钥未配置，使用基础总结')
        return generateBasicSummary(comments, sentimentResult)
    }

    try {
        // 合并所有评论文本
        const allComments = comments.map(comment => comment.textDisplay).join('\n')
        const maxLength = 6000 // 限制文本长度
        const textToAnalyze = allComments.length > maxLength
            ? allComments.substring(0, maxLength)
            : allComments

        console.log(`📊 分析文本长度: ${textToAnalyze.length} 字符`)

        const requestData = {
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: `你是一个专业的评论分析师。请分析以下 YouTube 评论，生成一个结构化的总结。

请按照以下 JSON 格式返回结果，不要包含其他文字：
{
  "mainTopics": ["主题1", "主题2", "主题3"],
  "overallSentiment": "整体情绪描述（如：积极正面、中性、消极负面）",
  "keyInsights": ["洞察1", "洞察2", "洞察3"],
  "commonPhrases": ["常见表达1", "常见表达2", "常见表达3"]
}

要求：
- mainTopics: 提取3-5个主要讨论话题
- overallSentiment: 用一句话描述整体情绪倾向
- keyInsights: 提供3-5个关键洞察或发现
- commonPhrases: 列出3-5个评论中常见的表达或词汇`
                },
                {
                    role: 'user',
                    content: `请分析以下评论：\n\n${textToAnalyze}`
                }
            ],
            temperature: 0.3,
            max_tokens: 500,
        }

        console.log('🌐 发送请求到 DeepSeek API 生成总结...')
        const response = await makeFetchRequest(`${baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        })

        console.log('✅ DeepSeek API 响应成功')
        const content = response.choices[0].message.content.trim()
        console.log('📄 AI 总结响应:', content)

        // 尝试解析 JSON 响应
        let summaryData: CommentSummary
        try {
            summaryData = JSON.parse(content)
            console.log('✅ AI 总结 JSON 解析成功')
        } catch (parseError) {
            console.log('⚠️ AI 总结 JSON 解析失败，使用基础总结')
            return generateBasicSummary(comments, sentimentResult)
        }

        // 验证数据格式
        if (!summaryData.mainTopics || !summaryData.overallSentiment || !summaryData.keyInsights || !summaryData.commonPhrases) {
            console.log('❌ AI 总结格式不完整，使用基础总结')
            return generateBasicSummary(comments, sentimentResult)
        }

        console.log('✅ AI 评论总结生成完成')
        return summaryData

    } catch (error) {
        console.error('❌ AI 总结生成失败:', error)
        console.log('🔄 回退到基础总结')
        return generateBasicSummary(comments, sentimentResult)
    }
}

function generateBasicSummary(comments: YouTubeComment[], sentimentResult: SentimentResult): CommentSummary {
    console.log('📝 生成基础评论总结...')

    // 合并所有评论文本
    const allText = comments.map(comment => comment.textDisplay).join(' ')

    // 简单的主题提取（基于高频词）
    const words = allText
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fff]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1)

    const wordCount: { [key: string]: number } = {}
    words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1
    })

    // 获取高频词作为主题
    const mainTopics = Object.entries(wordCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word)

    // 根据情绪分析结果确定整体情绪
    let overallSentiment = '中性'
    if (sentimentResult.positive > 0.6) {
        overallSentiment = '积极正面'
    } else if (sentimentResult.negative > 0.6) {
        overallSentiment = '消极负面'
    } else if (sentimentResult.positive > sentimentResult.negative) {
        overallSentiment = '偏向积极'
    } else if (sentimentResult.negative > sentimentResult.positive) {
        overallSentiment = '偏向消极'
    }

    // 基础洞察
    const keyInsights = [
        `共分析了 ${comments.length} 条评论`,
        `整体情绪倾向：${overallSentiment}`,
        `正面评论占比：${(sentimentResult.positive * 100).toFixed(1)}%`,
        `评论内容丰富，涉及多个话题`
    ]

    // 常见表达（基于词频）
    const commonPhrases = mainTopics.slice(0, 5)

    const summary: CommentSummary = {
        mainTopics,
        overallSentiment,
        keyInsights,
        commonPhrases
    }

    console.log('✅ 基础评论总结生成完成')
    return summary
}
