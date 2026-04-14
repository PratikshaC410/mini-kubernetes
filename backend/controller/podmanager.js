const { pod_db, Deployment_db } = require("./database");
const { k8sApiLogs } = require("../services/k8sServices");

const syncPodHealth = async () => {
  try {
    const response = await k8sApiLogs.listNamespacedPod("default");
    const pods = response.body.items;

    const syncPromises = pods.map(async (pod) => {
      const deploymentName = pod.metadata.labels.app;
      const deploymentDoc = await Deployment_db.findOne({
        name: deploymentName,
      });

      if (!deploymentDoc) return;

      // 1. Get detailed status (e.g., ImagePullBackOff instead of just Pending)
      const containerStatus = pod.status.containerStatuses?.[0];
      let currentStatus = pod.status.phase.toLowerCase();

      // If there's a specific waiting reason (like ErrImagePull), use that instead
      if (containerStatus?.state?.waiting) {
        currentStatus = containerStatus.state.waiting.reason.toLowerCase();
      }

      return await pod_db.findOneAndUpdate(
        { containerId: pod.metadata.uid },
        {
          deploymentId: deploymentDoc._id,
          containerId: pod.metadata.uid,
          podName: pod.metadata.name, // ADD THIS: So the UI can show the name
          nodeId: pod.spec.nodeName || "localhost",
          status: currentStatus,
          restartCount: containerStatus?.restartCount || 0,
        },
        { upsert: true, returnDocument: "after" }, // FIX: Removes the Mongoose warning
      );
    });

    await Promise.all(syncPromises);

    const activeUids = pods.map((p) => p.metadata.uid);
    await pod_db.deleteMany({ containerId: { $nin: activeUids } });

    console.log(`[POD MANAGER] Synced ${pods.length} containers.`);
  } catch (err) {
    console.error("Pod Manager Sync Error:", err.message);
  }
};

module.exports = { syncPodHealth };
