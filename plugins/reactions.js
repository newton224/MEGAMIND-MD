const axios = require('axios');

// Animated GIF reaction URLs (from free sources, used as video/GIF stickers)
const REACTIONS = {
  sad: [
    'https://media.tenor.com/x8v1oNUOmg4AAAAd/cry-sad.gif',
    'https://media.tenor.com/s1Y9YVHXIMYAAAAC/cry-crying.gif',
    'https://media.tenor.com/YqC0q0N_BIYAAAAC/crying-tear.gif',
  ],
  happy: [
    'https://media.tenor.com/sZ_GJ74FPSQAAAAC/happy-dance.gif',
    'https://media.tenor.com/TFqaRpxc3ikAAAAC/happy-excited.gif',
    'https://media.tenor.com/9v2c83HlXrAAAAAC/happy-joy.gif',
  ],
  run: [
    'https://media.tenor.com/FPAbBJ2ZZWoAAAAC/run-running.gif',
    'https://media.tenor.com/sWkjfDG8EIYAAAAC/running-fast.gif',
    'https://media.tenor.com/oR3y3FBGH5sAAAAC/sprint-fast.gif',
  ],
  shout: [
    'https://media.tenor.com/7RfFGVH_sxsAAAAC/angry-shout.gif',
    'https://media.tenor.com/7dB5cw9NVBYAAAAC/yelling-scream.gif',
    'https://media.tenor.com/QZ7Kbxch-pgAAAAC/scream-yell.gif',
  ],
  travel: [
    'https://media.tenor.com/q2gJ-xEsNdwAAAAC/travel-adventure.gif',
    'https://media.tenor.com/GjMm8fLFQUEAAAAC/travel-fun.gif',
    'https://media.tenor.com/lYjVKs87djgAAAAC/adventure-travel.gif',
  ],
  hug: [
    'https://media.tenor.com/uxGGZp3IqoUAAAAC/hug-cute.gif',
    'https://media.tenor.com/3b-XKDP3VjUAAAAC/anime-hug.gif',
    'https://media.tenor.com/Kv3rl7lSuBQAAAAC/hugging-embrace.gif',
  ],
  slap: [
    'https://media.tenor.com/ZDKH4-mTb34AAAAC/anime-slap.gif',
    'https://media.tenor.com/z6qBfcWL4b0AAAAC/slap-anime.gif',
    'https://media.tenor.com/RaD3yEFZ8DUAAAAC/slap.gif',
  ],
  pat: [
    'https://media.tenor.com/Qig9mdHaS3cAAAAC/headpat-pat.gif',
    'https://media.tenor.com/G-dWte4pwBsAAAAC/pat-head-pat.gif',
    'https://media.tenor.com/bKP7zN0jTTcAAAAC/good-job-pat.gif',
  ],
  punch: [
    'https://media.tenor.com/RHdFxsQKr6EAAAAC/punch-anime.gif',
    'https://media.tenor.com/XzYpMEuR18QAAAAC/anime-punch.gif',
    'https://media.tenor.com/9VMYvDRfkEAAAAAC/punch-hit.gif',
  ],
  dance: [
    'https://media.tenor.com/uH9rkA5g0s8AAAAC/dance-anime.gif',
    'https://media.tenor.com/GFdGIpvCmv8AAAAC/dancing-cute.gif',
    'https://media.tenor.com/4S5JCdW2P_gAAAAC/happy-dance.gif',
  ],
  cry: [
    'https://media.tenor.com/YqC0q0N_BIYAAAAC/crying-tear.gif',
    'https://media.tenor.com/s1Y9YVHXIMYAAAAC/cry-crying.gif',
    'https://media.tenor.com/x8v1oNUOmg4AAAAd/cry-sad.gif',
  ],
  laugh: [
    'https://media.tenor.com/gLCSuB40j48AAAAC/laugh-haha.gif',
    'https://media.tenor.com/SNL9_xhZl-QAAAAC/lol-laugh.gif',
    'https://media.tenor.com/TXKoI6dxfCgAAAAC/laugh.gif',
  ],
  angry: [
    'https://media.tenor.com/7RfFGVH_sxsAAAAC/angry-shout.gif',
    'https://media.tenor.com/QZ7Kbxch-pgAAAAC/scream-yell.gif',
    'https://media.tenor.com/5d08P8MqgKIAAAAC/angry-frustrated.gif',
  ],
  kiss: [
    'https://media.tenor.com/HGrMeNjXMiYAAAAC/anime-kiss.gif',
    'https://media.tenor.com/CsE0JH7i1poAAAAC/cute-kiss.gif',
  ],
  wink: [
    'https://media.tenor.com/jHG_RirKhloAAAAC/wink.gif',
    'https://media.tenor.com/JlFp3XKRV5MAAAAC/winking.gif',
  ],
  wave: [
    'https://media.tenor.com/W-_DFiGZwP4AAAAC/hi-wave.gif',
    'https://media.tenor.com/GYpSSEsMMnQAAAAC/hello-wave.gif',
  ],
};

