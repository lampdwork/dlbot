require('dotenv').config()

let chatHistory = {}

const chatGPTResponse = async (message, userId) => {
  const { ChatGPTAPI } = await import('chatgpt')

  if (!(chatHistory[userId]?.length > 0)) {
    chatHistory[userId] = [
      {
        role: 'assistant',
        content:
          'Tôi là DLBot được tạo ra bởi Đăng Lâm và được tích hợp ChatGPT để trả lời các câu hỏi của bạn'
      }
    ]
  }

  try {
    const api = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const res = await api.sendMessage(
      `Hãy trả lời tin nhắn của tôi dựa vào kiến thức của bạn hoặc tham khảo thêm thông tin từ lịch sử đoạn hội thoại của tôi và bạn. 
      Đây là lịch sử đoạn hội thoại của tôi và bạn. bạn có role là assistant, còn tôi có role là "user", Đoạn hội thoại: ${JSON.stringify(
        chatHistory[userId]
      )}.
      Tin nhắn của tôi: ${message}`
    )

    chatHistory[userId].push({
      role: 'user',
      content: message
    })

    chatHistory[userId].push({
      role: 'assistant',
      content: res.text
    })

    console.log(chatHistory, 'chatHistory')
    return res.text
  } catch (err) {
    console.log(err)
    return 'Sorry, I am having trouble communicating with my brain right now. Please try again later.'
  }
}

module.exports = chatGPTResponse
