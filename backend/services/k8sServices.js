const k8s = require("@kubernetes/client-node");

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

  return await k8sAppsApi.createNamespacedDeployment({
    namespace: NAMESPACE,
    body: deploymentManifest,
  });
};

// SCALE DEPLOYMENT
const scaleDeployment = async (name, replicas) => {
  return await k8sAppsApi.patchNamespacedDeployment(
    {
      name: name,
      namespace: NAMESPACE,
      body: {
        spec: {
          replicas: parseInt(replicas),
        },
      },
    },
    undefined,
    undefined,
    undefined,
    undefined,
    { headers: { "Content-Type": "application/merge-patch+json" } },
  );
};

// DELETE DEPLOYMENT
const deleteDeployment = async (name) => {
  return await k8sAppsApi.deleteNamespacedDeployment({
    name: name,
    namespace: NAMESPACE,
  });
};

// GET DEPLOYMENTS
const getDeployments = async () => {
  const res = await k8sAppsApi.listNamespacedDeployment({
    namespace: NAMESPACE,
  });
  const items = res.items || res.body?.items || [];

  return items.map((dep) => {
    const desired = dep.spec.replicas || 0;
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
};

module.exports = {
  createDeployment,
  getDeployments,
  deleteDeployment,
  scaleDeployment,
};
