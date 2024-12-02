let { request, verifiedUsers, isDateInRange, getObject, formatNum, currency, uppercase } = require('../utils.js')
let { EmbedBuilder } = require('discord.js')
let specialGarages = [
  22662,
  9706,
  13060,
  16521,
  22263
];

async function getGarage(data) {
	let [gCode, companyGarages] = await request('company/9559/garages', 'GET')

	if(gCode == 200) {
		companyGarages = JSON.parse(companyGarages)

		let garageById = getObject(companyGarages, '_id')
		let garageByName = new Object()
		await companyGarages.map(gData => {
			garageByName[gData.city.name.toLowerCase()] = gData;
		})

		if(garageById[data]) {
			return garageById[data];
		}
		if(garageByName[data.toLowerCase()]) {
			return garageByName[data.toLowerCase()];
		}
	} else {
		return false;
	}
}

module.exports = {
	command: {
		name: 'garage',
		description: 'Send a garage report for a given date.',
		options: [
			{
				name: 'query',
				description: 'Garage ID or name.',
				type: 3,
				required: true,
				autocomplete: true
			},
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

		await interaction.deferReply()

		let garage = await getGarage(optionData(params[0]))
		if(!garage) {
			interaction.editReply('Couldnt find garage.')
			return;
		}

		let garageId = garage.id;
		let dateFrom = new Date(optionData(params[1]));
		let dateTo = new Date(optionData(params[2]));

		let fromSplit = optionData(params[1]).split('-')
		let toSplit = optionData(params[2]).split('-')
		let formattedWeek = `${fromSplit[0]}/${fromSplit[1]}-${toSplit[0]}/${toSplit[1]}`;

		dateFrom.setDate(dateFrom.getDate() + 1)
		dateFrom.setUTCHours(0,0,0,0)
		dateTo.setUTCHours(23,59,59,59)
		dateTo.setDate(dateTo.getDate() + 1)

		let dateFromMonth = dateFrom.getMonth() + 1;
		let dateFromDay = dateFrom.getDate() + 1 < 10? `0${dateFrom.getDate() + 1}`:dateFrom.getDate() + 1;
		let dateFromFormatted = `${dateFrom.getFullYear()}-${dateFromMonth<10?'0':''}${dateFromMonth}-${dateFromDay}T00:00:00Z`;

		let dateToMonth = dateTo.getMonth() + 1;
		let dateToDay = dateTo.getDate() < 10? `0${dateTo.getDate()}`:dateTo.getDate();
		let dateToFormatted = `${dateTo.getFullYear()}-${dateToMonth<10?'0':''}${dateToMonth}-${dateToDay}T23:59:59Z`;

		let [mtCode, maintenance] = await request('company/9559/maintenances?perPage=99999', 'GET')
		let [mcCode, mechanics] = await request(`company/9559/garage/${garageId}/mechanics`, 'GET')
		let [vhCode, vehicles] = await request(`company/9559/garage/${garageId}/vehicles`, 'GET')
		let [drCode, companyDrivers] = await request(`company/9559/members?perPage=9999`, 'GET')
		let [jobCode, jobs] = await request(`company/9559/jobs?perPage=9999&dateFrom=${dateFromFormatted}&dateTo=${dateToFormatted}&status=completed`, 'GET')
		let drivers = new Object()

		if(mtCode == 200) maintenance = JSON.parse(maintenance).data;
		if(mcCode == 200) mechanics = JSON.parse(mechanics);
		if(vhCode == 200) vehicles = JSON.parse(vehicles);
		if(jobCode == 200) jobs = JSON.parse(jobs).data;
		if(drCode == 200) companyDrivers = getObject(JSON.parse(companyDrivers).data, 'id');

		let earnings = 0;
		let gFuelCost = 0;
		let gFuelUsed = 0;
		for(let i=0;i<Object.keys(companyDrivers).length;i++) {
			let driverId = Object.keys(companyDrivers)[i];
			let driver = companyDrivers[driverId];
			let driverSalary = 3 + companyDrivers[driverId].role.additional_member_salary;
			let driverJobs = jobs.filter(jData => jData.driver.id == driverId)

			for(let i2=0;i2<driverJobs.length;i2++) {
				let job = driverJobs[i2];
				gFuelCost += job.fuel_cost;
				gFuelUsed += job.fuel_used;

				if(drivers[driverId]) {
					if(drivers[driverId].salary) {
						drivers[driverId].salary += job.driven_distance_km * driverSalary;
					} else {
						drivers[driverId].salary = job.driven_distance_km * driverSalary;
					}
				} else {
					drivers[driverId] = { driver, salary: job.driven_distance_km * driverSalary, expenses: [] };
				}
			}

			if(!specialGarages.includes[garageId]) {
				earnings += drivers[driverId] ? drivers[driverId].salary:0;
			}
		}

		let mtInDate = maintenance.filter((mData) => {
      let date = new Date(mData.created_at)
			if(!mData || !mData.vehicle) return;

			let filteredVehicles = vehicles.filter(vData => vData.id == mData.vehicle.id && vData.garage_id == garageId)
			let driver = filteredVehicles[0] ? filteredVehicles[0].driver:{};

      if(
        (isDateInRange(date, dateFrom, dateTo))
      ) {
				if(!drivers[mData.vehicle.assigned_to_user_id]) {
					drivers[mData.vehicle.assigned_to_user_id] = { driver, salary: 0, expenses: [ { type: 'maintenance', data: mData } ] }
				} else {
					drivers[mData.vehicle.assigned_to_user_id].expenses.push({
						type: 'maintenance',
						data: mData
					})
				}

				if(specialGarages.includes(garageId)) {
					earnings += mData.price;
				}

        return true;
      }
    })
    let vhInDate = vehicles.filter((tData) => {
			if(tData.deleted_at) return false;
      let date = new Date(tData.created_at)
			let driver = tData.driver;

      if(
        (isDateInRange(date, dateFrom, dateTo))
      ) {
				if(!drivers[driver.id]) {
					drivers[driver.id] = { driver, salary: 0, expenses: [ { type: 'truck', data: tData } ] }
				} else {
					drivers[driver.id].expenses.push({
						type: 'truck',
						data: tData
					})
				}

				if(specialGarages.includes(garageId)) {
					earnings += tData.price;
				}

        return true;
      }
    })

		let gdriverIds = new Array()
		vehicles.map(vData => { 
			if(!gdriverIds.includes(vData.driver.id)) {
				gdriverIds.push(vData.driver.id)
			}
		})

		let mechanicSalaries = 0;
		for(let i=0;i<mechanics.length;i++) {
			let mechanic = mechanics[i];
			mechanicSalaries += mechanic.weekly_salary;
			earnings -= mechanic.weekly_salary;
		}

		let description = `🗓️ \`${dateTo.getMonth() + 1}/${dateTo.getDate() + 1 < 10? `0${dateTo.getDate() + 1}`:dateTo.getDate() + 1}/${dateTo.getFullYear()-2000}\`\n🏪 **${garage.city.name} Office Expenses ${formattedWeek}**`;
		let formattedDrivers = new Array()
		gdriverIds.map(driverId => {
			if(!drivers[driverId]) return;
			let driverData = drivers[driverId];
			let driver = driverData.driver;
			let salary = driverData.salary;
			let expenses = driverData.expenses;
			let driverExpenseCost = 0;
			
			let formattedExpenses = new Array()
			expenses.map(eData => {
				let data = eData.data;

				if(eData.type == 'truck') {
					let truckModel = data.model.full_name;
					if(truckModel == 'Generic Modded Truck for ATS' || truckModel == 'Generic Modded Truck for ETS2') {
						truckModel = 'Modded Truck';
					}

					driverExpenseCost += data.price * .50;
					earnings -= data.price * .50;

					const paidOff = driverExpenseCost<salary?'💵':'💳';
					formattedExpenses.push(`⠀⠀🚛 #${data.id} ${truckModel} \`-${formatNum((data.price * .50).toFixed(0))}${currency}\` ${!specialGarages.includes(garageId)?paidOff:''}`)
				}
				if(eData.type == 'maintenance') {
					earnings -= data.price * .50;

					formattedExpenses.push(`⠀⠀🧰 ${uppercase(data.type)} Maintenance for ${data.vehicle.model.name} \`-${formatNum(data.price.toFixed(0))}${currency}\``)
				}
			})

			let driverExpenses = '⠀⠀_No expenses recorded..._';
			if(formattedExpenses.length > 0) {
				driverExpenses = formattedExpenses.join('\n');
			}

			formattedDrivers.push(`👷‍♂️ **[${driver.name}](https://hub.truckyapp.com/user/${driver.id})**${!specialGarages.includes(garageId)?` | ***Check Amount*** \`${formatNum(salary.toFixed(0))}${currency}\``:''}\n${driverExpenses}`)
		})

		if(formattedDrivers.length > 0) {
			description += `\n\n${formattedDrivers.join('\n')}`;
		} else {
			if(!specialGarages.includes(garageId)) {
				description += '\n⠀⠀_No driver salaries recorded..._';
			} else {
				description += '\n⠀⠀_No driver expenses recorded..._';
			}
		}

		if(!specialGarages.includes(garageId)) {
			description += `\n\n**💵 General Expenses**\n⠀⠀🧑‍🔧 Mechanic Salaries \`-${mechanicSalaries}${currency}\`\n⠀⠀⛽ Fuel Cost \`${formatNum(gFuelCost.toFixed(0))}${currency} (${formatNum(gFuelUsed.toFixed(0))}gl.)\``;
		} else {
			description += `\n\n🧑‍🔧 Mechanic Salaries \`-${mechanicSalaries}${currency}\`\n⛽ Fuel Cost \`${formatNum(gFuelCost.toFixed(0))}${currency} (${formatNum(gFuelUsed.toFixed(0))} g.)\``;
		}
 
		let GarageEmbed = new EmbedBuilder()
			.setDescription(description)
			.setColor('Random')
			.setFooter({ text: `${formatNum(earnings.toFixed(0))}${currency} after expenses. ${earnings >= 0?'💵':'💳'}` })

		interaction.editReply({
			embeds: [GarageEmbed]
		})
	}
}