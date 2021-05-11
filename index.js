const eris = require('eris');
const Permissions = eris.Constants.Permissions;
const config = require('./config.js');

const clientOpts = {
    compress: true,
};

/**
 * @type {eris.Client}
 */
const client = new eris(`Bot ${config.Discord.token}`, clientOpts);

/**
 * @type {String}
 */
const codeTicks = '```';

/**
 * Primarily used for testing.
 * See description in config.sample.js for more information.
 *
 * @type {String}
 */
const botOwnerId = config.Discord.botOwnerId || '';

/**
 * Message to send when bot lacks the correct permissions to move voice regions.
 */
let botNoPermissionsMessage = '';

client.on('ready', () => {
    const user = client.user;
    console.log(`Logged in as ${user.username}#${user.discriminator}`);

    /**
     * My jerry-rigged way of making sure `client.user.mention` is available...
     */
    botNoPermissionsMessage = `The bot (${client.user.mention}) lacks the permissions to change server regions. Please assign the "Manage Channels" permission to the bot.\n\nIf you were previously using this bot with the "Manage Server" permission, you can remove that. The permission change is necessary because of a Discord update: https://support.discord.com/hc/en-us/articles/360060570993-Voice-Regions-Update`;
});

/**
 * Region aliases
 *
 * @type {Object}
 */
const aliases = {
    'use': 'us-east',
    'usw': 'us-west',
    'usc': 'us-central',
    'uss': 'us-south',
    'eu': 'europe',
    'sg': 'singapore',
    'br': 'brazil',
    'hk': 'hongkong',
    'ru': 'russia',
    'sy': 'sydney',
    // au = Australia
    'au': 'sydney',
    'in': 'india',
    'ja': 'japan',
    'jp': 'japan',
    'auto': null,
};

/**
 * Checks if a member has the guild permissions to move regions.
 *
 * @param {eris.Member} member https://abal.moe/Eris/docs/Member
 */
const canMoveRegion = (member) => {
    /**
     * Invalid member
     */
    if (!member) {
        return false;
    }

    const memberId = member.id;
    if (!memberId) {
        return false;
    }

    const username = `${member.username}#${member.discriminator}`;
    const guild = member.guild;

    /**
     * Bot owner has permission.
     */
    if (memberId === botOwnerId) {
        console.log(`[Bot Owner Override] Permit user '${username}' (${memberId}) in server '${guild.name}' (${guild.id})`);
        return true;
    }

    /**
     * Config flag:
     * Allows everyone in the server to move server region.
     *
     * Defaults to `false`
     */
    const everyoneCanMove = config.Discord.allowEveryoneToMoveRegion || false;

    /**
     * Check if the guild member has the `Administrator` permission.
     */
    const isAdmin = member.permissions.has('administrator');

    /**
     * .. or if they're the server owner.
     */
    const isOwner = memberId === member.guild.ownerID;

    /**
     * Checks for the "Manage Channels" permission.
     *
     * At the moment this does not check for permissions that are set on channels/categories
     * only 'globally' in the guild.
     */
    const canManageChannels = member.permissions.has('manageChannels');

    const hasGuildPermission = canManageChannels || isAdmin || isOwner;
    if (everyoneCanMove) {
        /**
         * The user only has permission to move regions because of `Discord.allowEveryoneToMoveRegion`
         */
        if (!hasGuildPermission) {
            console.log(`[AllowEveryoneToMoveRegion] Permit user '${username}' (${memberId}) in server '${guild.name}' (${guild.id})`);
        }

        return true;
    }

    return hasGuildPermission;
};

/**
 * To prevent abuse, restrict servers to execute commands once every X time.
 * See `checkCooldown()`.
 *
 * Object format: {
 *      'guildId': {lastCommand: 'timestamp'},
 * }
 */
const cooldowns = {};

/**
 * Minimum time between commands
 */
const minimumSeconds = 2;

/**
 * Helper function for replying to messages.
 *
 * @param {eris.Message} message
 * @param {String} text
 * @returns {Promise<eris.Message>} The sent message
 */
async function messageReply(message, text)
{
    const user = message.author;
    const channel = message.channel;

    const messageOpts = {
        allowedMentions: {
            everyone: false,
            repliedUser: true,
            users: [user.id, client.user.id],
        },
        content: text,
        messageReference: {
            messageID: message.id,
        },
    };

    return channel.createMessage(messageOpts);
}

/**
 * Checks if the client bot has permissions
 *
 * @param {eris.Guild} guild
 * @return {Boolean}
 */
function checkSelfPermissions(guild)
{
    const permissions = guild.permissionsOf(client.user.id);
    return permissions.has('manageChannels') || permissions.has('administrator');
}

/**
 * Check per-VoiceChannel cooldown.
 *
 * @param {String} channelId
 * @param {String} cmd Command
 * @returns {Boolean} True if command should continue, false if it should be aborted.
 */
