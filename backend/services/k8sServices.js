const k8s = require("@kubernetes/client-node");

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);

const NAMESPACE = "default";

// 🟢 CREATE DEPLOYMENT
const createDeployment = async ({ name, image, replicas, containerPort }) => {
  const deploymentManifest = {
    metadata: { name },
    spec: {
      replicas: parseInt(replicas) || 1,
      selector: {
        matchLabels: { app: name },
      },
      template: {
        metadata: {
          labels: { app: name },
        },
        spec: {
          containers: [
            {
              name,
              image,
              imagePullPolicy: "IfNotPresent",
              ports: [{ containerPort: parseInt(containerPort) || 80 }],
            },
          ],
        },
      },
    },
  };

  return await k8sAppsApi.createNamespacedDeployment({
    namespace: NAMESPACE,
    body: deploymentManifest,
  });
};

// 🟡 SCALE DEPLOYMENT
const scaleDeployment = async (name, replicas) => {
  return await k8sAppsApi.patchNamespacedDeployment({
    name,
    namespace: NAMESPACE,
    body: {
      spec: {
        replicas: parseInt(replicas),
      },
    },
    headers: {
      "Content-Type": "application/merge-patch+json",
    },
  });
};

// 🔴 DELETE DEPLOYMENT
const deleteDeployment = async (name) => {
  return await k8sAppsApi.deleteNamespacedDeployment({
    name,
    namespace: NAMESPACE,
  });
};

// 🔵 GET DEPLOYMENTS
const getDeployments = async () => {
  try {
    const res = await k8sAppsApi.listNamespacedDeployment({
      namespace: NAMESPACE,
    });

    const items = res.items || [];

    return items.map((dep) => ({
      name: dep.metadata.name,
      image: dep.spec.template.spec.containers[0]?.image || "N/A",
      replicas: dep.spec.replicas,
      status: dep.status?.availableReplicas > 0 ? "Running" : "Pending",
    }));
  } catch (error) {
    console.error("Kubernetes API Error:", error.body || error.message);
    throw error;
  }
};

module.exports = {
  createDeployment,
  getDeployments,
  deleteDeployment,
  scaleDeployment,
};
