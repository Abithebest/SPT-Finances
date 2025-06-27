let { verifiedUsers } = require('../utils.js')
let { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js')

module.exports = {
  command: {
    name: 'createloan',
    description: 'Create a loan to show pending payments.'
  },
  func: async ({ interaction, params, optionData }) => {
    if(!verifiedUsers.includes(interaction.user.id)) {
      interaction.reply({
        ephemeral: true,
        content: 'Sorry, this command isnt able to be used by you.'
      })
      return;
    }

    const titleInput = new TextInputBuilder()
      .setCustomId('titleInput')
      .setMaxLength(100)
      .setRequired(true)
      .setLabel('Loan Title')
      .setStyle(TextInputStyle.Short);

    const amountInput = new TextInputBuilder()
      .setCustomId('amountInput')
      .setRequired(true)
      .setLabel('Loan Amount')
      .setStyle(TextInputStyle.Short);

    const modal = new ModalBuilder()
      .setCustomId('loan')
      .setTitle('Loan Creation')

    const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
		const secondActionRow = new ActionRowBuilder().addComponents(amountInput);

    modal.addComponents(firstActionRow, secondActionRow);

    await interaction.showModal(modal);
  }
}