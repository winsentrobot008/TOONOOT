export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: '请输入内容' });
    }

    return res.status(200).json({
      success: true,
      message: '✅ Vercel 接口运行正常',
      input: text
    });
  } catch (error) {
    return res.status(500).json({ error: '服务器错误', details: error.message });
  }
}
