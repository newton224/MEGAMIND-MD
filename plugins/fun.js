const axios = require('axios');

const jokes = [
  "Why don't scientists trust atoms? Because they make up everything! 😄",
  "I told my wife she was drawing her eyebrows too high. She looked surprised! 😂",
  "Why can't you give Elsa a balloon? She'll let it go! 😂",
  "I'm reading a book about anti-gravity. It's impossible to put down! 📚",
  "Why did the scarecrow win an award? Because he was outstanding in his field! 🌾",
  "I would tell you a construction joke, but I'm still working on it! 🏗️",
  "Why don't eggs tell jokes? They'd crack each other up! 🥚",
  "I used to hate facial hair, but then it grew on me! 😂",
  "Why did the bicycle fall over? It was two-tired! 🚲",
  "What do you call a fake noodle? An impasta! 🍝",
];

const quotes = [
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Life is what happens when you're busy making other plans. — John Lennon",
  "The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt",
  "It is during our darkest moments that we must focus to see the light. — Aristotle",
  "Spread love everywhere you go. Let no one ever come to you without leaving happier. — Mother Teresa",
  "When you reach the end of your rope, tie a knot in it and hang on. — Franklin D. Roosevelt",
  "Always remember that you are absolutely unique. Just like everyone else. — Margaret Mead",
  "Do not go where the path may lead, go instead where there is no path and leave a trail. — Ralph Waldo Emerson",
  "You will face many defeats in life, but never let yourself be defeated. — Maya Angelou",
  "The greatest glory in living lies not in never falling, but in rising every time we fall. — Nelson Mandela",
];

const truths = [
  "What is the most embarrassing thing you've ever done in public?",
  "Have you ever lied to get out of trouble? What was the lie?",
  "What is your biggest fear?",
  "Have you ever had a crush on someone in this group?",
  "What is the most childish thing you still do?",
  "What is a secret you have never told anyone?",
  "Have you ever cheated on a test?",
  "What is the worst gift you have ever received?",
  "Who was your first crush?",
  "What is the strangest dream you have ever had?",
];

const dares = [
  "Send a voice note saying 'I am a beautiful butterfly' three times",
  "Change your profile picture to a funny face for 24 hours",
  "Send a message to your crush right now",
  "Do 20 push-ups and send a video",
  "Send your most embarrassing photo",
  "Write a love poem and send it in the group",
  "Call someone in this group and speak only in gibberish for 30 seconds",
  "Send a selfie making the ugliest face you can",
  "Text your mom/dad saying 'I just became a professional clown'",
  "Let someone in the group change your status for 24 hours",
];

const roasts = [
  "You are so slow, it took you an hour to cook minute rice! 😂",
  "You are like a cloud — when you disappear, it's a beautiful day! ☁️",
  "You are the reason they put instructions on shampoo bottles! 🧴",
  "Your secrets are always safe with me. I never pay attention to what you say anyway! 😏",
  "I would agree with you but then we'd both be wrong! 😂",
  "You are not stupid, you just have bad luck thinking! 🤔",
  "I'd roast you more, but my mom said I'm not allowed to burn trash! 🔥",
  "You have miles and miles of character... all of it bad! 😄",
  "Even Google can't find your talent! 🔍",
  "I'm jealous of people who've never met you. 😂",
];

const compliments = [
  "You light up every room you walk into! ✨",
  "Your smile could cure any bad day! 😊",
  "You are one of the most amazing people I know! 🌟",
  "You have an incredible heart! ❤️",
  "Your energy is absolutely contagious! ⚡",
  "You make this world a better place just by being in it! 🌍",
  "You are braver than you believe, stronger than you seem! 💪",
  "Your kindness is your superpower! 🦸",
];

