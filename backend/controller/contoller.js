const { Deployment_db } = require("./database");
const { syncPodHealth } = require("./podmanager");
const { syncNodeHealth } = require("./nodemanager");
const {
  getDeployments,
  createDeployment,
  scaleDeployment,
  deleteDeployment,
} = require("../services/k8sServices");

/**
 * The Reconciliation Loop
 * Ensures the 'Actual State' (Kubernetes) matches the 'Desired State' (MongoDB)
 */
const reconcile = async () => {
  try {
    console.log("--- Starting Reconciliation Loop ---");
    await syncNodeHealth();
    await syncPodHealth();

    const desiredStates = await Deployment_db.find({ status: "active" });

    // IMPORTANT: You need to decide if getDeployments() fetches ALL or per namespace.
    // Assuming getDeployments() now returns items with a .namespace property.
    const actualStates = await getDeployments();

    for (const desired of desiredStates) {
      // Find the actual state matching BOTH name and namespace
      const actual = actualStates.find(
        (a) =>
          a.name === desired.name &&
          a.namespace === (desired.namespace || "default"),
      );

      if (!actual) {
        console.log(
          `[RECONCILE] Missing: ${desired.name} in ${desired.namespace}. Recreating...`,
        );
        try {
          await createDeployment({
            name: desired.name,
            image: desired.image,
            replicas: desired.replicas,
            containerPort: desired.containerPort,
            namespace: desired.namespace,
            envVars: desired.envVars,
            secrets: desired.secrets,
          });
        } catch (err) {
          console.error(`[RECONCILE] Create Failed:`, err.message);
        }
        continue;
      }

      if (Number(desired.replicas) !== Number(actual.replicas)) {
        console.log(
          `[RECONCILE] Scaling ${desired.name} in ${desired.namespace}...`,
        );
        try {
          // PASS NAMESPACE TO SCALE
          await scaleDeployment(
            desired.name,
            desired.replicas,
            desired.namespace,
          );
        } catch (err) {
          console.error(`[RECONCILE] Scale Failed:`, err.message);
        }
      }
    }

    // Handle Deletions (K8s -> DB)
    for (const actual of actualStates) {
      const stillDesired = desiredStates.find(
        (d) => d.name === actual.name && d.namespace === actual.namespace,
      );

      if (!stillDesired) {
        console.log(
          `[RECONCILE] Orphan found: ${actual.name} in ${actual.namespace}. Deleting...`,
        );
        try {
          // PASS NAMESPACE TO DELETE
          await deleteDeployment(actual.name, actual.namespace);
        } catch (err) {
          console.error(`[RECONCILE] Delete Failed:`, err.message);
        }
      }
    }

    console.log("Reconciliation Complete");
  } catch (err) {
    console.error("Reconciliation Loop Error:", err.message);
  }
};
const startController = () => {
  reconcile();

  setInterval(reconcile, 10000);
};

module.exports = { startController };
