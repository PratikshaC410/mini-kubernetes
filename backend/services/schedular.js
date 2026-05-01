const { node_db } = require("../database");

const schedulePodLeastLoaded = async () => {
  try {
    //  Get  healthy nodes from  node_db
    const goodNodes = await node_db.find({ status: "Ready" });

    if (goodNodes.length === 0) {
      console.error("[SCHEDULER] No Ready nodes found in node_db!");
      return "unscheduled";
    }

    //  Sort by podCount (Least Loaded first)
    const sortedNodes = goodNodes.sort((a, b) => {
      if (a.podCount < b.podCount) {
        return -1; // Move a to the front
      } else if (a.podCount > b.podCount) {
        return 1; // Move b to the front
      } else {
        return 0;
      }
    });

    const bestNode = sortedNodes[0].name; //fetch the name of the first node in the list ie the node with least laod
    console.log(`[SCHEDULER] Matching Pod -> ${bestNode}`);
    return bestNode;
  } catch (err) {
    console.error("[SCHEDULER] Error:", err.message);
    return "mini-k8s-cluster"; // this is by default if nothing is found then return the default node
  }
};

module.exports = { schedulePodLeastLoaded };
