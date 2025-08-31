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
            }
        ]
    },
    func: async function({ interaction, params, optionData }) {
        interaction.reply({
            content: 'Command not ready.',
            ephemeral: true
        })
    }
}