function checkCooldown(channelId, cmd)
{
    // Current timestamp in milliseconds
    const now = Date.now();

    if (!cooldowns[channelId]) {
        cooldowns[channelId] = {};
        cooldowns[channelId][cmd] = now;

        console.log(`No cooldown exists for ${channelId} and command ${cmd} - Setting it to: ${now}`);
        return true;
    }

    // Need this in milliseconds.
    const minimumTime = minimumSeconds * 1000;
    const lastCooldown = cooldowns[channelId][cmd] || 0;

    /**
     * If `lastCooldown` plus the `minimumTime` is less than `now`
     * then more time has passed since the cooldown was applied and valid.
     *
     * If that's the case, then it returns `true` and should let the command continue.
     * Otherwise it's `false` and should block the current command attempt.
     */
    return (lastCooldown + minimumTime) < now;
}

/**
 * Update the cooldown for the VoiceChannel.
 *
 * @param {String} channelId
 * @param {String} cmd Command
 */
function updateCooldown(channelId, cmd)
{
    const now = Date.now();
    console.log(`Updated cooldown for ${channelId}: ${now}`);

    if (!cooldowns[channelId]) {
        cooldowns[channelId] = {};
    }

    cooldowns[channelId][cmd] = now;
};

/**
 * Handle region aliases
 *
 * @param {eris.Message} message https://abal.moe/Eris/docs/Message
 */
async function handleRegionAliases(message)
{
    const content = message.content;
    const params = content.split(' ');
    const prefix = content[0];

    if (prefix !== '&') {
        return;
    }

    const alias = params[0].replace('&', '');
    const validAliases = Object.keys(aliases);

    /**
     * Not a valid region alias found, ignoring command.
     * Not posting a message, in case it's meant for a different bot.
     */
    if (!validAliases.includes(alias)) {
        return;
    }

    /**
     * Message was not sent in a guild
     */
    const member = message.member;
    if (!member) {
        return;
    }

    /**
     * Member is not allowed to modify channel regions.
     */
    if (!canMoveRegion(member)) {
        return;
    }

    /**
     * Member is not connected to a voice channel.
     * In the future this should accept a parameter for "Channel Name"
     */
    const voiceState = member.voiceState;
    const voiceChannelId = voiceState.channelID;
    if (!voiceChannelId) {
        await messageReply(message, 'You are currently not connected to a voice channel.');
        return;
    }

    const guildId = message.guildID;
    const guild = client.guilds.get(guildId);
    const canBotMoveRegion = checkSelfPermissions(guild);
    if (!canBotMoveRegion) {
        await messageReply(message, botNoPermissionsMessage);
        return;
    }

    const region = aliases[alias];
    const user = message.author;
    const voiceChannel = guild.channels.get(voiceChannelId);

    // Use `v` because it's a region alias.
    const cmd = 'v';

    const cooldownAllow = checkCooldown(voiceChannelId, cmd);
    if (!cooldownAllow) {
        console.log(
            `${guild.name} (${guildId}) => ${voiceChannel.name} (${voiceChannelId}) is still on cooldown, ignoring command: ${cmd}`
        );
        return;
    }

    const channelSettings = {
        rtcRegion: region,
    };

    /**
     * Alias `&auto` is set to `null`
     * Therefore we fall back to "Automatic"
     */
    const regionName = region || 'Automatic';
    try {
        await voiceChannel.edit(channelSettings, `Voice region updated to ${regionName} by ${user.username}#${user.discriminator}.`);
        console.log(`Voice region updated for ${guild.name} [${guild.id}] => ${voiceChannel.name} [${voiceChannelId}] to ${regionName} by ${user.username}#${user.discriminator}.`);
        await messageReply(message, ` Voice region updated to ${regionName} for channel: ${voiceChannel.name}`);
    }
    catch (err) {
        await messageReply(message, `Error updating region.`);
        console.error(`Could not update voice region on server ${guild.name} [${guild.id}] => ${voiceChannel.name} [${voiceChannelId}] to ${regionName}.`);
        console.error(err);
    }

    updateCooldown(voiceChannelId, cmd);
}

const cmds = {};

/**
 * Reply with current voice region for the VoiceChannel.
 *
 * @param {eris.Message} Message
 * @param {Array<String>} params
 */
cmds.region = async (message, params) => {
    const member = message.member;
    if (!member) {
        return;
    }

    const voiceState = member.voiceState;
    const voiceId = voiceState.channelID;
    if (!voiceId) {
        await messageReply(message, 'You are currently not connected to a voice channel. Connect to a voice channel and try again.');
        return;
    }

    const guildId = message.guildID;
    const guild = client.guilds.get(guildId);
    const voiceChannel = guild.channels.get(voiceId);

    /**
     * @type {Array}
     */
    let regions;
    try {
        regions = await client.getVoiceRegions(guildId);
    } catch (err) {
        console.error(err);
    }

    let region = voiceChannel.rtcRegion;
    if (region === null) {
        region = 'Automatic';
    }

    if (regions !== undefined) {
        const findRegion = regions.find(reg => reg.id === region);

        if (findRegion) {
            region = findRegion.name;

            if (findRegion.deprecated) {
                region += ' [Deprecated]';
            }

            if (findRegion.vip) {
                region += ' [VIP]';
            }
        }
    }

    await messageReply(message, `Channel ${voiceChannel.name} is currently set to region: ${region}`);
};

