import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { toast } from "react-toastify";

const API = process.env.REACT_APP_BACKEND_BASEURL;

const Dashboard = () => {
  const { token, logoutuser } = useAuth();
  const navigate = useNavigate();

  const [deployments, setDeployments] = useState([]);
  const [pods, setPods] = useState([]);
  const [replicaInputs, setReplicaInputs] = useState({});

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [replicas, setReplicas] = useState(1);
  const [containerPort, setContainerPort] = useState("");

  const [selectedLogs, setSelectedLogs] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const fetchDeployments = async () => {
    try {
      const res = await fetch(`${API}/api/auth/deployments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDeployments(data);
      }
    } catch (err) {
      toast.error("Failed to fetch deployments");
    }
  };

  const fetchPods = async () => {
    try {
      const res = await fetch(`${API}/api/auth/pods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPods(data);
      }
    } catch (err) {
      console.error("Error fetching pods", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDeployments();
      fetchPods();
      const interval = setInterval(() => {
        fetchDeployments();
        fetchPods();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [token]);

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
      if (res.ok) {
        toast.success("Deployment Created");
        setName("");
        setImage("");
        setReplicas(1);
        setContainerPort("");
        fetchDeployments();
      }
    } catch (err) {
      toast.error("Creation failed");
    }
  };

  const handleScale = async (depName) => {
    const newCount = replicaInputs[depName];
    if (newCount === undefined) return;
    try {
      const res = await fetch(`${API}/api/auth/deployments/scale`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: depName, replicas: Number(newCount) }),
      });
      if (res.ok) {
        toast.info("Scaling ");
        fetchDeployments();
      }
    } catch (err) {
      toast.error("Scale error");
    }
  };

  const handleDelete = async (depName) => {
    try {
      const res = await fetch(`${API}/api/auth/deployments/${depName}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchDeployments();
      toast("Deployment deleted!!");
    } catch (err) {
      toast.error("Delete error");
    }
  };

  const viewLogs = async (depName) => {
    try {
      const res = await fetch(`${API}/api/auth/deployments/logs/${depName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedLogs(data.logs);
        setIsLogModalOpen(true);
      }
    } catch (err) {
      toast.error("Log error");
    }
  };

  return (
    <div
      style={{ padding: "30px", backgroundColor: "#fff", minHeight: "100vh" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "30px",
          borderBottom: "1px solid #ddd",
          paddingBottom: "10px",
        }}
      >
        <h2>Mini-Kubernetes Dashboard</h2>
        <button
          onClick={() => {
            logoutuser();
            navigate("/");
          }}
          style={{ padding: "8px 16px" }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          marginBottom: "40px",
          padding: "20px",
          border: "1px solid #eee",
          borderRadius: "8px",
        }}
      >
        <h3>Deploy New Application</h3>
        <form
          onSubmit={handleCreate}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            maxWidth: "500px",
          }}
        >
          <label>Deployment Name </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label>Image </label>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            required
          />
          <label>Replicas </label>
          <input
            type="number"
            value={replicas}
            onChange={(e) => setReplicas(e.target.value)}
            required
          />
          <label>Port number</label>
          <input
            value={containerPort}
            onChange={(e) => setContainerPort(e.target.value)}
            required
          />
          <button type="submit" style={{ gridColumn: "span 2" }}>
            Deploy
          </button>
        </form>
      </div>

      <h3>Active Deployments & Actual State</h3>
      {deployments.map((dep) => (
        <div
          key={dep._id}
          style={{
            border: "1px solid #ccc",
            padding: "20px",
            marginBottom: "20px",
            borderRadius: "8px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>{dep.name}</strong>
              <p style={{ margin: "5px 0" }}>
                Image: {dep.image} | Desired: {dep.replicas}
              </p>
            </div>
            <div>
              <button
                onClick={() => viewLogs(dep.name)}
                style={{ marginRight: "10px" }}
              >
                View Logs
              </button>
              <button
                onClick={() => handleDelete(dep.name)}
                style={{
                  backgroundColor: "#ff4d4d",
                  color: "#fff",
                  border: "none",
                }}
              >
                Delete
              </button>
            </div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <h5 style={{ marginBottom: "10px", color: "#666" }}>
              Info about runnig pods
            </h5>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{ textAlign: "left", borderBottom: "1px solid #eee" }}
                >
                  <th style={{ padding: "8px" }}>Pod Name</th>
                  <th style={{ padding: "8px" }}>Status</th>
                  <th style={{ padding: "8px" }}>Restarts</th>
                </tr>
              </thead>
              <tbody>
                {pods.filter((p) => String(p.deploymentId) === String(dep._id))
                  .length > 0 ? (
                  pods
                    .filter((p) => String(p.deploymentId) === String(dep._id))
                    .map((pod) => (
                      <tr
                        key={pod.containerId}
                        style={{ borderBottom: "1px solid #f9f9f9" }}
                      >
                        <td style={{ padding: "8px" }}>
                          {pod.podName || pod.containerId.substring(0, 10)}
                        </td>
                        <td>{pod.status.toUpperCase()}</td>
                        <td style={{ padding: "8px" }}>{pod.restartCount}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td
                      colSpan="3"
                      style={{
                        padding: "10px",
                        textAlign: "center",
                        color: "#999",
                      }}
                    >
                      Fetching actual running pods from k8s..
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: "15px",
              paddingTop: "10px",
              borderTop: "1px solid #eee",
            }}
          >
            <label>Update Scale: </label>
            <input
              type="number"
              value={replicaInputs[dep.name] ?? dep.replicas}
              onChange={(e) =>
                setReplicaInputs({
                  ...replicaInputs,
                  [dep.name]: e.target.value,
                })
              }
              style={{ width: "50px" }}
            />
            <button onClick={() => handleScale(dep.name)}> Scale</button>
          </div>
        </div>
      ))}

      {isLogModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e1e1e",
              color: "white",
              padding: "20px",
              width: "80%",
              height: "80%",
              overflow: "auto",
            }}
          >
            <button
              onClick={() => setIsLogModalOpen(false)}
              style={{
                color: "white",
                marginBottom: "10px",
                backgroundColor: "black",
              }}
            >
              Close Logs
            </button>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {selectedLogs || "Scanning..."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
