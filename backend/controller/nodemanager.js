const { node_db, pod_db } = require("./database");
const { getNodes } = require("../services/k8sServices");

const syncNodeHealth = async () => {
  try {
    const actualNodes = await getNodes();

    for (const node of actualNodes) {
      // Count how many pods are currently on this node in our DB
      const currentPodCount = await pod_db.countDocuments({
        nodeId: node.name,
      });

      await node_db.findOneAndUpdate(
        { name: node.name },
        {
          status: node.status,
          cpu: node.cpu,
          memory: node.memory,
          podCount: currentPodCount,
          role: node.name.includes("-m0") ? "worker" : "control-plane",
        },
        { upsert: true },
      );
    }
    console.log(`[NODE MANAGER] Synced ${actualNodes.length} nodes.`);
  } catch (err) {
    console.error("Node Sync Error:", err.message);
  }
};

module.exports = { syncNodeHealth };
