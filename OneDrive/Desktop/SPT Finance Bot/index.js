const {REST, Routes, Client, GatewayIntentBits, Partials, ActivityType} = require('discord.js')
const express = require('express')

const handleCommand = require('./handlers/handleCommand.js')
const handleButton = require('./handlers/handleButton.js')
const handleSelect = require('./handlers/handleSelect.js')

const utils = require('./utils.js')

const client = new Client({
  intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
  presence: {
      status: 'online',
			activities: [
				{
					name: 'SPT Finances',
					type: ActivityType.Watching
				}
			]
  }
})

client.on('ready', async () => {
  console.log('Bot Ready!')
})

client.on('interactionCreate', async (i) => {
	if (i.isStringSelectMenu()) {
		handleSelect(i, client)
		return;
	}
	if (i.isButton()) {
		handleButton(i, client)
		return;
	}
	if (i.isChatInputCommand()) {
		handleCommand(i, client)
		return;
	}
	if (i.isModalSubmit()) {
		handleModal(i, client)
		return;
	}
})

client.login(process.env['token'])

const rest = new REST({ version: '10' }).setToken(process.env['token']);

setTimeout(function() {
(async () => {
    try {
      console.log('Started refreshing application (/) commands.');

      await rest.put(Routes.applicationCommands(process.env['clientid']), { body: utils.commands });

      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error(error);
    }
})();
}, 1000)

module.exports = {
	client
}

/*process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});*/