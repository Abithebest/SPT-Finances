const { verifiedUsers, db, currency, formatNum } = require('../utils.js')
const { ObjectId } = require('mongodb')
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js')

module.exports = async function({interaction}) {
	if(!verifiedUsers.includes(interaction.user.id)) {
		interaction.reply({
			ephemeral: true,
			content: 'Sorry, this command isnt able to be used by you.'
		})
		return;
	}

	let pickedId = interaction.values[0];
	let loanUpdate = parseInt(interaction.customId.split(';')[1]) || 0;
	let loan = await db.collection('Loans').findOne({ _id: new ObjectId(pickedId) })

	let created = new Date(loan.Created)

	let fields = []
	if(loanUpdate > 0) {
		loan.Amount -= loanUpdate;
		if(loan.Amount < 0) {
			loan.Amount = 0;
		}
		loan.LastPayment = new Date().getTime();

		fields = [
			{name: 'Loan Payment', value: `💰 \`+${formatNum(loanUpdate)}${currency}\``},
			{name: 'Loan Balance', value: `💵 \`-${formatNum(loan.Amount)}${currency}\``},
			{name: 'Last Payment', value: `⏰ <t:${(loan.LastPayment / 1000).toFixed(0)}:R>`}
		]

		db.collection('Loans').findOneAndUpdate({ _id: loan._id }, {
			$set: {
				Amount: loan.Amount,
				LastPayment: loan.LastPayment
			}
		})
	} else {
		fields = [
			{name: 'Loan Balance', value: `💵 \`-${formatNum(loan.Amount)}${currency}\``},
			{name: 'Last Payment', value: `⏰ <t:${(loan.LastPayment / 1000).toFixed(0)}:R>`}
		]
	}
	
	let LoanShow = new EmbedBuilder()
		.setTitle(loan.Title)
		.setFields(fields)
		.setFooter({ text: `Loan created ${created.getMonth()}/${created.getDate()}/${created.getFullYear()}` })
		.setColor('Random')

	const loandelete = new ButtonBuilder()
		.setCustomId(`loandelete;${loan._id.toString()}`)
		.setLabel('End Loan')
		.setStyle(ButtonStyle.Danger);

	const row = new ActionRowBuilder()
		.addComponents(loandelete);

	interaction.deferUpdate()
	interaction.message.edit({
		embeds: [LoanShow],
		components: [row]
	})
}