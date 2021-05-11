const config = {
    Discord: {
        /**
         * This will allow EVERYONE in the server to move the server region.
         *
         * Set this to `false` to keep server-moving restricted.
         * Set this to `true` to allow EVERYONE in the server to move server regions.
         *
         * For public/community servers, it's recommended to leave this as `false`
         */
        allowEveryoneToMoveRegion: false,

        /**
         * Primarily used for testing.
         *
         * At the time of writing the ID put here is considered the "bot owner".
         * The bot owner currently bypasses the following restrictions:
         * - Permission check in `canMoveRegion()`
         *      - Which verifies the user has the correct Discord permissions in the server
         *
         * The bot owner ID is the user ID/"snowflake" of a Discord user.
         *
         * @type {String}
         */
        botOwnerId: '',

        /**
         * Add your Discord bot token here.
         */
        token: 'REPLACE_WITH_DISCORD_BOT_TOKEN',
    },
};

module.exports = config;
