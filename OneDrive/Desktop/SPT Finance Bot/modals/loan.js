let { db } = require("../utils.js")

module.exports = async function({interaction}) {
  let title = interaction.fields.getTextInputValue("titleInput")
  let amount = parseInt(interaction.fields.getTextInputValue("amountInput"))
  let created = (new Date()).getTime()

  await interaction.reply({
    ephemeral: true,
    content: 'Waiting for response...'
  })

  if(isNaN(amount)) {
    interaction.editReply({
      ephemeral: true,
      content: 'Loan amount has to be a number.'
    })

    return;
  }

  let companyData = await db.collection('Companies').findOne({ ServerId: interaction.guildId })
  if(!companyData) {
    interaction.editReply('Register your company before using this command.')
    return;
  }

  let loanData = await db.collection('Loans').insertOne({
    ServerId: interaction.guildId,
    Amount: {
      Current: amount,
      Original: amount
    },
    Title: title,
    Created: created,
    LastPayment: created
  })

  interaction.editReply({
    ephemeral: true,
    content: 'Loan has been created!'
  })
}