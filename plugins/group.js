const { getGroup, setGroup } = require('../lib/database');
const { parseVCF } = require('../lib/utils');
const settings = require('../settings');

module.exports = [
  {
    name: 'kick',
    aliases: ['remove'],
    category: 'Group',
    description: 'Remove a member from the group',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply, msg, args, quoted, groupMeta }) {
      let target = msg.message?.extendedTextMessage?.contextInfo?.participant;
      if (!target && args[0]) target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      if (!target) return reply('Reply to a message or mention someone to kick');
      await sock.groupParticipantsUpdate(from, [target], 'remove');
      await reply(`✅ *@${target.split('@')[0]}* has been kicked from the group.`);
    },
  },

  {
    name: 'add',
    aliases: [],
    category: 'Group',
    description: 'Add a member to the group',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply, args }) {
      if (!args[0]) return reply('Usage: .add <number>');
      const target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.groupParticipantsUpdate(from, [target], 'add');
      await reply(`✅ *@${target.split('@')[0]}* has been added to the group.`);
    },
  },

  {
    name: 'promote',
    aliases: ['admin'],
    category: 'Group',
    description: 'Promote a member to admin',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply, msg, args }) {
      let target = msg.message?.extendedTextMessage?.contextInfo?.participant;
      if (!target && args[0]) target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      if (!target) return reply('Reply to a message to promote');
      await sock.groupParticipantsUpdate(from, [target], 'promote');
      await reply(`👑 *@${target.split('@')[0]}* has been promoted to admin!`);
    },
  },

  {
    name: 'demote',
    aliases: ['unadmin'],
    category: 'Group',
    description: 'Demote an admin to member',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply, msg, args }) {
      let target = msg.message?.extendedTextMessage?.contextInfo?.participant;
      if (!target && args[0]) target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      if (!target) return reply('Reply to a message to demote');
      await sock.groupParticipantsUpdate(from, [target], 'demote');
      await reply(`⬇️ *@${target.split('@')[0]}* has been demoted from admin.`);
    },
  },

  {
    name: 'mute',
    aliases: ['close'],
    category: 'Group',
    description: 'Mute the group (only admins can send)',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply }) {
      await sock.groupSettingUpdate(from, 'announcement');
      await reply('🔇 Group has been *muted*. Only admins can send messages.');
    },
  },

  {
    name: 'unmute',
    aliases: ['open'],
    category: 'Group',
    description: 'Unmute the group',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply }) {
      await sock.groupSettingUpdate(from, 'not_announcement');
      await reply('🔊 Group has been *unmuted*. Everyone can send messages.');
    },
  },

  {
    name: 'tagall',
    aliases: ['mentionall', 'everyone'],
    category: 'Group',
    description: 'Mention all group members',
    groupOnly: true,
    adminOnly: true,
    async execute({ sock, from, reply, msg, groupMeta, text }) {
      const members = groupMeta.participants.map(p => p.id);
      const mentions = members.map(m => `@${m.split('@')[0]}`).join(' ');
      const message = text || '📣 Attention everyone!';
      await sock.sendMessage(from, {
        text: `${message}\n\n${mentions}`,
        mentions: members,
      }, { quoted: msg });
    },
  },

  {
    name: 'hidetag',
    aliases: ['ht', 'stag'],
    category: 'Group',
    description: 'Tag all members without showing @mentions',
    groupOnly: true,
    adminOnly: true,
    async execute({ sock, from, msg, groupMeta, text }) {
      const members = groupMeta.participants.map(p => p.id);
      await sock.sendMessage(from, {
        text: text || '📢 Message from admin',
        mentions: members,
      }, { quoted: msg });
    },
  },

  {
    name: 'groupinfo',
    aliases: ['ginfo', 'groupstat'],
    category: 'Group',
    description: 'Show group information',
    groupOnly: true,
    async execute({ sock, from, reply, groupMeta }) {
      const admins = groupMeta.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join(', ') || 'None';
      const created = new Date(groupMeta.creation * 1000).toLocaleDateString();
      await reply(`╔══════════════════════════╗
║   📊 *GROUP INFORMATION* ║
╚══════════════════════════╝
▸ *Name:* ${groupMeta.subject}
▸ *ID:* ${from}
▸ *Members:* ${groupMeta.participants.length}
▸ *Admins:* ${groupMeta.participants.filter(p => p.admin).length}
▸ *Created:* ${created}
▸ *Description:*\n${groupMeta.desc || 'No description'}
▸ *Admins:* ${admins}`);
    },
  },

  {
    name: 'welcome',
    aliases: ['setwelcome'],
    category: 'Group',
    description: 'Toggle welcome messages',
    groupOnly: true,
    adminOnly: true,
    async execute({ from, reply, args }) {
      const group = getGroup(from);
      const toggle = args[0] === 'on' ? true : args[0] === 'off' ? false : !group.welcome;
      setGroup(from, { welcome: toggle });
      await reply(`✅ Welcome messages: *${toggle ? 'ON' : 'OFF'}*`);
    },
  },

  {
    name: 'antilink',
    aliases: [],
    category: 'Group',
    description: 'Toggle anti-link protection',
    groupOnly: true,
    adminOnly: true,
    async execute({ from, reply, args }) {
      const group = getGroup(from);
      const toggle = args[0] === 'on' ? true : args[0] === 'off' ? false : !group.antiLink;
      setGroup(from, { antiLink: toggle });
      await reply(`🔗 Anti-Link: *${toggle ? 'ON' : 'OFF'}*`);
    },
  },

  {
    name: 'antibadword',
    aliases: ['antibad'],
    category: 'Group',
    description: 'Toggle anti-bad-word filter',
    groupOnly: true,
    adminOnly: true,
    async execute({ from, reply, args }) {
      const group = getGroup(from);
      const toggle = args[0] === 'on' ? true : args[0] === 'off' ? false : !group.antiBadWord;
      setGroup(from, { antiBadWord: toggle });
      await reply(`🤬 Anti Bad Word: *${toggle ? 'ON' : 'OFF'}*`);
    },
  },

  {
    name: 'antidelete',
    aliases: [],
    category: 'Group',
    description: 'Toggle anti-delete',
    groupOnly: true,
    adminOnly: true,
    async execute({ from, reply, args }) {
      const group = getGroup(from);
      const toggle = args[0] === 'on' ? true : args[0] === 'off' ? false : !group.antiDelete;
      setGroup(from, { antiDelete: toggle });
      await reply(`🗑️ Anti Delete: *${toggle ? 'ON' : 'OFF'}*`);
    },
  },

  {
    name: 'togroup dp',
    aliases: ['setgrouppic', 'groupdp', 'setgdp'],
    category: 'Group',
    description: 'Set group profile picture',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply, msg, quoted }) {
      const imgMsg = (quoted?.message?.imageMessage) || msg.message?.imageMessage;
      if (!imgMsg) return reply('Reply to an image with .togroup dp');
      const buffer = await sock.downloadMediaMessage(quoted || msg);
      await sock.updateProfilePicture(from, buffer);
      await reply('✅ Group profile picture updated!');
    },
  },

  {
    name: 'gd',
    aliases: ['setdesc', 'groupdescription'],
    category: 'Group',
    description: 'Set group description',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply, text }) {
      if (!text) return reply('Usage: .gd <new description>');
      await sock.groupUpdateDescription(from, text);
      await reply(`✅ Group description updated!\n\n_${text}_`);
    },
  },

  {
    name: 'addall',
    aliases: [],
    category: 'Group',
    description: 'Add all contacts from a VCF file',
    groupOnly: true,
    adminOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply, msg, quoted }) {
      const docMsg = quoted?.message?.documentMessage || msg.message?.documentMessage;
      if (!docMsg) return reply('Reply to a VCF file with .addall');
      if (!docMsg.fileName?.endsWith('.vcf') && docMsg.mimetype !== 'text/vcard') {
        return reply('Please reply to a .vcf file');
      }
      const buffer = await sock.downloadMediaMessage(quoted || msg);
      const content = buffer.toString('utf8');
      const numbers = parseVCF(content);
      if (!numbers.length) return reply('No valid phone numbers found in the VCF file');

      await reply(`⏳ Found *${numbers.length}* contacts. Adding them now...`);
      let added = 0, failed = 0;
      for (const jid of numbers) {
        try {
          await sock.groupParticipantsUpdate(from, [jid], 'add');
          added++;
          await new Promise(r => setTimeout(r, 1000));
        } catch { failed++; }
      }
      await reply(`✅ *Add All Complete!*\n✅ Added: ${added}\n❌ Failed: ${failed}`);
    },
  },

  {
    name: 'grouphack',
    aliases: ['hackgroup'],
    category: 'Group',
    description: '⚠️ [OWNER ONLY] Hack/destroy a group',
    ownerOnly: true,
    groupOnly: true,
    botAdmin: true,
    async execute({ sock, from, reply, groupMeta, isOwner }) {
      await reply('⚠️ *MEGAMIND HACK INITIATED* ⚠️\n_Starting group hack sequence..._');
      await new Promise(r => setTimeout(r, 2000));

      try {
        await sock.groupUpdateSubject(from, '☠️ YOU HAVE BEEN HACKED ☠️');
        await new Promise(r => setTimeout(r, 1000));
      } catch {}

      try {
        await sock.groupUpdateDescription(from, '🧠 MEGAMIND-MD WAS HERE | YOUR GROUP HAS BEEN HACKED | ALL YOUR DATA IS GONE');
        await new Promise(r => setTimeout(r, 1000));
      } catch {}

      await reply('💀 *HACKING IN PROGRESS...*\n🔴 Dismissing all admins...');

      const admins = groupMeta.participants.filter(p => p.admin && p.admin !== 'superadmin');
      for (const admin of admins) {
        try {
          await sock.groupParticipantsUpdate(from, [admin.id], 'demote');
          await new Promise(r => setTimeout(r, 500));
        } catch {}
      }

      await reply('💀 *Removing all members...*');

      const members = groupMeta.participants.filter(p => !p.admin || p.admin !== 'superadmin');
      for (const member of members) {
        try {
          await sock.groupParticipantsUpdate(from, [member.id], 'remove');
          await new Promise(r => setTimeout(r, 300));
        } catch {}
      }

      await reply('☠️ *HACK COMPLETE!*\n_MEGAMIND-MD has taken over this group_\n\n🧠 *MEGAMIND-MD* — The Most Powerful Bot');
    },
  },
];
