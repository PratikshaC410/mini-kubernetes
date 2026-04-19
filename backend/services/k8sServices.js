const k8s = require("@kubernetes/client-node");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
const k8sApiLogs = kc.makeApiClient(k8s.CoreV1Api);
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
    // Log the actual error from K8s
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
const scaleDeployment = async (name, replicas) => {
  try {
    const namespace = "default";
    const cluster = kc.getCurrentCluster();
    const serverUrl = cluster.server.replace("localhost", "127.0.0.1");
    const url = `${serverUrl}/apis/apps/v1/namespaces/${namespace}/deployments/${name}/scale`;

    // Create an empty options object
    const opts = {};

    //   the K8s library puts the 'Authorization' header into 'opts'
    await kc.applyToRequest(opts);

    //   fetching, merging K8s headers with our Content-Type
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        ...opts.headers, //   This includes the Bearer token
        "Content-Type": "application/merge-patch+json",
      },
      body: JSON.stringify({
        spec: { replicas: Number(replicas) },
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || `Status: ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    console.error("FINAL SCALE ERROR:", err.message);
    throw err;
  }
};
// Fetch logs from a specific pod
const getPodLogs = async (podName) => {
  try {
    const namespace = "default";
    // .readNamespacedPodLog returns a plain text string of the logs
    const response = await k8sApiLogs.readNamespacedPodLog(podName, namespace);
    return response.body;
  } catch (err) {
    console.error("K8s Log Error:", err.response?.body || err.message);
    throw err;
  }
};
module.exports = {
  createDeployment,
  getDeployments,
  deleteDeployment,
  scaleDeployment,
  getPodLogs,
  k8sApiLogs,
};
