const { Deployment_db } = require("./database");
const { syncPodHealth } = require("./podmanager");
const {
  getDeployments,
  createDeployment,
  scaleDeployment,
} = require("../services/k8sServices");

const reconcile = async () => {
  try {
    console.log("--- Starting Reconciliation Loop ---");

    // POD MANAGER JOB: Sync actual container health to MongoDB (pod_db)

    await syncPodHealth();

    // 2. CONTROLLER JOB: Compare Desired vs Actual at Deployment level
    const desiredStates = await Deployment_db.find({ status: "active" });
    const actualStates = await getDeployments();

    for (const desired of desiredStates) {
      const actual = actualStates.find((a) => a.name === desired.name);

      // If it exists in DB but not in K8s (Self-Healing)
      if (!actual) {
        console.log(
          `[RECONCILE] Missing Deployment: ${desired.name}. Recreating...`,
        );
        await createDeployment({
          name: desired.name,
          image: desired.image,
          replicas: desired.replicas,
          containerPort: desired.containerPort,
        });
        continue;
      }

      // If replicas are not matching (Scaling)
      if (desired.replicas !== actual.replicas) {
        console.log(
          `[RECONCILE] Replica Mismatch for ${desired.name}. Scaling ${actual.replicas} -> ${desired.replicas}`,
        );
        await scaleDeployment(desired.name, desired.replicas);
      }
    }

    console.log("--- Reconciliation Complete ---");
  } catch (err) {
    console.error("Reconciliation Loop Error:", err.message);
  }
};

const startController = () => {
  setInterval(reconcile, 10000);
};

module.exports = { startController };
