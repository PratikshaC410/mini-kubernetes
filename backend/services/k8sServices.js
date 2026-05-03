const k8s = require("@kubernetes/client-node");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const { encrypt, decrypt } = require("./encrypt");
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
  envVars = [],
  secrets = [],
}) => {
  const ns = namespace || "default";
  const env = [
    ...(envVars || []).map((ev) => ({ name: ev.key, value: ev.value })),
    ...(secrets || []).map((s) => ({
      name: s.key,
      value: decrypt(s.encryptedValue),
    })),
  ];
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
              env: env,
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
const getDeployments = async () => {
  try {
    // This fetches EVERY deployment in the cluster
    const res = await k8sAppsApi.listDeploymentForAllNamespaces();

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
    console.error("GET ALL NAMESPACES ERROR:", err.message);
    return [];
  }
};
const scaleDeployment = async (name, replicas, namespace) => {
  const ns = namespace || "default";

  const current = await k8sAppsApi.readNamespacedDeploymentScale(name, ns);

  current.body.spec.replicas = Number(replicas);

  return await k8sAppsApi.replaceNamespacedDeploymentScale(
    name,
    ns,
    current.body,
  );
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

const getPods = async () => {
  try {
    const res = await k8sCoreApi.listPodForAllNamespaces();

    return res.body.items.map((pod) => {
      const containerStatus = pod.status.containerStatuses?.[0];
      return {
        podName: pod.metadata.name,
        namespace: pod.metadata.namespace,
        nodeId: pod.spec.nodeName,
        status: pod.status.phase,
        restartCount: containerStatus?.restartCount || 0,
        deploymentName: pod.metadata.labels?.app,
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
  getPods,
  k8sApi: k8sCoreApi,
  k8sApiLogs: k8sCoreApi,
};
