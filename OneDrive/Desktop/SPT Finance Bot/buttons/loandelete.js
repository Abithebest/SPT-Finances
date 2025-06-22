const { db, verifiedUsers } = require("../utils.js")
const { ObjectId } = require('mongodb')

module.exports = async function({interaction}) {
  if(!verifiedUsers.includes(interaction.user.id)) {
		interaction.reply({
			ephemeral: true,
			content: 'Sorry, this command isnt able to be used by you.'
		})
		return;
	}

  db.collection('Loans').findOneAndDelete({ _id: new ObjectId(interaction.customId.split(';')[1]) })

  interaction.message.edit({
    embeds: interaction.embeds,
    components: []
  })
}