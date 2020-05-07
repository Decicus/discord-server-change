# discord-server-change

This is a quick-and-dirty implementation of a bot that allows you to easily change voice server region with commands.  
Only reason this exists is because the Europe servers always die, so I needed something that required the least amount of clicking.

The bot requires, at minimum, `Manage Server` permission to change the server regions.

## Add to your server

You have two choices:

- If you have the technical knowhow, [set it up yourself](#setup) and host it yourself.
- Invite the public bot (`Server Changer#1071`) to your server: [Click here to invite](https://discord.com/oauth2/authorize?client_id=635912849440505886&scope=bot&permissions=32)

## Setup

**For self-hosting**

- Install [Node.js and npm](https://nodejs.org/en/)
    - I recommend running the LTS (Long-Term Support) release. At the time of writing this, that should be 12.x.x.
- Download (with ZIP) or clone the project using Git: `git clone https://github.com/Decicus/discord-server-change.git`
- Navigate to the folder and run `npm install`: `cd discord-server-change && npm install`
- Copy the file `config.sample.js` to `config.js`.
- Open **`config.js`** with a _text editor_ and add your [Discord bot token](https://www.writebots.com/discord-bot-token/)
- Run the bot using `node index.js`.
    - If it runs successfully then I recommend setting it up as a service using [PM2 (process manager)][PM2-QS].
- [Generate an invite URL][Discord-Invite] to add it to your server.
    - Make sure to specify your client ID in your bot application.
- Test the bot by using one of the commands, such as `!region`.

[Discord-Invite]: https://discordapi.com/permissions.html#32
[PM2-QS]: https://pm2.keymetrics.io/docs/usage/quick-start/

## Usage

The following server members can use the command(s):

- Any server member with `Manage Server` (`MANAGE_GUILD`) permission.
- Any server member with `Administrator` permission.
- The server owner.

Keep in mind that commands will only work inside a text channel on the server.  
Sending the bot a _direct message_ will **not** work.

### Display current server region

`!region`

> @Decicus, Current server region: US East

### Change server

`!v region-id`

### Use region command aliases instead

```
&use => us-east
&usw => us-west
&usc => us-central
&uss => us-south
&eu => europe
&ru => russia
&sy => sydney
&in => india
&ja => japan
```

### List available regions

`!v`

#### Example response

```
@Decicus, Available regions - 'Region name [Region ID]':
- Central Europe [eu-central] [Deprecated!]
- India [india]
- London [london] [Deprecated!]
- Japan [japan]
- Amsterdam [amsterdam] [Deprecated!]
- Brazil [brazil]
- US West [us-west]
- Hong Kong [hongkong]
- South Africa [southafrica]
- Sydney [sydney]
- Europe [europe]
- Singapore [singapore]
- US Central [us-central]
- Western Europe [eu-west] [Deprecated!]
- Dubai [dubai] [Deprecated!]
- US South [us-south]
- US East [us-east]
- Frankfurt [frankfurt] [Deprecated!]
- Russia [russia]


Usage => !v region-id
```