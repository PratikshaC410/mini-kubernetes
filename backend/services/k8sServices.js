const k8s = require("@kubernetes/client-node");
const { PatchUtils } = k8s;
const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
const NAMESPACE = "default";

// CREATE DEPLOYMENT

const createDeployment = async ({ name, image, replicas, containerPort }) => {
  const k8sName = name.replace(/\s+/g, "-").toLowerCase();

  const deploymentManifest = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: k8sName,
      labels: { app: k8sName },
    },
    spec: {
      replicas: parseInt(replicas) || 1,
      selector: {
        matchLabels: { app: k8sName },
      },
      template: {
        metadata: {
          labels: { app: k8sName },
        },
        spec: {
          containers: [
            {
              name: `container-${k8sName}`,
              image: image || "registry.k8s.io/pause:3.10",
              imagePullPolicy: "IfNotPresent",
              ports: [{ containerPort: parseInt(containerPort) || 80 }],
            },
          ],
        },
      },
    },
  };

  try {
    const response = await k8sAppsApi.createNamespacedDeployment(
      NAMESPACE,
      deploymentManifest,
    );
    return response.body || response;
  } catch (error) {
    console.error(
      "K8s API Error (Create):",
      error.response?.body || error.message,
    );
    throw error;
  }
};

//  DELETE DEPLOYMENT

const deleteDeployment = async (name) => {
  try {
    const response = await k8sAppsApi.deleteNamespacedDeployment(
      name,
      NAMESPACE,
    );
    return response.body || response;
  } catch (error) {
    console.error(
      "K8s API Error (Delete):",
      error.response?.body || error.message,
    );
    throw error;
  }
};

//  GET DEPLOYMENTS

const getDeployments = async () => {
  try {
    const res = await k8sAppsApi.listNamespacedDeployment(NAMESPACE);

    const items = res.body ? res.body.items : res.items || [];

    return items.map((dep) => {
      const desired = dep.spec?.replicas || 0;
      const available = dep.status?.availableReplicas || 0;

      return {
        name: dep.metadata.name,
        image: dep.spec.template.spec.containers[0]?.image || "N/A",
        replicas: desired,
        availableReplicas: available,
        status: available >= desired && desired > 0 ? "Running" : "Pending",
        creationTimestamp: dep.metadata.creationTimestamp,
      };
    });
  } catch (error) {
    console.error(
      "K8s API Error (Get):",
      error.response?.body || error.message,
    );
    return [];
  }
};
// SCALE DEPLOYMENT

const scaleDeployment = async (name, replicas) => {
  try {
    const namespace = "default";

    const patch = {
      spec: {
        replicas: Number(replicas),
      },
    };

    const response = await k8sAppsApi.patchNamespacedDeploymentScale(
      name,
      namespace,
      patch,
      undefined, // pretty
      undefined, // dryRun
      undefined, // fieldManager
      undefined, // fieldValidation
      undefined, // options
      PatchUtils.PATCH_FORMAT_MERGE_PATCH,
    );

    return response.body;
  } catch (err) {
    console.error("K8s API Error Status:", err.response?.statusCode);
    console.error(
      "K8s API Error Message:",
      err.response?.body?.message || err.message,
    );
    throw err;
  }
};
module.exports = {
  createDeployment,
  getDeployments,
  deleteDeployment,
  scaleDeployment,
};
