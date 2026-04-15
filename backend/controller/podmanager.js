const { pod_db, Deployment_db } = require("./database");
const { k8sApiLogs } = require("../services/k8sServices");

const syncPodHealth = async () => {
  try {
    // 1. Fetch current pods from the Minikube cluster
    const response = await k8sApiLogs.listNamespacedPod("default");
    const pods = response.body.items;

    const syncPromises = pods.map(async (pod) => {
      // 2. Extract the app label (this connects the pod to the deployment)
      const appLabel = pod.metadata.labels.app;

      // 3. Find the parent Deployment in MongoDB using the label
      const parentDeployment = await Deployment_db.findOne({ name: appLabel });

      // 4. Only sync if the pod belongs to a deployment we manage
      if (parentDeployment) {
        const containerStatus = pod.status.containerStatuses?.[0];

        // Determine the detailed status (Running vs specific Waiting reasons)
        let currentStatus = pod.status.phase.toLowerCase();
        if (containerStatus?.state?.waiting) {
          currentStatus = containerStatus.state.waiting.reason.toLowerCase();
        }

        return await pod_db.findOneAndUpdate(
          { containerId: pod.metadata.uid }, // Unique K8s identifier
          {
            deploymentId: parentDeployment._id, // THE LINK: Connects pod to Dashboard card
            containerId: pod.metadata.uid,
            podName: pod.metadata.name,
            nodeId: pod.spec.nodeName || "minikube",
            status: currentStatus,
            restartCount: containerStatus?.restartCount || 0,
          },
          {
            upsert: true,
            returnDocument: "after", // Fixes Mongoose deprecation warning
          },
        );
      }
    });

    // Execute all sync operations
    await Promise.all(syncPromises);

    // 5. Cleanup: Remove pods from MongoDB that no longer exist in the cluster
    const activeUids = pods.map((p) => p.metadata.uid);
    await pod_db.deleteMany({ containerId: { $nin: activeUids } });

    console.log(`[POD MANAGER] Successfully synced ${pods.length} containers.`);
  } catch (err) {
    console.error("Pod Manager Sync Error:", err.message);
  }
};

module.exports = { syncPodHealth };
