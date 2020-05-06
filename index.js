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
 * @param {DiscordJs.GuildMember} member https://discord.js.org/#/docs/main/stable/class/GuildMember
 */
const canMoveRegion = (member) => {
    return member.hasPermission(Permissions.MANAGE_GUILD, false, true, true);
};

/**
 * Handle region aliases
 */
client.on('message', async(message) => {
    const member = message.member;
    const user = message.author;

    if (!member) {
        return;
    }

    if (!canMoveRegion(member)) {
        return;
    }

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

    const guild = message.guild;
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
});

/**
 * `!region` command: Reply with current guild region.
 */
client.on('message', async (message) => {
    const content = message.cleanContent;
    const params = content.split(' ');

    if (params[0].toLowerCase() !== "!region") {
        return;
    }

    /**
     * Direct Messages do not contain a GuildMember struct.
     */
    const {member} = message;
    if (!member) {
        return;
    }

    if (!canMoveRegion(member)) {
        return;
    }

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
});

/**
 * Handle region change
 */
client.on('message', async (message) => {
    const member = message.member;
    const user = message.author;

    if (!member) {
        return;
    }

    if (!canMoveRegion(member)) {
        return;
    }

    const content = message.cleanContent;
    const params = content.split(' ');
    const cmd = params[0].toLowerCase();

    if (cmd !== '!v') {
        return;
    }

    const guild = message.guild;
    let regions;
    try {
        regions = await guild.fetchVoiceRegions();
    }
    catch (err) {
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
    const listRegions = `**Available regions - 'Region name [Region ID]':**\n${codeTicks}- ${formatRegions.join('\n- ')}${codeTicks}\n\n**Usage:** \`!v region-id\``;

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
        await guild.setRegion(getRegion.id, `Voice region updated to ${selectedRegion} by ${user.username}#${user.discriminator}.`);
        console.log(`Voice region updated for ${guild.name} [${guild.id}] to ${selectedRegion} by ${user.username}#${user.discriminator}.`);
        await message.reply(`Voice region updated to: ${getRegion.name} [${getRegion.id}]`);
    }
    catch (err)
    {
        await message.reply('Error updating region.');
        console.error(`Could not update voice region on server ${guild.name} [${guild.id}].`);
        console.error(err);
    }
});

process.on('SIGINT', async () => {
    await client.destroy();
    process.exit(0);
});

client.login(config.Discord.token);