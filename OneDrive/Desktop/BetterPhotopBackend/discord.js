const {ModalBuilder, EmbedBuilder, Client, GatewayIntentBits, Partials, ButtonBuilder, ButtonStyle, ActionRowBuilder, TextInputBuilder, TextInputStyle} = require('discord.js')
const {themes, plugins, people, userWebsockets, websockets} = require('./index.js')

const client = new Client({
  intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel],
  presence: {
      status: 'online'
  }
})

client.on('ready', async () => {
  console.log('Bot Ready!')
})

client.login(process.env['token'])

client.on('interactionCreate', async (i) => {
	if(!i.isButton()) return;

	let params = i.customId.split(';')
	switch(params[0]) {
		case 'deletePlugin':
			if(!people[i.user.id].includes('delete')) {
				return;
			}

			plugins.delete(params[1])
			i.message.edit({
				content: `Plugin deleted by **${i.user.id}** (\`${params[1]}\`)`,
				components: [],
				embeds: []
			})
			i.deferUpdate()
			break;
		case 'reviewPlugin':
			if(!people[i.user.id].includes('review')) {
				return;
			}

			let pluginData = plugins.storage[params[1]];
			
			pluginData.reviewed = true;
			pluginData.updateReview = false;
			plugins.set(params[1], pluginData)

			i.message.edit({
				content: `Plugin reviewed by **${i.user.id}** (\`${params[1]}\`)`,
				components: [],
				embeds: []
			})
			i.deferUpdate()
			break;
		case 'unpublishPlugin':
			if(!people[i.user.id].includes('delete')) {
				return;
			}
			
			let pluginData1 = plugins.storage[params[1]];
			pluginData1.published = false;
			plugins.set(params[1], pluginData1)
			
			i.message.edit({
				content: `Plugin unpublished by **${i.user.id}** (\`${params[1]}\`)`,
				components: [],
				embeds: []
			})
			i.deferUpdate()
			break;

		case 'deleteTheme':
			if(!people[i.user.id].includes('delete')) {
				return;
			} 
			themes.delete(params[1])
			i.message.edit({
				content: `Theme Deleted by **${i.user.id}** (\`${params[1]}\`)`,
				components: [],
				embeds: []
			})
			i.deferUpdate()
			break;
		case 'reviewTheme':
			if(!people[i.user.id].includes('review')) {
				return;
			} 

			let themeData = themes.storage[params[1]];
			
			themeData.reviewed = true;
			themeData.updateReview = false;
			themes.set(params[1], themeData)

			i.message.edit({
				content: `Theme Reviewed by **${i.user.id}** (\`${params[1]}\`)`,
				components: [],
				embeds: []
			})
			i.deferUpdate()
			break;
		case 'unpublishTheme':
			if(!people[i.user.id].includes('delete')) {
				return;
			}
			
			let themeData1 = themes.storage[params[1]];
			themeData1.published = false;
			themes.set(params[1], themeData1)
			
			i.message.edit({
				content: `Theme unpublished by **${i.user.id}** (\`${params[1]}\`)`,
				components: [],
				embeds: []
			})
			i.deferUpdate()
			break;
	}
})

async function sendMessage(type, type2, id) {
	let server = await client.guilds.fetch('1111496584123924490')
	let channel = await server.channels.fetch('1111496584597872714')
	
	var embed;
	var buttons;
	var data;
	switch(type) {
		case 'Plugin':
			data = plugins.storage[id]
			break;
		case 'Theme':
			data = themes.storage[id]
			break;
	}

	embed = new EmbedBuilder()
	.setTitle(`${type} - ${type2}`)
	.addFields(
		{name: 'Name', value: data.name},
		{name: 'Published', value: `${data.published?'Yes':'No'}`},
		{name: 'Script', value: `Origin: ${data.origin}\nScript: ${data.script}\nBackend: ${data.backendLink?data.backendLink:'None'}`},
		{name: 'Author', value: `${data.author.userid} - ${data.author.name}`}
	)
	.setFooter({text: data.id})

	buttons = new ActionRowBuilder()
	.addComponents(
		new ButtonBuilder()
			.setCustomId(`delete${type};${id}`)
			.setLabel('Delete')
			.setStyle(ButtonStyle.Danger),
		new ButtonBuilder()
			.setCustomId(`unpublish${type};${id}`)
			.setLabel('Unpublish')
			.setStyle(ButtonStyle.Danger),
		new ButtonBuilder()
			.setCustomId(`review${type};${id}`)
			.setLabel('Review')
			.setStyle(ButtonStyle.Secondary)
	)

	channel.send({
		embeds: [embed],
		components: buttons?[buttons]:undefined
	})
}

module.exports = {
	sendMessage
}