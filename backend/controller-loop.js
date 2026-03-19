const { Deployment_db, pod_db } = require("./controller/database");

const {
  createContainer,
  stopContainer,
  removeContainer,
  inspectContainer,
} = require("./podmanager");

async function controllerLoop() {
  try {
    console.log("Controller running...");

    const deployments = await Deployment_db.find({ status: "active" });

    for (const deployment of deployments) {
      const pods = await pod_db.find({
        deploymentId: deployment._id,
      });

      const runningPods = pods.filter((p) => p.status === "running");
      const crashedPods = pods.filter((p) => p.status === "crashed");
      const activePods = pods.filter(
        (p) => p.status === "running" || p.status === "crashed",
      );
      const runningCount = activePods.length;
      const desiredReplicas = deployment.replicas;

      console.log(
        `Deployment: ${deployment.name} | Running: ${runningCount} | Desired: ${desiredReplicas}`,
      );

      //  look for  running containers
      for (const pod of runningPods) {
        const info = await inspectContainer(pod.containerId);

        if (!info || !info.State.Running) {
          console.log(`Container ${pod.containerId} crashed`);

          pod.status = "crashed";

          await pod.save();
        }
      }

      // Recreate crashed pods
      for (const pod of crashedPods) {
        console.log(`Recreating crashed pod ${pod.containerId}`);

        await removeContainer(pod.containerId);

        const newContainer = await createContainer(
          deployment.image,
          deployment.containerPort,
        );

        pod.containerId = newContainer.id;
        pod.status = "running";

        await pod.save();
      }

      // Scale Up
      if (runningCount < desiredReplicas) {
        const podsToCreate = desiredReplicas - runningCount;

        console.log(`Need to create ${podsToCreate} pods`);

        for (let i = 0; i < podsToCreate; i++) {
          const container = await createContainer(
            deployment.image,
            deployment.containerPort,
          );

          await pod_db.create({
            deploymentId: deployment._id,
            containerId: container.id,
            status: "running",
          });
        }
      }

      //  Scale Down
      if (runningCount > desiredReplicas) {
        const podsToDelete = runningCount - desiredReplicas;

        console.log(`Need to delete ${podsToDelete} pods`);

        const podtostop = runningPods.slice(0, podsToDelete);

        for (const pod of podtostop) {
          await stopContainer(pod.containerId);
          await removeContainer(pod.containerId);

          pod.status = "stopped";

          await pod.save();
        }
      }
    }
  } catch (error) {
    console.error("Controller error:", error);
  }
}

setInterval(controllerLoop, 5000);

module.exports = controllerLoop;
