const { db, verifiedUsers, formatNum, currency } = require('../utils.js')
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
  command: {
    name: 'showloan',
    description: 'Get a list of loans for this company and show one.',
    options: [
      {
        name: 'payment',
        description: 'Amount of money paid to loan.',
        type: 3,
        autocomplete: true
      }
    ]
  },
  func: async function({interaction, params, optionData}) {
    if(!verifiedUsers.includes(interaction.user.id)) {
      interaction.reply({
        ephemeral: true,
        content: 'Sorry, this command isnt able to be used by you.'
      })
      return;
    }

    await interaction.deferReply()

    let companyDB = await db.collection('Companies').findOne({ ServerId: interaction.guildId })
    if(!companyDB) {
      interaction.editReply('Register your company before using this command.')
      return;
    }

    let loans = await db.collection("Loans").find({ ServerId: interaction.guildId }).toArray()

    let formattedLoans = loans.map(loanData => {
      return new StringSelectMenuOptionBuilder()
        .setLabel(loanData.Title)
        .setDescription(`Amount due ... ${formatNum(loanData.Amount.Current)}${currency}`)
        .setValue(loanData._id.toString())
    })

    if(formattedLoans.length == 0) {
      interaction.editReply({
        ephemeral: true,
        content: 'No loans are currently active.'
      })
      return;
    }

    const selectmenu = new StringSelectMenuBuilder()
			.setCustomId(`loanpick;${optionData(params[0]) || -1}`)
			.setPlaceholder('Select a loan...')
			.addOptions(formattedLoans);

    const row = new ActionRowBuilder()
			.addComponents(selectmenu);

    interaction.editReply({
      components: [row]
    })
  }
}