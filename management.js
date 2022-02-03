export async function main(ns) {
	function ServerManager(){
		this.initialize.apply(this, arguments);
	}
	ServerManager.HOME_NAME = "home";
	ServerManager.FILE_NAME = "main.js";
	ServerManager.SLEEP_TIME = 1000 * 60; // ms
	ServerManager.NEED_HOME_RAM = 100; // GB
	ServerManager.MAX_DEPTH = 30;

	ServerManager.prototype.initialize = function(){
		this.hackingTool = [];
		this.serverList = this.getServerList();
		this.notNukedServerList = [];
		this.maxProduct = 0;
		this.maxProductServerName = ServerManager.HOME_NAME;
	};
	ServerManager.prototype.init = async function(){
		// don't change order.
		await this.setupHackingTool();
		await this.nukeAll();
		await this.processAll();
	};
	
	ServerManager.prototype.calcBestProduct = function(){
		this.maxProduct = 0;
		this.maxProductServerName = ServerManager.HOME_NAME;

		const len = this.serverList.length;
		for(let i=0; i<len; i++){
			const serverName = this.serverList[i];
			if(ns.hasRootAccess(serverName)){
				const product = this.getProductEfficiency(this.serverList[i]);
				if(product > this.maxProduct){
					this.maxProductServerName = serverName;
					this.maxProduct = product;
				}
			}
		}
		this.printMaxProductServerInfo();
	};
	ServerManager.prototype.getProductEfficiency = function(serverName){
		return ns.hackAnalyze(serverName)
				* ns.hackAnalyzeChance(serverName)
				* ns.getServerMoneyAvailable(serverName)
				/ ns.getHackTime(serverName);
	};

	ServerManager.prototype.setupHackingTool = function(){
		const lsData = ns.ls(ServerManager.HOME_NAME);

		let hackingTool = [];
		if (lsData.indexOf("BruteSSH.exe") >= 0) hackingTool.push(ns.brutessh);
		if (lsData.indexOf("FTPCrack.exe") >= 0) hackingTool.push(ns.ftpcrack);
		if (lsData.indexOf("relaySMTP.exe") >= 0) hackingTool.push(ns.relaysmtp);
		if (lsData.indexOf("HTTPWorm.exe") >= 0) hackingTool.push(ns.httpworm);
		if (lsData.indexOf("SQLInject.exe") >= 0) hackingTool.push(ns.sqlinject);

		this.hackingTool = hackingTool;
	};
	ServerManager.prototype.printMaxProductServerInfo = function(){
		const pServerName = this.maxProductServerName;
		const product = (ns.getServerMoneyAvailable(pServerName) * ns.hackAnalyze(pServerName)).toFixed(1);
		const chance = (ns.hackAnalyzeChance(pServerName) * 100).toFixed(1);
		const time = (ns.getHackTime(pServerName) / 1000).toFixed(1);
		ns.tprint(`${pServerName}: ${product}(${chance}%, ${time}s)`);
	};
	
	ServerManager.prototype.nuke = async function(serverName){
		if (ns.hasRootAccess(serverName)) return true;
		if (ns.getServerNumPortsRequired(serverName) > this.hackingTool.length) return false;

		const len = this.hackingTool.length;
		for (let i = 0; i < len; i++) {
			await this.hackingTool[i](serverName);
		}
		await ns.nuke(serverName);

		if (!ns.hasRootAccess(serverName)) {
			return false;
		}else{
			ns.tprint("==============================");
			ns.tprint(serverName + " is nuked.");
			return true;
		}
	};
	ServerManager.prototype.nukeAll = async function(){
		this.notNukedServerList = [];

		const len = this.serverList.length;
		for(let i=0; i<len; i++){
			if(!await this.nuke(this.serverList[i])){
				this.notNukedServerList.push(this.serverList[i]);
			}
		}
	}

	ServerManager.prototype.copy = async function(serverName){
		await ns.scp(ServerManager.FILE_NAME, serverName);
	};
	ServerManager.prototype.exec = async function(serverName){
		if (serverName === null) return;
		if (!ns.hasRootAccess(serverName)) return;

		if (ns.isRunning(ServerManager.FILE_NAME, serverName)) {
			ns.kill(ServerManager.FILE_NAME, serverName);
		}

		const availableRam = ns.getServerMaxRam(serverName) - ns.getServerUsedRam(serverName);
		const scriptRam = ns.getScriptRam(ServerManager.FILE_NAME, serverName);
		let maxThreadCnt = Math.floor(availableRam / scriptRam);

		if(serverName === ServerManager.HOME_NAME){
			maxThreadCnt -= Math.ceil(ServerManager.NEED_HOME_RAM / scriptRam);
		}

		if(maxThreadCnt > 0){
			ns.exec(ServerManager.FILE_NAME, serverName, maxThreadCnt, this.maxProductServerName);
		}
	};
	ServerManager.prototype.getServerList = function(){
		const serverList = [ServerManager.HOME_NAME];
		function _srch(host, depth) {
			if (depth >= ServerManager.MAX_DEPTH) return;

			const scanList = ns.scan(host);
			for (let i = 0; i < scanList.length; i++) {
				if (serverList.indexOf(scanList[i]) < 0) {
					serverList.push(scanList[i]);
					_srch(scanList[i], depth + 1);
				}
			}
		}
		_srch(ServerManager.HOME_NAME, 1);

		// serverList.shift();
		return serverList;
	};

	ServerManager.prototype.isNeedInitialize = function(){
		return ns.getServerMoneyAvailable(this.maxProductServerName) < 100000;
	};
	ServerManager.prototype.processAll = async function(){
		this.calcBestProduct();

		const len = this.serverList.length;
		for(let i=0; i<len; i++){
			const serverName = this.serverList[i];
			if(ns.hasRootAccess(serverName)){
				await this.copy(serverName);
				await this.exec(serverName);
			}
		}
	};

	ServerManager.prototype.idle = async function()
	{
		await this.init();
		while(this.maxProductServerName !== ServerManager.HOME_NAME){
			if(this.isNeedInitialize()){
				await this.init();
			}else{
				let needFilter = false;
				const len = this.notNukedServerList.length;
				for(let i=0; i<len; i++){
					const server = this.notNukedServerList[i];
					if(await this.nuke(server)){
						await this.processAll();

						this.notNukedServerList[i] = null;
						needFilter = true;
					}
				}
				if(needFilter){
					this.notNukedServerList = this.notNukedServerList.filter(x => x !== null);
					needFilter = false;
				}
			}

			await ns.sleep(ServerManager.SLEEP_TIME);
		}
		ns.tprint("Finish management.");
	}

	const serverManger = new ServerManager();
	await serverManger.idle();
}