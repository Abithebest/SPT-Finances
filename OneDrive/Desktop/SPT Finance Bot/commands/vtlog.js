let { request, verifiedUsers, isDateInRange, getObject, formatNum, currency, uppercase } = require('../utils.js')
let { EmbedBuilder } = require('discord.js')

module.exports = {
    command: {
        name: 'vtlog',
        description: 'Send a report of an individual driver in VTLog.',
        options: [
            {
                name: 'query',
                description: 'Driver name or ID',
                type: 3,
                required: true,
                autocomplete: true
            },
			{
				name: 'from',
				description: 'Start from this day. MM-DD-YYYY',
				type: 3,
				required: true,
				autocomplete: true
			},
			{
				name: 'to',
				description: 'End on this day. MM-DD-YYYY',
				type: 3,
				required: true,
				autocomplete: true
			}
        ]
    },
    func: async function({ interaction, params, optionData }) {
        if(!verifiedUsers.includes(interaction.user.id)) {
            interaction.reply({
                ephemeral: true,
                content: 'Sorry, this command isnt able to be used by you.'
            })

            return;
        }

        await interaction.deferReply()

        let query = optionData(params[0]).toLowerCase()

    }
}