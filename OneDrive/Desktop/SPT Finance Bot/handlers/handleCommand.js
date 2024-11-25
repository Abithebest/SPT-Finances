module.exports = function(i, client) {
  const name = i.commandName;
  const params = i.options.data
  const optionData = function(option) {
		if (!option) return;
    return option.value
  }

  const command = require(`../commands/${name}.js`)
  command.func({
    interaction: i,
    params,
    optionData,
    client
  })
}