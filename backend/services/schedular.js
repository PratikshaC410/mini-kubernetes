const { node_db } = require("../database");

const schedulePodLeastLoaded = async () => {
  try {
    // 1. Get only healthy nodes from our new node_db
    const healthyNodes = await node_db.find({ status: "Ready" });

    if (healthyNodes.length === 0) {
      console.error("[SCHEDULER] No Ready nodes found in node_db!");
      return "unscheduled";
    }

    // 2. Sort by podCount (Least Loaded first)
    const sortedNodes = healthyNodes.sort((a, b) => a.podCount - b.podCount);

    const bestNode = sortedNodes[0].name;
    console.log(`[SCHEDULER] Matchmaking: Pod -> ${bestNode}`);
    return bestNode;
  } catch (err) {
    console.error("[SCHEDULER] Error:", err.message);
    return "mini-k8s-cluster";
  }
};

module.exports = { schedulePodLeastLoaded };