async function sendReactionGIF(sock, from, msg, name, target, gifUrls) {
  const url = gifUrls[Math.floor(Math.random() * gifUrls.length)];
  const buf = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 }).then(r => Buffer.from(r.data));

  const captions = {
    sad: `😢 ${name} is feeling sad...`,
    happy: `😄 ${name} is super happy!`,
    run: `🏃 ${name} is running away!`,
    shout: `😤 ${name} is shouting!`,
    travel: `✈️ ${name} is travelling!`,
    hug: target ? `🤗 ${name} hugs ${target}!` : `🤗 ${name} wants a hug!`,
    slap: target ? `👋 ${name} slaps ${target}!` : `👋 Slap!`,
    pat: target ? `🥰 ${name} pats ${target}!` : `🥰 Pat pat!`,
    punch: target ? `👊 ${name} punches ${target}!` : `👊 Punch!`,
    dance: `💃 ${name} is dancing!`,
    cry: `😭 ${name} is crying...`,
    laugh: `😂 ${name} is laughing!`,
    angry: `😠 ${name} is angry!`,
    kiss: target ? `😘 ${name} kisses ${target}!` : `😘 Mwah!`,
    wink: target ? `😉 ${name} winks at ${target}!` : `😉 Wink!`,
    wave: `👋 ${name} waves!`,
  };

  await sock.sendMessage(from, {
    video: buf,
    mimetype: 'video/gif',
    caption: captions[name] || `🎭 ${name}`,
    gifPlayback: true,
  }, { quoted: msg });
}

function makeReactionCommand(name, aliases, description, gifKey) {
  return {
    name,
    aliases,
    category: 'Reactions',
    description,
    async execute({ sock, from, msg, senderPhone, quoted, groupMeta }) {
      let targetName = null;
      if (quoted) {
        const targetJid = quoted.participant || quoted.key?.remoteJid;
        if (targetJid && groupMeta) {
          targetName = `@${targetJid.split('@')[0]}`;
        }
      }
      await sendReactionGIF(sock, from, msg, `@${senderPhone}`, targetName, REACTIONS[gifKey]);
    },
  };
}

module.exports = [
  makeReactionCommand('sad', ['saddened'], 'Send a sad reaction GIF', 'sad'),
  makeReactionCommand('happy', ['joy', 'yay'], 'Send a happy reaction GIF', 'happy'),
  makeReactionCommand('run', ['flee', 'escape'], 'Send a running reaction GIF', 'run'),
  makeReactionCommand('shout', ['yell', 'scream'], 'Send a shouting reaction GIF', 'shout'),
  makeReactionCommand('travel', ['adventure', 'trip'], 'Send a travel reaction GIF', 'travel'),
  makeReactionCommand('hug', ['cuddle'], 'Hug someone with a GIF', 'hug'),
  makeReactionCommand('slap', ['smack'], 'Slap someone with a GIF', 'slap'),
  makeReactionCommand('pat', ['headpat'], 'Pat someone with a GIF', 'pat'),
  makeReactionCommand('punch', ['hit'], 'Punch someone with a GIF', 'punch'),
  makeReactionCommand('dance', ['dancing'], 'Send a dance GIF', 'dance'),
  makeReactionCommand('cry', ['crying', 'weep'], 'Send a crying GIF', 'cry'),
  makeReactionCommand('laugh', ['lol', 'haha'], 'Send a laughing GIF', 'laugh'),
  makeReactionCommand('angry', ['rage', 'mad'], 'Send an angry GIF', 'angry'),
  makeReactionCommand('kiss', ['smooch'], 'Send a kiss GIF', 'kiss'),
  makeReactionCommand('wink', [], 'Send a winking GIF', 'wink'),
  makeReactionCommand('wave', ['hi', 'hello'], 'Send a wave GIF', 'wave'),
];
