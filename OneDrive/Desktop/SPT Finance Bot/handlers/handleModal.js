module.exports = function(i, client) {
  const id = i.customId.split(';')[0];

  const modal = require(`../modals/${id}.js`)
  modal({
    interaction: i,
    client
  })
}