/**
 * Change voice region
 *
 * @param {eris.Message} message
 * @param {Array<String>} params
 */
cmds.v = async (message, params) => {
    const user = message.author;
    const member = message.member;

    if (!member) {
        return;
    }

    const guildId = message.guildID;
    const guild = client.guilds.get(guildId);

    let regions;
    try {
        regions = await client.getVoiceRegions(guildId);
    } catch (err) {
        await messageReply(message, 'Unable to retrieve list of Discord voice regions.');
        console.error(err);
        return;
    }

    /**
     * Sort deprecated regions as last.
     */
    regions = regions.sort((first, second) => {
        return first.deprecated - second.deprecated;
    });

    const formatRegions = regions.map((region) => {
        let format = `${region.name} [${region.id}]`;

        if (region.deprecated) {
            format += ' [Deprecated!]';
        }

        if (region.vip) {
            format += ' [VIP]';
        }

        return format;
    });

    const selectedRegion = params[1];
    const listRegions = `**Available regions - 'Region name [Region ID]':**\n${codeTicks}- ${formatRegions.join(
        '\n- '
    )}${codeTicks}\n\n**Usage:** \`!v region-id\``;

    /**
     * No region specified
     * Assume the user wants a list of available regions.
     */
    if (!selectedRegion) {
        await messageReply(message, listRegions);
        return;
    }

    /**
     * Invalid region
     */
    const getRegion = regions.find(reg => reg.id === selectedRegion);
    if (!getRegion) {
        await messageReply(message, `**Invalid region specified (${selectedRegion})**\n${listRegions}`);
        return;
    }

    const voiceState = member.voiceState;
    const voiceId = voiceState.channelID;

    /**
     * Not connected to voice channel
     */
    if (!voiceId) {
        await messageReply(message, 'You are currently not connected to a voice channel. Connect to a voice channel and try again.');
        return;
    }

    /**
     * Check bot's permissions to make sure that it can actually change server regions.
     */
    const canBotMoveRegion = checkSelfPermissions(guild);
    if (!canBotMoveRegion) {
        await messageReply(message, botNoPermissionsMessage);
        return;
    }

    const voiceChannel = guild.channels.get(voiceId);
    try {
        const channelOpts = {
            rtcRegion: selectedRegion,
        };

        await voiceChannel.edit(channelOpts, `Voice region updated to ${selectedRegion} by ${user.username}#${user.discriminator}.`);

        console.log(
            `Voice region updated for ${guild.name} [${guild.id}] => ${voiceChannel.name} [${voiceId}] to ${selectedRegion} by ${user.username}#${user.discriminator}.`
        );

        await messageReply(
            message,
            `Voice region updated to ${getRegion.name} [${getRegion.id}] for channel: ${voiceChannel.name}`
        );
    } catch (err) {
        await messageReply(message, 'Error updating voice region.');

        console.error(
            `Could not update voice region on server ${guild.name} [${guild.id}].`
        );

        console.error(err);
    }
};

/**
 * Handle commands (in general)
 *
 * @param {eris.Message} message https://abal.moe/Eris/docs/Message
 */
async function handleCommands(message)
{
    const content = message.content;
    const cmdPrefix = content[0];

    if (cmdPrefix !== '!') {
        return;
    }

    /**
     * Check if command exists.
     */
    const params = content.split(' ');
    const cmd = params[0].toLowerCase().replace('!', '');
    if (!cmds[cmd]) {
        return;
    }

    /**
     * If GuildMember isn't defined, it's not a message in a server
     * (Direct Message)
     */
    const member = message.member;
    if (!member) {
        return;
    }

    /**
     * GuildMember does not have permission to move voice regions.
     */
    if (!canMoveRegion(member)) {
        return;
    }

    const guildId = message.guildID;
    const shouldExecute = checkCooldown(guildId, cmd);
    if (!shouldExecute) {
        console.log(`${guild.name} (${guildId}) is still on cooldown, ignoring command: ${cmd}`);
        return;
    }

    await cmds[cmd](message, params);
    updateCooldown(guildId, cmd);
}

/**
 * Register message events
 */
client.on('messageCreate', handleCommands);
client.on('messageCreate', handleRegionAliases);

/**
 * Exit/Shutdown handler
 */
process.on('SIGINT', async () => {
    client.disconnect({
        reconnect: false,
    });

    process.exit(0);
});

client.connect();
