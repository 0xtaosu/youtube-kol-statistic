// 使用 curl 命令测试 RapidAPI 的备用脚本
const { exec } = require('child_process');
const { promisify } = require('util');
require('dotenv').config({ path: '.env.local' });

const execAsync = promisify(exec);

async function testRapidAPIWithCurl() {
    const apiKey = process.env.RAPIDAPI_KEY || 'your_rapidapi_key_here';
    const videoId = 'PzPtAbgqCpI'; // Rick Roll 视频ID作为测试

    try {
        console.log('🔍 使用 curl 测试视频详情获取...');

        const videoCommand = `curl --request GET \
            --url 'https://youtube-v2.p.rapidapi.com/video/details?video_id=${videoId}' \
            --header 'x-rapidapi-host: youtube-v2.p.rapidapi.com' \
            --header 'x-rapidapi-key: ${apiKey}' \
            --silent --show-error`;

        const { stdout: videoOutput, stderr: videoError } = await execAsync(videoCommand);

        if (videoError) {
            throw new Error(`视频详情请求失败: ${videoError}`);
        }

        const videoResponse = JSON.parse(videoOutput);
        console.log('✅ 视频详情获取成功');
        console.log('视频标题:', videoResponse?.title || '未知');

        console.log('\n🔍 使用 curl 测试评论获取...');

        const commentsCommand = `curl --request GET \
            --url 'https://youtube-v2.p.rapidapi.com/video/comments?video_id=${videoId}&sort_by=top_comments&type=video&next=0' \
            --header 'x-rapidapi-host: youtube-v2.p.rapidapi.com' \
            --header 'x-rapidapi-key: ${apiKey}' \
            --silent --show-error`;

        const { stdout: commentsOutput, stderr: commentsError } = await execAsync(commentsCommand);

        if (commentsError) {
            throw new Error(`评论请求失败: ${commentsError}`);
        }

        const commentsResponse = JSON.parse(commentsOutput);
        console.log('✅ 评论获取成功');
        console.log('评论数量:', commentsResponse?.comments?.length || 0);

        if (commentsResponse?.comments?.length > 0) {
            console.log('\n📝 前3条评论预览:');
            commentsResponse.comments.slice(0, 3).forEach((comment, index) => {
                console.log(`${index + 1}. ${comment.text?.substring(0, 100)}...`);
            });
        }

        console.log('\n🎉 RapidAPI curl 测试完成！');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);

        if (error.message.includes('HTTP 403')) {
            console.error('💡 提示: 请确保已订阅 RapidAPI 的 YouTube v2 服务');
            console.error('   访问: https://rapidapi.com/Glavier/api/youtube-v2');
        } else if (error.message.includes('HTTP 401')) {
            console.error('💡 提示: 请检查 RapidAPI 密钥是否正确');
        } else if (error.message.includes('command not found')) {
            console.error('💡 提示: 系统未安装 curl 命令');
        } else if (error.message.includes('Unexpected token')) {
            console.error('💡 提示: API 返回了非 JSON 格式的响应');
        }
    }
}

// 运行测试
testRapidAPIWithCurl();
