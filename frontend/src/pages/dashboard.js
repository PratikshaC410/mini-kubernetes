import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { toast } from "react-toastify";

const API = process.env.REACT_APP_BACKEND_BASEURL;

const Dashboard = () => {
  const { token, logoutuser } = useAuth();
  const navigate = useNavigate();

  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [podsMap, setPodsMap] = useState({});
  const [logsMap, setLogsMap] = useState({});

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [replicas, setReplicas] = useState(1);
  const [containerPort, setContainerPort] = useState("");

  const fetchDeployments = async () => {
    try {
      const res = await fetch(`${API}/api/auth/deployments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDeployments(data);
      } else {
        toast(data.message || "Failed to fetch deployments");
      }
    } catch (err) {
      console.error(err);
      toast("Server error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPods = async (deploymentId) => {
    try {
      const res = await fetch(
        `${API}/api/auth/deployments/${deploymentId}/pods`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (res.ok) {
        setPodsMap((prev) => ({ ...prev, [deploymentId]: data }));
      } else {
        toast(data.message || "Failed to fetch pods");
      }
    } catch (err) {
      console.error(err);
      toast("Server error");
    }
  };

  const fetchPodLogs = async (depId, podId) => {
    try {
      const res = await fetch(
        `${API}/api/auth/deployments/${depId}/pods/${podId}/logs`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setLogsMap((prev) => ({ ...prev, [podId]: data }));
    } catch (err) {
      toast("Failed to fetch logs");
    }
  };

  useEffect(() => {
    fetchDeployments();
  }, []);

  // auto refresh pods every 5s when expanded
  useEffect(() => {
    if (!expandedId) return;
    fetchPods(expandedId);
    const interval = setInterval(() => fetchPods(expandedId), 5000);
    return () => clearInterval(interval);
  }, [expandedId]);

  const handleTogglePods = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/auth/deployments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          image,
          replicas,
          containerPort: Number(containerPort),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast("Deployment created!");
        setName("");
        setImage("");
        setReplicas(1);
        setContainerPort("");
        setShowForm(false);
        fetchDeployments();
      } else {
        toast(data.message || "Failed to create deployment");
      }
    } catch (err) {
      console.error(err);
      toast("Server error");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/api/auth/deployments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        toast("Deployment deleted");
        if (expandedId === id) setExpandedId(null);
        fetchDeployments();
      } else {
        toast(data.message || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      toast("Server error");
    }
  };

  const handleScale = async (id, currentReplicas, direction) => {
    const newReplicas =
      direction === "up"
        ? currentReplicas + 1
        : Math.max(1, currentReplicas - 1);

    try {
      const res = await fetch(`${API}/api/auth/deployments/${id}/scale`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ replicas: newReplicas }),
      });

      const data = await res.json();

      if (res.ok) {
        toast(`Scaled to ${newReplicas} replicas`);
        fetchDeployments();
      } else {
        toast(data.message || "Failed to scale");
      }
    } catch (err) {
      console.error(err);
      toast("Server error");
    }
  };

  const handleLogout = () => {
    logoutuser();
    navigate("/");
  };

  return (
    <div>
      <div>
        <h2>Mini Kubernetes</h2>
        <div>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ New Deployment"}
          </button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {showForm && (
        <div>
          <h3>Create Deployment</h3>
          <form onSubmit={handleCreate}>
            <div>
              <label>Deployment Name:</label>
              <input
                type="text"
                placeholder="e.g. my-app"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Docker Image:</label>
              <input
                type="text"
                placeholder="e.g. nginx:latest"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Replicas:</label>
              <input
                type="number"
                min={1}
                value={replicas}
                onChange={(e) => setReplicas(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label>Container Port:</label>
              <input
                type="number"
                placeholder="e.g. 80"
                value={containerPort}
                onChange={(e) => setContainerPort(e.target.value)}
                required
              />
            </div>
            <button type="submit">Deploy</button>
          </form>
        </div>
      )}

      <div>
        <h3>Your Deployments</h3>

        {loading ? (
          <p>Loading...</p>
        ) : deployments.length === 0 ? (
          <p>No deployments yet. Click "+ New Deployment" to get started.</p>
        ) : (
          deployments.map((dep) => (
            <div key={dep._id}>
              <div>
                <h4>{dep.name}</h4>
                <p>{dep.image}</p>
                <span>{dep.status}</span>
              </div>

              <div>
                <button
                  onClick={() => handleScale(dep._id, dep.replicas, "down")}
                >
                  −
                </button>
                <span>{dep.replicas} replicas</span>
                <button
                  onClick={() => handleScale(dep._id, dep.replicas, "up")}
                >
                  +
                </button>

                <button onClick={() => handleTogglePods(dep._id)}>
                  {expandedId === dep._id ? "Hide Pods" : "View Pods"}
                </button>

                <button onClick={() => handleDelete(dep._id)}>Delete</button>
              </div>

              {expandedId === dep._id && (
                <div>
                  {!podsMap[dep._id] ? (
                    <p>Loading pods...</p>
                  ) : podsMap[dep._id].length === 0 ? (
                    <p>No pods yet.</p>
                  ) : (
                    podsMap[dep._id].map((pod) => (
                      <div key={pod._id}>
                        <p>Status: {pod.status}</p>
                        <p>Container ID: {pod.containerId.slice(0, 12)}</p>
                        <p>Restarts: {pod.restartCount}</p>
                        <p>
                          Created: {new Date(pod.createdAt).toLocaleString()}
                        </p>

                        {pod.status === "crashed" && pod.crashReason && (
                          <p style={{ color: "red" }}>
                            Reason: {pod.crashReason}
                          </p>
                        )}
                        {pod.status === "crashed" && (
                          <button
                            onClick={() => fetchPodLogs(dep._id, pod._id)}
                          >
                            View Logs
                          </button>
                        )}

                        {logsMap[pod._id] && <pre>{logsMap[pod._id].logs}</pre>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
