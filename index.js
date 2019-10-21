const DiscordJs = require('discord.js');
const Permissions = DiscordJs.Permissions.FLAGS;
const config = require('./config.js');

const client = new DiscordJs.Client();
const codeTicks = '```';

/**
 * Handle region change
 */
client.on('message', async (message) => {
    const member = message.member;
    const user = message.author;

    if (!member) {
        return;
    }

    const canMoveRegion = member.hasPermission(Permissions.MANAGE_GUILD, false, true, true);
    if (!canMoveRegion) {
        return;
    }

    const content = message.cleanContent;
    const params = content.split(' ');
    const cmd = params[0].toLowerCase();

    if (cmd !== '!v') {
        return;
    }

    const guild = message.guild;
    try {
        let regions = await guild.fetchVoiceRegions();
    }
    catch (err) {
        await message.reply(`${message.author} - Unable to get voice regions.`);
        console.error(err);
        return;
    }

    /**
     * Find regions that are still available to switch to.
     */
    regions = regions.filter((region) => {
        return region.deprecated;
    });

    const formatRegions = regions.map((region) => {
        let format = `${region.name} [${region.id}]`;

        if (region.vip) {
            format += ' (VIP)';
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
        await guild.setRegion(getRegion, `Voice region updated to ${selectedRegion} by ${user.username}#${user.discriminator}.`);
        await message.reply(`${member} - Voice region updated to: ${getRegion}`);
    }
    catch (err)
    {
        await message.reply(`${member} - Error updating region.`);
        console.error(err);
    }
});

client.login(config.Discord.token);