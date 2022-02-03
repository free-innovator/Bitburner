/** @param {NS} ns **/
export async function main(ns) {
	const HOST_NAME = ns.args[0]? ns.args[0] : ns.getHostname();	
	while (true) {
		await ns.hack(HOST_NAME);
		// await ns.grow(HOST_NAME);
		// await ns.weaken(HOST_NAME);
	}
}