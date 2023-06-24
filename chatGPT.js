require('dotenv').config()

const chatGPTResponse = async (message) => {
  const { ChatGPTAPI } = await import('chatgpt')

  try {
    const api = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const res = await api.sendMessage(message)
    return res.text
  } catch (err) {
    console.log(err)
    return 'Sorry, I am having trouble communicating with my brain right now. Please try again later.'
  }
}

module.exports = chatGPTResponse
