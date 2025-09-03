// 测试 RapidAPI YouTube 集成的简单脚本
const https = require('https');
require('dotenv').config({ path: '.env.local' });

// HTTP 请求辅助函数
function makeHttpRequest(options) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            const chunks = [];

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                const body = Buffer.concat(chunks).toString();
                try {
                    const data = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data.message || body}`));
                    }
                } catch (parseError) {
                    reject(new Error(`解析响应失败: ${body}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('请求超时'));
        });

        req.end();
    });
}

async function testRapidAPI() {
    const apiKey = process.env.RAPIDAPI_KEY || 'your_rapidapi_key_here';
    const videoId = 'dQw4w9WgXcQ'; // Rick Roll 视频ID作为测试

    try {
        console.log('🔍 测试视频详情获取...');
        const videoOptions = {
            method: 'GET',
            hostname: 'youtube-v2.p.rapidapi.com',
            port: null,
            path: `/video/details?video_id=${videoId}`,
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'youtube-v2.p.rapidapi.com'
            }
        };

        const videoResponse = await makeHttpRequest(videoOptions);

        console.log('✅ 视频详情获取成功');
        console.log('视频标题:', videoResponse?.title || '未知');

        console.log('\n🔍 测试评论获取...');
        const commentsOptions = {
            method: 'GET',
            hostname: 'youtube-v2.p.rapidapi.com',
            port: null,
            path: `/video/comments?video_id=${videoId}&sort_by=top_comments&type=video&next=0`,
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': 'youtube-v2.p.rapidapi.com'
            }
        };

        const commentsResponse = await makeHttpRequest(commentsOptions);

        console.log('✅ 评论获取成功');
        console.log('评论数量:', commentsResponse?.comments?.length || 0);

        if (commentsResponse?.comments?.length > 0) {
            console.log('\n📝 前3条评论预览:');
            commentsResponse.comments.slice(0, 3).forEach((comment, index) => {
                console.log(`${index + 1}. ${comment.text?.substring(0, 100)}...`);
            });
        }

        console.log('\n🎉 RapidAPI 集成测试完成！');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);

        if (error.message.includes('HTTP 403')) {
            console.error('💡 提示: 请确保已订阅 RapidAPI 的 YouTube v2 服务');
            console.error('   访问: https://rapidapi.com/Glavier/api/youtube-v2');
        } else if (error.message.includes('HTTP 401')) {
            console.error('💡 提示: 请检查 RapidAPI 密钥是否正确');
        } else if (error.message.includes('请求超时')) {
            console.error('💡 提示: 请检查网络连接');
        }
    }
}

// 运行测试
testRapidAPI();
