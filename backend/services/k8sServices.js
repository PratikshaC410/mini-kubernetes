const k8s = require("@kubernetes/client-node");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sAppsApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);

//  CREATE DEPLOYMENT
const createDeployment = async ({
  name,
  image,
  replicas,
  containerPort,
  namespace,
}) => {
  const ns = namespace || "default";

  // AUTO-CREATE NAMESPACE LOGIC
  try {
    // Try to read the namespace
    await k8sCoreApi.readNamespace(ns);
  } catch (err) {
    // If it doesn't exist (404), create it
    if (err.response && err.response.statusCode === 404) {
      console.log(`Namespace "${ns}" not found. Creating it...`);
      await k8sCoreApi.createNamespace({
        metadata: { name: ns },
      });
    } else {
      throw err;
    }
  }

  const k8sName = name.replace(/\s+/g, "-").toLowerCase();

  const manifest = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: k8sName,
      labels: { app: k8sName },
    },
    spec: {
      replicas: Number(replicas) || 1,
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
              ports: [{ containerPort: Number(containerPort) || 80 }],
            },
          ],
        },
      },
    },
  };

  try {
    return await k8sAppsApi.createNamespacedDeployment(ns, manifest);
  } catch (err) {
    if (err.response?.statusCode === 409) {
      console.log("Deployment already exists");
      return;
    }
    throw err;
  }
};
// DELETE
const deleteDeployment = async (name, namespace) => {
  const ns = namespace || "default";

  try {
    return await k8sAppsApi.deleteNamespacedDeployment(name, ns);
  } catch (err) {
    throw err;
  }
};

// GET DEPLOYMENTS
const getDeployments = async (namespace) => {
  const ns = namespace || "default";

  try {
    const res = await k8sAppsApi.listNamespacedDeployment(ns);

    return res.body.items.map((dep) => {
      const desired = dep.spec?.replicas || 0;
      const available = dep.status?.availableReplicas || 0;

      return {
        name: dep.metadata.name,
        namespace: dep.metadata.namespace,
        replicas: desired,
        availableReplicas: available,
        status: available >= desired ? "Running" : "Pending",
      };
    });
  } catch (err) {
    console.error("GET ERROR:", err.message);
    return [];
  }
};

//  SCALE
const scaleDeployment = async (name, replicas, namespace) => {
  const ns = namespace || "default";

  try {
    return await k8sAppsApi.patchNamespacedDeploymentScale(
      name,
      ns,
      {
        spec: { replicas: Number(replicas) },
      },
      undefined,
      undefined,
      undefined,
      undefined,
      {
        headers: {
          "Content-Type": "application/merge-patch+json",
        },
      },
    );
  } catch (err) {
    console.error("SCALE ERROR:", err.message);
    throw err;
  }
};

//  LOGS
const getPodLogs = async (podName, namespace) => {
  const ns = namespace || "default";

  try {
    const res = await k8sCoreApi.readNamespacedPodLog(podName, ns);
    return res.body;
  } catch (err) {
    throw err;
  }
};

// NODES
const getNodes = async () => {
  try {
    const res = await k8sCoreApi.listNode();

    return res.body.items.map((node) => {
      const ready = node.status.conditions.find((c) => c.type === "Ready");

      return {
        name: node.metadata.name,
        status: ready?.status === "True" ? "Ready" : "NotReady",
      };
    });
  } catch (err) {
    return [];
  }
};

module.exports = {
  createDeployment,
  deleteDeployment,
  getDeployments,
  scaleDeployment,
  getPodLogs,
  getNodes,
  k8sApi: k8sCoreApi,
  k8sApiLogs: k8sCoreApi,
};
