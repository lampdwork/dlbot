require('dotenv').config()

const dbName = process.env.DB_NAME
const collectionName = process.env.COLLECTION_NAME
const limit = process.env.LIMIT_DATA

const chatGPTResponse = async (message, userId, client) => {
  const { ChatGPTAPI } = await import('chatgpt')
  const database = client.db(dbName)
  const collection = database.collection(collectionName)

  const chatHistoryResults = await collection
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .sort({ createdAt: 1 })
    .toArray()

  const isEmptyChatHistory = !(chatHistoryResults?.length > 0)

  if (isEmptyChatHistory) {
    const firstMess = {
      userId,
      role: 'assistant',
      content:
        'Tôi là DLBot được tạo ra bởi Đăng Lâm và được tích hợp ChatGPT để trả lời các câu hỏi của bạn',
      createdAt: new Date()
    }

    chatHistoryResults.push(firstMess)

    collection.insertOne(firstMess)
  }

  try {
    const api = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY
    })

    console.log(chatHistoryResults, 'chatHistoryResults')

    const res = await api.sendMessage(
      `Hãy trả lời tin nhắn của tôi dựa vào kiến thức của bạn hoặc tham khảo thêm thông tin từ lịch sử đoạn hội thoại của tôi và bạn. 
      Đây là lịch sử đoạn hội thoại của tôi và bạn. bạn có role là assistant, còn tôi có role là user, Đoạn hội thoại: ${JSON.stringify(
        chatHistoryResults
      )}.
      Tin nhắn của tôi: ${message}`
    )

    const userMessage = {
      userId,
      role: 'user',
      content: message,
      createdAt: new Date()
    }

    const assistantMessage = {
      userId,
      role: 'assistant',
      content: res.text,
      createdAt: new Date()
    }

    collection.insertMany([userMessage, assistantMessage])

    return res.text
  } catch (err) {
    console.log(err)
    return 'Sorry, I am having trouble communicating with my brain right now. Please try again later.'
  }
}

module.exports = chatGPTResponse
