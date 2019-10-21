# discord-server-change

This is a quick-and-dirty implementation of a bot that allows you to easily change voice server region with commands.  
Only reason this exists is because the Europe servers always die, so I needed something that required the least amount of clicking.

The bot requires, at minimum, `Manage Server` permission to change the server regions.

## Usage

The following members can use the command(s):

- Any member with `Manage Server` (`MANAGE_GUILD`) permission
- Any member with `Administrator` permission
- The server owner

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