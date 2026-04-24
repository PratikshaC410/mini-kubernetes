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

    //sync hardware ie nodes
    await syncNodeHealth();
    //  POD MANAGER: Sync actual container health to MongoDB
    // (Ensures your DB knows which pods are actually running)
    await syncPodHealth();

    // Get desired state from DB (only active deployments)
    const desiredStates = await Deployment_db.find({ status: "active" });
    // Get actual state from Kubernetes
    const actualStates = await getDeployments();

    //  SYNC: DB -> KUBERNETES (Create or Scale)
    for (const desired of desiredStates) {
      const actual = actualStates.find((a) => a.name === desired.name);

      // If it exists in DB but not in K8s: CREATE
      if (!actual) {
        console.log(
          `[RECONCILE] Missing Deployment: ${desired.name}. Recreating...`,
        );
        try {
          await createDeployment({
            name: desired.name,
            image: desired.image,
            replicas: desired.replicas,
            containerPort: desired.containerPort,
          });
        } catch (err) {
          console.error(
            `[RECONCILE] Create Failed for ${desired.name}:`,
            err.message,
          );
        }
        continue;
      }

      // If replicas are not matching: SCALE
      if (Number(desired.replicas) !== Number(actual.replicas)) {
        console.log(
          `[RECONCILE] Replica Mismatch for ${desired.name}. Scaling ${actual.replicas} -> ${desired.replicas}`,
        );
        try {
          await scaleDeployment(desired.name, desired.replicas);
        } catch (err) {
          console.error(
            `[RECONCILE] Scale Failed for ${desired.name}:`,
            err.message,
          );
        }
      }
    }

    //  KUBERNETES -> DB :-delete
    // If it exists in K8s but NOT in  DB: DELETE
    for (const actual of actualStates) {
      const stillDesired = desiredStates.find((d) => d.name === actual.name);

      if (!stillDesired) {
        console.log(` Deployment found: ${actual.name}. Deleting from K8s...`);
        try {
          await deleteDeployment(actual.name);
          console.log(` Successfully deleted ${actual.name}`);
        } catch (err) {
          console.error(` Delete Failed for ${actual.name}:`, err.message);
        }
      }
    }

    console.log("Reconciliation Complete");
  } catch (err) {
    console.error("Reconciliation Loop  Error:", err.message);
  }
};

const startController = () => {
  reconcile();

  setInterval(reconcile, 10000);
};

module.exports = { startController };
