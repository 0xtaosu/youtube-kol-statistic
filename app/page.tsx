'use client'

import { useState } from 'react'

interface CommentSummary {
    mainTopics: string[]
    overallSentiment: string
    keyInsights: string[]
    commonPhrases: string[]
}

interface AnalysisResult {
    score: number
    totalComments: number
    positiveCount: number
    neutralCount: number
    negativeCount: number
    positivePercentage: number
    neutralPercentage: number
    negativePercentage: number
    summary: CommentSummary
}

export default function Home() {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<AnalysisResult | null>(null)
    const [error, setError] = useState('')

    const extractVideoId = (url: string): string | null => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/watch\?.*v=([^&\n?#]+)/
        ]

        for (const pattern of patterns) {
            const match = url.match(pattern)
            if (match) return match[1]
        }
        return null
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!url.trim()) {
            setError('请输入 YouTube 视频链接')
            return
        }

        const videoId = extractVideoId(url)
        if (!videoId) {
            setError('无效的 YouTube 视频链接')
            return
        }

        setLoading(true)
        setError('')
        setResult(null)

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoId }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || '分析失败')
            }

            const data = await response.json()
            setResult(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : '分析过程中出现错误')
        } finally {
            setLoading(false)
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 70) return '#10b981' // green
        if (score >= 40) return '#f59e0b' // yellow
        return '#ef4444' // red
    }

    const getScoreLabel = (score: number) => {
        if (score >= 70) return '积极'
        if (score >= 40) return '中性'
        return '消极'
    }

    return (
        <div className="container">
            <h1 className="title">YouTube 评论区分析</h1>

            <div className="form-container">
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="url" className="label">
                            YouTube 视频链接
                        </label>
                        <input
                            id="url"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="input"
                            disabled={loading}
                        />
                    </div>
                    <button
                        type="submit"
                        className="button"
                        disabled={loading}
                    >
                        {loading ? '分析中...' : '开始分析'}
                    </button>
                </form>

                {error && (
                    <div className="error">
                        {error}
                    </div>
                )}
            </div>

            {loading && (
                <div className="loading">
                    <p>正在获取评论并进行情绪分析，请稍候...</p>
                </div>
            )}

            {result && (
                <div className="result-container">
                    <h2 className="result-title">分析结果</h2>

                    <div className="score-display">
                        <div
                            className="score-number"
                            style={{ color: getScoreColor(result.score) }}
                        >
                            {result.score}
                        </div>
                        <div className="score-label">
                            情绪评分 ({getScoreLabel(result.score)})
                        </div>
                    </div>

                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-number" style={{ color: '#10b981' }}>
                                {result.positiveCount}
                            </div>
                            <div className="stat-label">
                                正面评论 ({result.positivePercentage.toFixed(1)}%)
                            </div>
                        </div>

                        <div className="stat-item">
                            <div className="stat-number" style={{ color: '#6b7280' }}>
                                {result.neutralCount}
                            </div>
                            <div className="stat-label">
                                中性评论 ({result.neutralPercentage.toFixed(1)}%)
                            </div>
                        </div>

                        <div className="stat-item">
                            <div className="stat-number" style={{ color: '#ef4444' }}>
                                {result.negativeCount}
                            </div>
                            <div className="stat-label">
                                负面评论 ({result.negativePercentage.toFixed(1)}%)
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                        共分析了 {result.totalComments} 条评论
                    </div>
                </div>
            )}

            {result && result.summary && (
                <div className="result-container">
                    <h2 className="result-title">评论总结</h2>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                            整体情绪
                        </h3>
                        <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>
                            {result.summary.overallSentiment}
                        </p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                            主要话题
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {result.summary.mainTopics.map((topic, index) => (
                                <span
                                    key={index}
                                    style={{
                                        backgroundColor: '#e5e7eb',
                                        color: '#374151',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    {topic}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                            关键洞察
                        </h3>
                        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#6b7280' }}>
                            {result.summary.keyInsights.map((insight, index) => (
                                <li key={index} style={{ marginBottom: '0.5rem' }}>
                                    {insight}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                            常见表达
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {result.summary.commonPhrases.map((phrase, index) => (
                                <span
                                    key={index}
                                    style={{
                                        backgroundColor: '#dbeafe',
                                        color: '#1e40af',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    "{phrase}"
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
