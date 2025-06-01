module.exports = {
	get: (req, res) => {
		res.sendFile(__dirname + '/site/index.html')
	}
}