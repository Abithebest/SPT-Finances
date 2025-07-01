let { request, verifiedUsers, getObject, formatNum, currency, uppercase, currentDate, db, compare } = require('../utils.js')
let { EmbedBuilder, Embed } = require('discord.js')

let monthNames = [ 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december' ]

module.exports = {
  command: {
    name: 'monthly',
    description: 'Send a monthly report for a given month number.',
    options: [
      {
        name: 'month',
        description: 'Month number or name.',
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

    await interaction.deferReply()

    let month = optionData(params[0])
    if(isNaN(parseInt(month))) {
      month = monthNames.findIndex((a) => a == month.toLowerCase()) + 1;
    } else {
      month = parseInt(month)
    }

    let [uCode, userData] = await request(`v2/company/9559/stats/members?period=monthly&month=${month}&year=${month == 1?currentDate.getFullYear() - 1:currentDate.getFullYear()}`, 'GET')
    let [csCode, companyStats] = await request(`v1/company/9559/stats/monthly?month=${month}&year=${month == 1?currentDate.getFullYear() - 1:currentDate.getFullYear()}`, 'GET')
    let [cdCode, companyData] = await request(`v1/company/9559/stats/eco/monthly?month=${month}&year=${month == 1?currentDate.getFullYear() - 1:currentDate.getFullYear()}`, 'GET')
    let [atsRCode, atsRanking] = await request(`v1/companies/hardcore?perPage=999&game=2&month=${month}&year=${month == 1?currentDate.getFullYear() - 1:currentDate.getFullYear()}`, 'GET')
    let [etsRCode, etsRanking] = await request(`v1/companies/hardcore?perPage=999&game=1&month=${month}&year=${month == 1?currentDate.getFullYear() - 1:currentDate.getFullYear()}`, 'GET')

    if(uCode == 200 && csCode == 200 && cdCode == 200 && atsRCode == 200 && etsRCode == 200) {
      userData = JSON.parse(userData).members;
      companyStats = JSON.parse(companyStats)
      companyData = JSON.parse(companyData)
      atsRanking = getObject(JSON.parse(atsRanking).data, 'id')['9559'];
      etsRanking = getObject(JSON.parse(etsRanking).data, 'id')['9559'];
    } else {
      interaction.editReply({
        content: `API didnt respond. Please try again later. (${uCode})`
      })

      return;
    }

    let rankings = { ats: { points: atsRanking.points, position: atsRanking.position }, ets: { points: etsRanking.points, position: etsRanking.position } }
    let companyDB = await db.collection('Companies').findOne({ ServerId: interaction.guildId })
    if(!companyDB) {
      interaction.editReply('Register your company before using this command.')
      return;
    }

    let compEcon = companyDB.CompanyEconomy || new Object();
    let compRanks = companyDB.Rankings || { ats: {}, ets: {} };

    // Driver Rankings
    let driversRanked = {
      revenue: [0, 'name'],
      mass: [0, 'name'],
      distance: [0, 'name'],
      damage: [0, 'name']
    }

    let driverSetup = [];
    userData.sort((a, b) => (b.driven_distance_km / 1.609) - (a.driven_distance_km / 1.609)).forEach(data => {
      let driverDistance = data.driven_distance_km / 1.609;
      driverSetup.push(`**${data.name}**\n\`${formatNum(driverDistance.toFixed(0))}mi.\` | \`${formatNum(data.cargo_mass_t)}t.\` | \`${formatNum(data.revenue)}${currency}\` | \`${formatNum(data.jobs)}\` | \`${formatNum(data.total_earned)}${currency}\``)

      if(driversRanked.revenue[0] < data.revenue) {
        driversRanked.revenue = [data.revenue, data.name]
      }
      if(driversRanked.mass[0] < data.cargo_mass_t) {
        driversRanked.mass = [data.cargo_mass_t, data.name]
      }
      if(driversRanked.distance[0] < driverDistance) {
        driversRanked.distance = [driverDistance, data.name]
      }
    })

    let rankTrophies = (() => {
      let trophies = {
        realAts: '',
        realEts: '',
        raceAts: '',
        raceEts: '',
        hardcoreAts: '',
        hardcoreEts: ''
      }
      if(companyStats.ets2.leaderbords_position_real_miles < 4) {
        trophies.realEts = '🏆';
      }
      if(companyStats.ats.leaderbords_position_real_miles < 4) {
        trophies.realAts = '🏆';
      }
      if(companyStats.ats.leaderbords_position_race_miles < 4) {
        trophies.raceAts = '🏆';
      }
      if(companyStats.ets2.leaderbords_position_race_miles < 4) {
        trophies.raceEts = '🏆';
      }
      if(rankings.ats.position < 4) {
        trophies.hardcoreAts = '🏆';
      }
      if(rankings.ets.position < 4) {
        trophies.hardcoreEts = '🏆';
      }

      return trophies;
    })();
    console.log(rankTrophies)

    // Message Setup
    let companyRankings = new EmbedBuilder()
    .setTitle(`📊 Trucky Company ${uppercase(monthNames[month-1])} ${(month == 1?currentDate.getFullYear() - 1:currentDate.getFullYear()).toString().replace('20', '\'')}`)
    .addFields(
      {name: ':flag_us: ATS', value: `⠀⠀🛻 **Real Ranking**: \`#${formatNum(companyStats.ats.leaderbords_position_real_miles)}\` ${compare(companyStats.ats.leaderbords_position_real_miles, compRanks.ats.real || 0)} ${rankTrophies.realAts}\n⠀⠀🏎️ **Race Ranking**: \`#${formatNum(companyStats.ats.leaderbords_position_race_miles)}\` ${compare(companyStats.ats.leaderbords_position_race_miles, compRanks.ats.race || 0)} ${rankTrophies.raceAts}\n⠀⠀🚛 **Hardcore Ranking**: \`#${formatNum(rankings.ats.position)}\` ***(${formatNum(rankings.ats.points)}HP)*** ${compare(rankings.ats.position, compRanks.ats.hardcore || 0)} ${rankTrophies.hardcoreAts}`},
      {name: ':flag_gb: ETS', value: `⠀⠀🛻 **Real Ranking**: \`#${formatNum(companyStats.ets2.leaderbords_position_real_miles)}\` ${compare(companyStats.ets2.leaderbords_position_real_miles, compRanks.ets.real || 0)} ${rankTrophies.realEts}\n⠀⠀🏎️ **Race Ranking**: \`${companyStats.ets2.leaderbords_position_race_miles > 0?`#${formatNum(companyStats.ets2.leaderbords_position_race_miles)}`:'N/A'} ${rankTrophies.raceEts}\` ${compare(companyStats.ets2.leaderbords_position_race_miles, compRanks.ets.race || 0)}\n⠀⠀🚛 **Hardcore Ranking**: \`#${formatNum(rankings.ets.position)}\` ***(${formatNum(rankings.ets.points)}HP)*** ${compare(rankings.ets.position, compRanks.ets.hardcore || 0)} ${rankTrophies.hardcoreEts}`}
    )
    .setColor('Green')

    let companyEconomy = new EmbedBuilder()
    .setTitle(`🪙 Company Economy Summary`)
    .setDescription(`💵 **Revenue**: \`${formatNum(companyData.revenue)}${currency}\` ${compare(compEcon.revenue || 0, companyData.revenue)}\n💸 **Taxes**: \`${formatNum(companyData.taxes)}${currency}\` ${compare(compEcon.taxes || 0, companyData.taxes)}\n🚚 **Rent Costs**: \`${formatNum(companyData.rent_cost)}${currency}\` ${compare(compEcon.rent || 0, companyData.rent_cost)}\n⛽ **Fuel Costs**: \`${formatNum(companyData.fuel_cost)}${currency} (${formatNum(companyData.fuel_used)}gal.)\` ${compare(compEcon.fuel || 0, companyData.fuel_cost)}\n👷 **Jobs**: \`${formatNum(companyData.jobs)}\` ${compare(compEcon.jobs || 0, companyData.jobs)}\n💥 **Damage Costs**: \`${formatNum(companyData.damage_cost)}${currency}\` ${compare(compEcon.damage || 0, companyData.damage_cost)}\n⚖️ **Mass Transported**: \`${formatNum(companyData.cargo_mass)}lb.\` ${compare(compEcon.mass || 0, companyData.cargo_mass)}`)
    .setColor('Green')

    let companyHighlights = new EmbedBuilder()
    .setTitle(`💡 Company Highlights`)
    .setDescription(`:flag_us: **ATS Total Miles**: \`${formatNum((companyStats.ats.total_km / 1.609).toFixed(0))}mi.\`\n:flag_gb: **ETS Total Kilometers**: \`${formatNum(companyStats.ets2.total_km)}km.\`\n💰 **Most Earned Revenue**: \`${formatNum(driversRanked.revenue[0])}${currency}\` *(${driversRanked.revenue[1]})*\n🚚 **Most Transported**: \`${formatNum(driversRanked.mass[0])}t.\` *(${driversRanked.mass[1]})*\n🚛 **Most Distance**: \`${formatNum(driversRanked.distance[0].toFixed(0))}mi.\` *(${driversRanked.distance[1]})*`)
    .setFooter({ text: 'Company Highlights are for ALL Mile Types' })
    .setColor('Green')

    let companyDrivers = new EmbedBuilder()
    .setTitle('👷‍♂️ Trucky Driver Stats')
    .setDescription('`Distance | Weight | Revenue | Jobs | Earnings`\n\n' + driverSetup.join('\n\n'))
    .setColor('Green')

    await db.collection('Companies').updateOne({ ServerId: interaction.guildId }, {
      $set: {
        CompanyEconomy: {
          revenue: companyData.revenue,
          taxes: companyData.taxes,
          rent: companyData.rent_cost,
          fuel: companyData.fuel_cost,
          jobs: companyData.jobs,
          damage: companyData.damage_cost,
          mass: companyData.cargo_mass
        },
        Rankings: {
          ats: {
            real: companyStats.ats.leaderbords_position_real_miles,
            race: companyStats.ats.leaderbords_position_race_miles,
            hardcore: rankings.ats.position
          },
          ets: {
            real: companyStats.ets2.leaderbords_position_real_miles,
            race: companyStats.ets2.leaderbords_position_race_miles,
            hardcore: rankings.ets.position
          }
        }
      }
    })

    interaction.editReply({
			embeds: [companyRankings, companyEconomy, companyHighlights, companyDrivers]
		})
  }
}