/** @param {NS} ns **/
export async function main(ns) {
	const HOME_NAME = "home";
	function run(fileName, numThreads = 1, ...args){
		if (ns.isRunning(fileName, HOME_NAME, ...args)) {
			ns.kill(fileName, HOME_NAME, ...args);
		}
		ns.tprint(fileName + " is run.");
		return ns.run(fileName, numThreads, ...args);
	}

	run("/src/management.js");
	run("/src/hacknet.js");
	run("/src/GA_management.js");
	// run("/src/GA_management.js", 1, "money");
}