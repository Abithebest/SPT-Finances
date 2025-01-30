let { formatNum, verifiedUsers, request, getRole, currency, splitArray, db, getObject, compare, isDateInRange } = require('../utils.js')
let { EmbedBuilder } = require('discord.js')

module.exports = {
  command: {
		name: 'company',
		description: 'Send a company report for given date.',
		options: [
			{
				name: 'from',
				description: 'Start from this day. MM-DD-YYYY',
				type: 3,
				required: true,
				autocomplete: true
			},
			{
				name: 'to',
				description: 'End on this day. MM-DD-YYYY',
				type: 3,
				required: true,
				autocomplete: true
			}
		]
	},
	func: async function({ interaction, params, optionData }) {
    if(!verifiedUsers.includes(interaction.user.id)) {
      interaction.reply({
        ephemeral: true,
        content: 'Sorry, this command isnt able to be used by you.'
      })
      return;
    }

    interaction.deferReply()

    let dateFrom = new Date(optionData(params[0]));
		let dateTo = new Date(optionData(params[1]));

		let fromSplit = optionData(params[0]).split('-')
		let toSplit = optionData(params[1]).split('-')
		let formattedWeek = `${fromSplit[0]}/${fromSplit[1]}-${toSplit[0]}/${toSplit[1]}`;

		dateFrom.setUTCHours(0,0,0,0)
		dateTo.setUTCHours(23,59,59,59)
    dateFrom.setDate(dateFrom.getDate() + 1)
		dateTo.setDate(dateTo.getDate() + 1)

		let dateFromMonth = dateFrom.getMonth() + 1;
		let dateFromDay = dateFrom.getDate() < 10? `0${dateFrom.getDate()}`:dateFrom.getDate();
		let dateFromFormatted = `${dateFrom.getFullYear()}-${dateFromMonth<10?'0':''}${dateFromMonth}-${dateFromDay}T00:00:00Z`;

		let dateToMonth = dateTo.getMonth() + 1;
		let dateToDay = dateTo.getDate() < 10? `0${dateTo.getDate()}`:dateTo.getDate();
		let dateToFormatted = `${dateTo.getFullYear()}-${dateToMonth<10?'0':''}${dateToMonth}-${dateToDay}T23:59:59Z`;

		let [drCode, companyDrivers] = await request(`company/9559/members?perPage=9999`, 'GET')
		let [jobCode, jobs] = await request(`company/9559/jobs?perPage=9999&dateFrom=${dateFromFormatted}&dateTo=${dateToFormatted}&status=completed`, 'GET')
    //let [vtlCode, vtlJobs] = await request(`https://api.vtlog.net/v1/vtc/5636/jobs?limit=9999`, 'GET')

		if(jobCode == 200) jobs = JSON.parse(jobs).data.filter(jData => isDateInRange(jData.updated_at, dateFrom, dateTo))
		if(drCode == 200) companyDrivers = getObject(JSON.parse(companyDrivers).data, 'id');
    //if(vtlCode == 200) vtlJobs = JSON.parse(vtlJobs).data;

    let companyData = await db.collection('Companies').findOne({ ServerId: interaction.guildId })
    if(!companyData) {
      interaction.editReply('Register your company before using this command.')
      return;
    }

    let statistics = {
      "garageExpenses": 0,
      "driverSalaries": 0,
      "realMileIncome": 0,
      "totalDamages": 0,
      "totalFines": 0,
      "totalRentals": 0,
      "fuelUsed": 0,
      "fuelCost": 0,
      "realMileRevenue": 0,
      "hardcorePoints": 0,
      "hardcoreJobs": 0,
      "raceMiles": 0
    }
    let driverData = new Object()
    let rankings = companyData.Finances || new Object();

    jobs.map(jobData => {
      statistics.totalDamages += jobData.damage_cost || 0;
      statistics.totalRentals += jobData.rent_cost_total || 0;
      statistics.fuelUsed += jobData.fuel_used || 0;
      statistics.fuelCost += jobData.fuel_cost || 0;
      if(jobData.stats_type == 'real_miles') {
        statistics.realMileIncome += jobData.income || 0;
        statistics.realMileRevenue += jobData.revenue || 0;
      } else {
        statistics.raceMiles += jobData.driven_distance_km || 0;
      }
      if(jobData.realistic_ldb_points != null) {
        statistics.hardcorePoints += jobData.realistic_ldb_points || 0;
        statistics.hardcoreJobs++;
      }

      let fines = JSON.parse(jobData.fines_details || "[]");
      if(fines.length > 0) {
        fines.forEach((fData) => {
          statistics.totalFines += fData.amount;
        })
      }

      let driver = companyDrivers[jobData.driver.id];
      if(!driver) return;
      if(!driverData[driver.id]) {
        driverData[driver.id] = {
          salary: 3 + driver.role.additional_member_salary,
          revenue: (3 + driver.role.additional_member_salary) * jobData.driven_distance_km,
          distance: jobData.driven_distance_km,
          driver
        }
      } else {
        driverData[driver.id].revenue += (3 + driver.role.additional_member_salary) * jobData.driven_distance_km;
        driverData[driver.id].distance += jobData.driven_distance_km;
      }

      statistics.driverSalaries += (3 + driver.role.additional_member_salary) * jobData.driven_distance_km;
    })

    const sortedDrivers = Object.entries(driverData).sort(([, a], [, b]) => b.revenue - a.revenue)

    let formattedMembers = new Array();
    for(const [driverId, driver] of sortedDrivers) {
      let driverData = companyDrivers[driverId];
      let role = getRole(driverData.role)

      formattedMembers.push(`🗓️ \`${dateTo.getMonth() + 1}/${dateTo.getDate() < 10? `0${dateTo.getDate()}`:dateTo.getDate()}/${dateTo.getFullYear()-2000}\`\n🤵 **[${driverData.name} ${role.emojis}](https://hub.truckyapp.com/user/${driverData.id})**\n💼 **${role.name}** \`${driver.salary}${currency} /km\`\n💰 ***Check Amount*** \`${formatNum(driver.revenue.toFixed(0))}${currency}\`\n🚛 \`${formatNum(driver.distance.toFixed(0))}km\``);
    }

    let statValues = {}
    Object.keys(statistics).map(sData => {
      switch(sData) {
        case 'realMileIncome':
          statValues[sData] = `💰 **Real Mile Income** \`+${formatNum(statistics['realMileIncome'].toFixed(0))}${currency}\` ${compare(rankings.realMileIncome || 0, statistics.realMileIncome)}`;
          return;
        case 'realMileRevenue':
          statValues[sData] = `💵 **Real Mile Revenue** \`+${formatNum(statistics['realMileRevenue'].toFixed(0))}${currency}\` ${compare(rankings.realMileRevenue || 0, statistics.realMileRevenue)}`;
          return;
        case 'totalDamages':
          statValues[sData] = `💢 **Total Damages** \`-${formatNum(statistics['totalDamages'].toFixed(0))}${currency}\` ${compare(rankings.totalDamages || 0, statistics.totalDamages)}`;
          return;
        case 'totalFines':
          statValues[sData] = `🎫 **Total Fines** \`-${formatNum(statistics['totalFines'].toFixed(0))}${currency}\` ${compare(rankings.totalFines || 0, statistics.totalFines)}`;
          return;
        case 'totalRentals':
          statValues[sData] = `🚛 **Total Rentals** \`-${formatNum(statistics['totalRentals'].toFixed(0))}${currency}\` ${compare(rankings.totalRentals || 0, statistics.totalRentals)}`;
          return;
        case 'fuelUsed':
          statValues[sData] = `⛽ **Fuel Used** \`-${formatNum(statistics['fuelCost'].toFixed(0))}${currency} (${formatNum(statistics.fuelUsed.toFixed(1))}gl.)\` ${compare(rankings.fuelCost || 0, statistics.fuelCost)}`;
          return;
        case 'hardcorePoints':
          statValues[sData] = `🎰 **Hardcore Points** \`${formatNum(statistics['hardcorePoints'].toFixed(0))} (${formatNum(statistics.hardcoreJobs)} Jobs)\` ${compare(rankings.hardcorePoints || 0, statistics.hardcorePoints)}`;
          return;
        case 'garageExpenses':
          statValues[sData] = `🏗️ **Total Garage Expenses** \`-${formatNum(statistics.garageExpenses.toFixed(0))}${currency}\` ${compare(rankings.garageExpenses || 0, statistics.garageExpenses)}`;
          return;
        case 'hardcoreJobs':
          statValues['profits'] = `🏦 **Estimated Profits** \`+${formatNum((statistics.realMileRevenue - (statistics.driverSalaries + statistics.garageExpenses)).toFixed(0))}${currency}\` ${compare(rankings.realMileRevenue - (rankings.driverSalaries + rankings.garageExpenses), (statistics.realMileRevenue - (statistics.driverSalaries + statistics.garageExpenses)))}`;
          return;
        case 'driverSalaries':
          statValues['salaries'] = `🤵 **Driver Salaries** \`-${formatNum(statistics.driverSalaries.toFixed(0))}${currency}\` ${compare(rankings.driverSalaries || 0, statistics.driverSalaries)}`;
          break;
        case 'raceMiles':
          statValues['raceMiles'] = `🏁 **Race Miles** \`${formatNum(statistics.raceMiles.toFixed(0))}km\` ${compare(rankings.raceMiles || 0, statistics.raceMiles)}`;
          break;
      }
    })

    await db.collection('Companies').updateOne({ ServerId: interaction.guildId }, {
      $set: {
        Finances: statistics
      }
    })

    let embedArrays = new Array()
    let splitArrays = splitArray(formattedMembers)

    splitArrays.forEach((data, index) => {
      let PayrollEmbed = new EmbedBuilder()
        .setDescription(data.join('\n\n'))
        .setColor('Green')
      
      if(index == 0) {
        PayrollEmbed.setTitle('💵 Driver Payroll')
      }

      embedArrays.push(PayrollEmbed)
    })

    let CompanyEmbed = new EmbedBuilder()
      .setTitle('🏢 Company Weekly Statistics')
      .setDescription(
        `***Base Salary is 3 T¢ per km +Rank Bonus  +Achievement Bonus***\n\n${statValues['realMileIncome']}\n${statValues['totalDamages']}\n${statValues['totalFines']}\n${statValues['totalRentals']}\n${statValues['fuelUsed']}\n${statValues['realMileRevenue']}\n${statValues['salaries']}\n${statValues['profits']}\n${statValues['raceMiles']}\n${statValues['hardcorePoints']}`
      )
      .setColor('Random')

    embedArrays.unshift(CompanyEmbed)

    interaction.editReply({
      content: `💵 Trucky Payroll & Expenses **${formattedWeek}**`,
      embeds: embedArrays
    })
  }
}