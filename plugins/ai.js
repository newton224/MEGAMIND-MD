const axios = require('axios');
const settings = require('../settings');

async function askGemini(prompt) {
  const apiKey = settings.apiKeys.gemini;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    { contents: [{ parts: [{ text: prompt }] }] },
    { timeout: 30000 }
  );
  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
}

async function askOpenAI(prompt, model = 'gpt-3.5-turbo') {
  const apiKey = settings.apiKeys.openai;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in .env');
  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model, messages: [{ role: 'user', content: prompt }], max_tokens: 800 },
    { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 }
  );
  return res.data?.choices?.[0]?.message?.content || 'No response';
}

async function askFreeAI(prompt) {
  // Use a free AI API as fallback
  const res = await axios.post('https://api.intelligence.io.solutions/api/v1/chat/completions', {
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    messages: [
      { role: 'system', content: 'You are MEGAMIND-MD, a helpful WhatsApp bot assistant. Be concise and helpful.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 800,
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  }).catch(() => null);

  if (res?.data?.choices?.[0]?.message?.content) {
    return res.data.choices[0].message.content;
  }

  // Second fallback
  const res2 = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama3-8b-8192',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 600,
  }, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY || ''}` },
    timeout: 20000,
  }).catch(() => null);

  if (res2?.data?.choices?.[0]?.message?.content) {
    return res2.data.choices[0].message.content;
  }

  throw new Error('No AI API key configured. Set OPENAI_API_KEY or GEMINI_API_KEY in .env');
}

module.exports = [
  {
    name: 'ai',
    aliases: ['ask', 'bot', 'chatbot'],
    category: 'AI',
    description: 'Chat with AI (uses best available API)',
    async execute({ reply, text }) {
      if (!text) return reply('Usage: .ai <your question>');
      await reply('🧠 Thinking...');

      let response;
      if (settings.apiKeys.openai) {
        response = await askOpenAI(text);
      } else if (settings.apiKeys.gemini) {
        response = await askGemini(text);
      } else {
        response = await askFreeAI(text);
      }

      await reply(`🧠 *MEGAMIND AI:*\n\n${response}`);
    },
  },

  {
    name: 'gpt',
    aliases: ['chatgpt', 'openai'],
    category: 'AI',
    description: 'Chat with ChatGPT',
    async execute({ reply, text }) {
      if (!text) return reply('Usage: .gpt <your question>');
      if (!settings.apiKeys.openai) return reply('❌ OPENAI_API_KEY not set. Add it to your .env file.');
      await reply('🤖 Asking ChatGPT...');
      const response = await askOpenAI(text, 'gpt-3.5-turbo');
      await reply(`🤖 *ChatGPT:*\n\n${response}`);
    },
  },

  {
    name: 'gemini',
    aliases: ['google', 'bard'],
    category: 'AI',
    description: 'Chat with Google Gemini',
    async execute({ reply, text }) {
      if (!text) return reply('Usage: .gemini <your question>');
      if (!settings.apiKeys.gemini) return reply('❌ GEMINI_API_KEY not set. Add it to your .env file.');
      await reply('🧠 Asking Gemini...');
      const response = await askGemini(text);
      await reply(`🌟 *Google Gemini:*\n\n${response}`);
    },
  },

  {
    name: 'aicode',
    aliases: ['code', 'codegen'],
    category: 'AI',
    description: 'Generate code with AI',
    async execute({ reply, text }) {
      if (!text) return reply('Usage: .aicode <what code do you need?>\nExample: .aicode Python function to sort a list');
      await reply('💻 Generating code...');

      const prompt = `Write clean, working code for: ${text}. Include brief comments. Be concise.`;
      let response;
      if (settings.apiKeys.openai) response = await askOpenAI(prompt, 'gpt-3.5-turbo');
      else if (settings.apiKeys.gemini) response = await askGemini(prompt);
      else response = await askFreeAI(prompt);

      await reply(`💻 *Generated Code:*\n\n\`\`\`\n${response}\n\`\`\``);
    },
  },

  {
    name: 'imagine',
    aliases: ['image', 'dalle', 'generate'],
    category: 'AI',
    description: 'Generate an AI image',
    async execute({ sock, from, reply, msg, text }) {
      if (!text) return reply('Usage: .imagine <description>\nExample: .imagine a futuristic city at sunset');
      if (!settings.apiKeys.openai) return reply('❌ OPENAI_API_KEY needed for image generation. Add it to .env.');

      await reply('🎨 Generating your image...');
      const res = await axios.post('https://api.openai.com/v1/images/generations', {
        model: 'dall-e-3',
        prompt: text,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      }, {
        headers: { Authorization: `Bearer ${settings.apiKeys.openai}` },
        timeout: 60000,
      });

      const imgUrl = res.data?.data?.[0]?.url;
      if (!imgUrl) throw new Error('No image generated');

      const buf = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 30000 }).then(r => Buffer.from(r.data));
      await sock.sendMessage(from, {
        image: buf,
        caption: `🎨 *AI Generated Image*\n_Prompt: ${text}_\n\n🧠 MEGAMIND-MD`,
      }, { quoted: msg });
    },
  },

  {
    name: 'summarize',
    aliases: ['summary', 'tldr'],
    category: 'AI',
    description: 'Summarize text',
    async execute({ reply, text }) {
      if (!text) return reply('Usage: .summarize <text to summarize>');
      await reply('📝 Summarizing...');
      const prompt = `Summarize this in 3-5 bullet points: ${text}`;
      let response;
      if (settings.apiKeys.openai) response = await askOpenAI(prompt);
      else if (settings.apiKeys.gemini) response = await askGemini(prompt);
      else response = await askFreeAI(prompt);
      await reply(`📝 *Summary:*\n\n${response}`);
    },
  },
];