const eightBallResponses = [
  "It is certain ✅", "It is decidedly so ✅", "Without a doubt ✅",
  "Yes, definitely ✅", "You may rely on it ✅", "As I see it, yes ✅",
  "Most likely ✅", "Outlook good ✅", "Yes ✅", "Signs point to yes ✅",
  "Reply hazy, try again 🤔", "Ask again later 🤔", "Better not tell you now 🤔",
  "Cannot predict now 🤔", "Concentrate and ask again 🤔",
  "Don't count on it ❌", "My reply is no ❌", "My sources say no ❌",
  "Outlook not so good ❌", "Very doubtful ❌",
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

module.exports = [
  {
    name: 'joke',
    aliases: ['jokes', 'funny'],
    category: 'Fun',
    description: 'Get a random joke',
    async execute({ reply }) {
      await reply(`╭━━━〔 *JOKE TIME!* 〕━━━┈\n┃\n┃ 😂 ${rand(jokes)}\n┃\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'quote',
    aliases: ['quotes', 'inspire', 'motivation'],
    category: 'Fun',
    description: 'Get an inspirational quote',
    async execute({ reply }) {
      await reply(`╭━━━〔 *QUOTE OF THE DAY* 〕━━━┈\n┃\n┃ ✨ _"${rand(quotes)}"_\n┃\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'truth',
    aliases: ['tr'],
    category: 'Fun',
    description: 'Get a truth question',
    async execute({ reply }) {
      await reply(`╭━━━〔 *TRUTH* 〕━━━┈\n┃\n┃ 🤔 ${rand(truths)}\n┃\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'dare',
    aliases: ['dr'],
    category: 'Fun',
    description: 'Get a dare challenge',
    async execute({ reply }) {
      await reply(`╭━━━〔 *DARE* 〕━━━┈\n┃\n┃ 😈 ${rand(dares)}\n┃\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'tod',
    aliases: ['truthordare', 'tord'],
    category: 'Fun',
    description: 'Random truth or dare',
    async execute({ reply }) {
      const isTruth = Math.random() > 0.5;
      if (isTruth) {
        await reply(`╭━━━〔 *TRUTH* 〕━━━┈\n┃\n┃ 🤔 ${rand(truths)}\n┃\n╰━━━━━━━━━━━━━━━━━━┈`);
      } else {
        await reply(`╭━━━〔 *DARE* 〕━━━┈\n┃\n┃ 😈 ${rand(dares)}\n┃\n╰━━━━━━━━━━━━━━━━━━┈`);
      }
    },
  },

  {
    name: 'meme',
    aliases: ['memes'],
    category: 'Fun',
    description: 'Get a random meme',
    async execute({ sock, from, reply, msg }) {
      try {
        const res = await axios.get('https://meme-api.com/gimme', { timeout: 10000 });
        const { title, url, subreddit } = res.data;
        const buf = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 }).then(r => Buffer.from(r.data));
        await sock.sendMessage(from, {
          image: buf,
          caption: `╭━━━〔 *MEME* 〕━━━┈\n┃ 😂 *${title}*\n┃ 📌 r/${subreddit}\n╰━━━━━━━━━━━━━━━━━━┈`,
        }, { quoted: msg });
      } catch {
        await reply('❌ Could not fetch a meme right now. Try again!');
      }
    },
  },

  {
    name: '8ball',
    aliases: ['eightball', 'magic8'],
    category: 'Fun',
    description: 'Ask the magic 8-ball',
    async execute({ reply, text }) {
      if (!text) return reply('⚠️ Ask a question! Example: *.8ball Will I be rich?*');
      await reply(`╭━━━〔 *MAGIC 8-BALL* 〕━━━┈\n┃ ❓ *Q:* ${text}\n┃\n┃ 🔮 *A:* ${rand(eightBallResponses)}\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'flip',
    aliases: ['coinflip', 'coin'],
    category: 'Fun',
    description: 'Flip a coin',
    async execute({ reply }) {
      const result = Math.random() > 0.5 ? '🪙 *HEADS!*' : '🪙 *TAILS!*';
      await reply(`╭━━━〔 *COIN FLIP* 〕━━━┈\n┃\n┃ ${result}\n┃\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'roll',
    aliases: ['dice', 'rolldice'],
    category: 'Fun',
    description: 'Roll a dice',
    async execute({ reply, args }) {
      const sides = parseInt(args[0]) || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      await reply(`╭━━━〔 *DICE ROLL* 〕━━━┈\n┃ 🎲 *d${sides}:* ${result}\n╰━━━━━━━━━━━━━━━━━━┈`);
    },
  },

  {
    name: 'roast',
    aliases: ['burn'],
    category: 'Fun',
    description: 'Roast someone',
    async execute({ sock, from, reply, msg, senderPhone }) {
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentionedJid[0] ? mentionedJid[0] : null;
      const targetName = target ? `@${target.split('@')[0]}` : 'you';
      await sock.sendMessage(from, {
        text: `╭━━━〔 *ROAST TIME* 〕━━━┈\n┃\n┃ 🔥 *${targetName}* ${rand(roasts)}\n┃\n╰━━━━━━━━━━━━━━━━━━┈`,
        ...(target ? { mentions: [target] } : {}),
      }, { quoted: msg });
    },
  },

  {
    name: 'compliment',
    aliases: ['comp', 'praise'],
    category: 'Fun',
    description: 'Compliment someone',
    async execute({ sock, from, reply, msg }) {
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const target = mentionedJid[0] ? mentionedJid[0] : null;
      const targetName = target ? `@${target.split('@')[0]}` : 'you';
      await sock.sendMessage(from, {
        text: `╭━━━〔 *COMPLIMENT* 〕━━━┈\n┃\n┃ 💝 *${targetName}:*\n┃ ${rand(compliments)}\n┃\n╰━━━━━━━━━━━━━━━━━━┈`,
        ...(target ? { mentions: [target] } : {}),
      }, { quoted: msg });
    },
  },

  {
    name: 'ship',
    aliases: ['love'],
    category: 'Fun',
    description: 'Ship two people together',
    async execute({ sock, from, reply, msg }) {
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (mentionedJid.length < 2) return reply('⚠️ Tag 2 people! Example: *.ship @user1 @user2*');
      const [u1, u2] = mentionedJid;
      const percent = Math.floor(Math.random() * 101);
      const hearts = '❤️'.repeat(Math.floor(percent / 20)) + '🖤'.repeat(5 - Math.floor(percent / 20));
      await sock.sendMessage(from, {
        text: `╭━━━〔 *LOVE SHIP* 〕━━━┈\n┃ 💑 @${u1.split('@')[0]} & @${u2.split('@')[0]}\n┃\n┃ ${hearts}\n┃ 💘 *Compatibility:* ${percent}%\n┃\n┃ ${percent >= 80 ? '🔥 Perfect match!' : percent >= 50 ? '💛 Good chemistry!' : percent >= 30 ? '🤝 Friends zone...' : '💔 Not a match.'}\n╰━━━━━━━━━━━━━━━━━━┈`,
        mentions: [u1, u2],
      }, { quoted: msg });
    },
  },
];
