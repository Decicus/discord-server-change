const DiscordJs = require('discord.js');
const Permissions = DiscordJs.Permissions.FLAGS;
const config = require('./config.js');

const client = new DiscordJs.Client();
const codeTicks = '```';

client.on('ready', () => {
    const user = client.user;
    console.log(`Logged in as ${user.username}#${user.discriminator}`);
});

/**
 * Region aliases
 */
const aliases = {
    'use': 'us-east',
    'usw': 'us-west',
    'usc': 'us-central',
    'uss': 'us-south',
    'eu': 'europe',
    'ru': 'russia',
    'sy': 'sydney',
    'in': 'india',
    'ja': 'japan',
};

/**
 * Checks if a member has the guild permissions to move regions.
 * 
 * @param {DiscordJs.GuildMember} member https://discord.js.org/#/docs/main/12.2.0/class/GuildMember
 */
const canMoveRegion = (member) => {
    const options = {
        /**
         * Check if GuildMember is the owner,
         * thus overriding all permissions
         */
        checkOwner: true,

        /**
         * Check if the GuildMember has the `administrator` permission
         * via one of their roles.
         */
        checkAdmin: true,
    };

    return member.hasPermission(Permissions.MANAGE_GUILD, options);
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
 * Check per-Guild cooldown.
 * 
 * @param {String} guildId
 * @param {String} cmd Command
 * @returns {Promise<Boolean>} True if command should continue, false if it should be aborted.
 */
const checkCooldown = async (guildId, cmd) => {
    // Current timestamp in milliseconds
    const now = Date.now();

    if (!cooldowns[guildId]) {
        cooldowns[guildId] = {};
        cooldowns[guildId][cmd] = now;

        console.log(`No cooldown exists for ${guildId} and command ${cmd} - Setting it to: ${now}`);
        return true;
    }

    // Need this in milliseconds.
    const minimumTime = minimumSeconds * 1000;
    const lastCooldown = cooldowns[guildId][cmd] || 0;

    /**
     * If `lastCooldown` plus the `minimumTime` is less than `now`
     * then more time has passed since the cooldown was applied and valid.
     * 
     * If that's the case, then it returns `true` and should let the command continue.
     * Otherwise it's `false` and should block the current command attempt.
     */
    return (lastCooldown + minimumTime) < now;
};

/**
 * Update the cooldown for the Guild.
 * 
 * @param {String} guildId 
 * @param {String} cmd Command
 */
const updateCooldown = async (guildId, cmd) => {
    const now = Date.now();
    console.log(`Updated cooldown for ${guildId}: ${now}`);

    if (!cooldowns[guildId]) {
        cooldowns[guildId] = {};
    }

    cooldowns[guildId][cmd] = now;
};

/**
 * Handle region aliases
 */
client.on('message', async(message) => {
    const content = message.cleanContent;
    const params = content.split(' ');
    const prefix = content[0];

    if (prefix !== '&') {
        return;
    }

    const alias = params[0].replace('&', '');
    const region = aliases[alias];

    if (!region) {
        return;
    }

    const member = message.member;
    if (!member) {
        return;
    }

    if (!canMoveRegion(member)) {
        return;
    }

    const user = message.author;
    const guild = message.guild;
    // Use `v` because region aliases.
    const cmd = 'v';
    const guildId = guild.id;
    const cooldown = await checkCooldown(guildId, cmd);

    if (!cooldown) {
        console.log(
            `${guild.name} (${guildId}) is still on cooldown, ignoring command: ${cmd}`
        );
        return;
    }

    try {
        await guild.setRegion(region, `Voice region updated to ${region} by ${user.username}#${user.discriminator}.`);
        console.log(`Voice region updated for ${guild.name} [${guild.id}] to ${region} by ${user.username}#${user.discriminator}.`);
        await message.reply(`Voice region updated to: ${region}`);
    }
    catch (err) {
        await message.reply('Error updating region.');
        console.error(`Could not update voice region on server ${guild.name} [${guild.id}] to ${region}.`);
        console.error(err);
    }

    await updateCooldown(guildId, cmd);
});

const cmds = {};

/**
 * Reply with current voice region for the guild.
 */
cmds.region = async (message, params) => {
    const guild = message.guild;
    let regions;
    try {
        regions = await guild.fetchVoiceRegions();
    } catch (err) {
        console.error(err);
    }

    let region = guild.region;

    if (regions !== undefined) {
        const findRegion = regions.get(region);
        region = findRegion.name;

        if (findRegion.deprecated) {
            region += ' [Deprecated]';
        }

        if (findRegion.vip) {
            region += ' [VIP]';
        }
    }

    await message.reply(`Current server region: ${region}`);
};

/**
 * Change voice region
 */
cmds.v = async (message, params) => {
    const user = message.author;
    const guild = message.guild;
    let regions;
    try {
        regions = await guild.fetchVoiceRegions();
    } catch (err) {
        await message.reply(`Unable to get voice regions.`);
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

    if (!selectedRegion) {
        await message.reply(listRegions);
        return;
    }

    const getRegion = regions.get(selectedRegion);
    if (!getRegion) {
        await message.reply('**Invalid region specified**\n' + listRegions);
        return;
    }

    try {
        await guild.setRegion(
            getRegion.id,
            `Voice region updated to ${selectedRegion} by ${user.username}#${user.discriminator}.`
        );

        console.log(
            `Voice region updated for ${guild.name} [${guild.id}] to ${selectedRegion} by ${user.username}#${user.discriminator}.`
        );

        await message.reply(
            `Voice region updated to: ${getRegion.name} [${getRegion.id}]`
        );
    } catch (err) {
        await message.reply('Error updating region.');

        console.error(
            `Could not update voice region on server ${guild.name} [${guild.id}].`
        );

        console.error(err);
    }
};

/**
 * Handle commands
 */
client.on('message', async (message) => {
    const content = message.cleanContent;
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
     * GuildMember does not have permission to move server regions.
     */
    if (!canMoveRegion(member)) {
        return;
    }

    const {guild} = message;
    const guildId = guild.id;
    const shouldExecute = await checkCooldown(guildId, cmd);
    if (!shouldExecute) {
        console.log(`${guild.name} (${guildId}) is still on cooldown, ignoring command: ${cmd}`);
        return;
    }

    await cmds[cmd](message, params);
    await updateCooldown(guildId, cmd);
});

process.on('SIGINT', async () => {
    await client.destroy();
    process.exit(0);
});

client.login(config.Discord.token);