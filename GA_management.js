/** @param {NS} ns **/
export async function main(ns) {
	const isCommand = ns.args[0]? ns.args[0] : null;

	function GangManager(){
		throw new Error("This is static class.");
	}
	GangManager.PLAYER_NAME = "player";
	GangManager.playerNumber = 1;

	GangManager._callMemberAll = async function(callback){ // argument. name, info
		const names = ns.gang.getMemberNames();
		const len = names.length;
		for(let i=0; i<len; i++){
			callback(names[i], ns.gang.getMemberInformation(names[i]));
		}
	}
	GangManager.isNeedClash = function(){
		const gangInfo = ns.gang.getGangInformation();
		return gangInfo.territory < 0.5;
	}
	GangManager.recruit = async function(){
		if(ns.gang.canRecruitMember()){
			while(ns.gang.recruitMember(GangManager.PLAYER_NAME + GangManager.playerNumber++)) await ns.sleep(30);
		}
	};
	GangManager.equipment = function(){
		const LIMIT_MONEY = ns.getServerMoneyAvailable("home") * 0.001;
		GangManager._callMemberAll((name, info) => {
			// if(info.hack < 200) return;

			const equipmentNames = ns.gang.getEquipmentNames();
			const len = equipmentNames.length;

			for(let i=0; i<len; i++){
				const eName = equipmentNames[i];
				switch(eName){
					case "NUKE Rootkit":
					case "Soulstealer Rootkit":
					case "Demon Rootkit":
					case "Hmap Node":
					case "Jack the Ripper":
						if(ns.gang.getEquipmentCost(eName) < LIMIT_MONEY * 50){
							ns.gang.purchaseEquipment(name, eName);
						}
					break;
					default:
						if(ns.gang.getEquipmentCost(eName) < LIMIT_MONEY){
							ns.gang.purchaseEquipment(name, eName);
						}
					break;
				}
			}			
		});
	}
	GangManager.ascension = async function(){
		/*
			respect, hack, str, def, dex, agi, cha
		*/
		GangManager._callMemberAll((name) => {
			const result = ns.gang.getAscensionResult(name);
			
			if(result.hack > 2){
				ns.gang.ascendMember(name);
			}
		});
	};
	GangManager.task = async function(){
		/*
			[
				"Unassigned", "Ransomware", "Phishing", "Identity Theft", "DDoS Attacks",
				"Plant Virus", "Fraud & Counterfeiting", "Money Laundering", "Cyberterrorism",
				"Ethical Hacking", "Vigilante Justice", "Train Combat", "Train Hacking", "Train Charisma",
				"Territory Warfare"
			]
		*/
		let isChangeTask = false;

		const gangInfo = ns.gang.getGangInformation();
		const lastHacknetLevel = ns.hacknet.getNodeStats(ns.hacknet.numNodes() - 1).level;
		GangManager._callMemberAll((name, info) => {		
			let taskName = gangInfo.isHacking? "Train Hacking" : "Train Combat";

			if(info.hack > 1000){
				switch(isCommand){
					case "money":
						taskName = "Money Laundering";
						break;
					default:
						if(lastHacknetLevel < 200){
							taskName = "Money Laundering";
						}else if(info.hack > 4000 && GangManager.isNeedClash()){
							taskName = "Territory Warfare";
						}else if(gangInfo.wantedPenalty < 0.9){
							taskName = "Vigilante Justice";
						}else{
							taskName = "Cyberterrorism";
						}
						break;
				}
			}

			if(info.task !== taskName){
				ns.gang.setMemberTask(name, taskName);
				isChangeTask = true;
			}
		});

		if(isChangeTask) await ns.sleep(10000);
	};
	GangManager.clash = async function(){
		if(!GangManager.isNeedClash()){
			ns.gang.setTerritoryWarfare(false);
		}else if(!ns.gang.getGangInformation().territoryWarfareEngaged){
			const otherGangNames = Object.keys(
			ns.gang.getOtherGangInformation()).filter(x => x !== ns.gang.getGangInformation().faction);

			const len = otherGangNames.length;
			let minChance = 1;
			for(let i=0; i<len; i++){
				const chance = ns.gang.getChanceToWinClash(otherGangNames[i]);
				if(chance < minChance){
					minChance = chance;
				}
			}

			if(minChance > 0.6){
				ns.gang.setTerritoryWarfare(true);
			}
		}
	};
	GangManager.idle = async function(){
		while(true){
			await GangManager.recruit();
			await GangManager.equipment();
			await GangManager.ascension();
			await GangManager.task();
			await GangManager.clash();
			await ns.sleep(200);
		}
	};

	await GangManager.idle();
}