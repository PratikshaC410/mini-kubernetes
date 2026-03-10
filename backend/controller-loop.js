const { Deployment_db, pod_db } = require("./controller/database");

async function controllerLoop() {
  try {
    console.log("Controller running...");

    const deployments = await Deployment_db.find({ status: "active" });

    for (const deployment of deployments) {
      const runningPods = await pod_db.find({
        deploymentId: deployment._id,
        status: "running",
      });

      const crashedPods = await pod_db.find({
        deploymentId: deployment._id,
        status: "crashed",
      });

      const runningCount = runningPods.length;
      const desiredReplicas = deployment.replicas;

      console.log(
        `Deployment: ${deployment.name} | Running: ${runningCount} | Desired: ${desiredReplicas}`,
      );

      // Crash detection
      if (crashedPods.length > 0) {
        console.log(`${crashedPods.length} crashed pods detected`);

        for (const pod of crashedPods) {
          console.log(`Recreating crashed pod ${pod.containerId}`);

          pod.status = "stopped";
          await pod.save();
        }
      }

      if (runningCount < desiredReplicas) {
        const podsToCreate = desiredReplicas - runningCount;

        console.log(`Need to create ${podsToCreate} pods`);

        for (let i = 0; i < podsToCreate; i++) {
          console.log("Creating new pod...");
        }
      }

      if (runningCount > desiredReplicas) {
        const podsToDelete = runningCount - desiredReplicas;

        console.log(`Need to delete ${podsToDelete} pods`);
      }
    }
  } catch (error) {
    console.error("Controller error:", error);
  }
}

setInterval(controllerLoop, 5000);

module.exports = controllerLoop;
