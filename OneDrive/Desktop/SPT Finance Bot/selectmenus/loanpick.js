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

	interaction.deferUpdate()

	let pickedId = interaction.values[0];
	let loanUpdate = parseInt(interaction.customId.split(';')[1]);
	let loan = await db.collection('Loans').findOne({ _id: new ObjectId(pickedId) })

	let created = new Date(loan.Created)

	let fields = []
	if(loanUpdate > 0) {
		const oldLoan = loan.Amount.Current;
		loan.Amount.Current -= loanUpdate;
		if(loan.Amount.Current < 0) {
			loan.Amount.Current = 0;
		}
		loan.LastPayment = new Date().getTime();

		fields = [
			{name: 'Balance Forward', value: `🏦 \`-${formatNum(oldLoan)}${currency}\``},
			{name: 'Loan Payment', value: `💰 \`+${formatNum(loanUpdate)}${currency}\` | \`#${loan.PaymentNum + 1}\``},
			{name: 'Loan Balance', value: `💵 \`-${formatNum(loan.Amount.Current)}${currency}\``},
			{name: 'Last Payment', value: `⏰ <t:${(loan.LastPayment / 1000).toFixed(0)}:R>`}
		]

		db.collection('Loans').findOneAndUpdate({ _id: loan._id }, {
			$set: {
				Amount: loan.Amount,
				LastPayment: loan.LastPayment
			},
			$inc: { PaymentNum: 1 }
		})
	} else {
		fields = [
			{name: 'Loan Balance', value: `💵 \`-${formatNum(loan.Amount.Current)}${currency}\``},
			{name: 'Last Payment', value: `⏰ <t:${(loan.LastPayment / 1000).toFixed(0)}:R>`}
		]

		if(loanUpdate == 0) {
			fields.unshift({name: 'Loan Payment', value: `*No Payment*`})
		}
	}
	
	let LoanShow = new EmbedBuilder()
		.setTitle(`${loan.Title} *${formatNum(loan.Amount.Original)}${currency}*`)
		.setFields(fields)
		.setFooter({ text: `Loan created ${created.getMonth()}/${created.getDate()}/${created.getFullYear()}` })
		.setColor('Random')

	const loandelete = new ButtonBuilder()
		.setCustomId(`loandelete;${loan._id.toString()}`)
		.setLabel('End Loan')
		.setStyle(ButtonStyle.Danger);

	const row = new ActionRowBuilder()
		.addComponents(loandelete);

	interaction.message.edit({
		embeds: [LoanShow],
		components: [row]
	})
}