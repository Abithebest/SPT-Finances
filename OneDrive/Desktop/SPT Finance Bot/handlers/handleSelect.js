module.exports = function(i, client) {
  const id = i.customId.split(';')[0];

  const select = require(`../selectmenus/${id}.js`)
  select({
    interaction: i,
    client
  })
}