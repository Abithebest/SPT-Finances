module.exports = function(i, client) {
  var id = i.customId;

	if (id.includes(';')) {
		id = id.split(';')[0]
	}

  const button = require(`../buttons/${id}.js`)
  button({
    interaction: i,
    client
  })
}