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
  const [nodes, setNodes] = useState([]); // Added Node state
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
      if (res.ok) setDeployments(data);
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
      if (res.ok) setPods(data);
    } catch (err) {
      console.error("Error fetching pods", err);
    }
  };

  const fetchNodes = async () => {
    try {
      const res = await fetch(`${API}/api/auth/nodes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setNodes(data);
    } catch (err) {
      console.error("Error fetching nodes", err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDeployments();
      fetchPods();
      fetchNodes();
      const interval = setInterval(() => {
        fetchDeployments();
        fetchPods();
        fetchNodes();
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
        toast("Deployment Created");
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
        toast("Scaling ");
        fetchDeployments();
      }
    } catch (err) {
      toast("Scale error");
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
      toast("Delete error");
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
      toast("Log error");
    }
  };

  return (
    <div
      style={{
        padding: "30px",
        backgroundColor: "#f9f9f9",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "30px",
          borderBottom: "2px solid #333",
          paddingBottom: "10px",
        }}
      >
        <h2 style={{ margin: 0 }}>Mini-Kubernetes Dashboard</h2>
        <button
          onClick={() => {
            logoutuser();
            navigate("/");
          }}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            borderRadius: "4px",
            border: "1px solid #333",
          }}
        >
          Logout
        </button>
      </div>

      {/* CLUSTER OVERVIEW (Nodes) */}
      <div style={{ marginBottom: "30px" }}>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          {nodes.map((node) => (
            <div
              key={node._id}
              style={{
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                minWidth: "180px",
                backgroundColor:
                  node.status === "Ready" ? "#f0fff4" : "#fff5f5",
              }}
            >
              <div style={{ fontWeight: "bold" }}>{node.name}</div>
              <div style={{ fontSize: "12px", color: "#666" }}>
                Role: {node.role}
              </div>
              <div
                style={{
                  marginTop: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{node.status.toUpperCase()}</span>
                <span style={{ fontSize: "12px" }}>Pods: {node.podCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginBottom: "40px",
          padding: "20px",
          border: "1px solid #eee",
          borderRadius: "8px",
          backgroundColor: "#fff",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <h3>Deploy New Application</h3>
        <form
          onSubmit={handleCreate}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
            maxWidth: "600px",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Deployment Name{" "}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "90%", padding: "8px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Image{" "}
            </label>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              required
              style={{ width: "90%", padding: "8px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Replicas{" "}
            </label>
            <input
              type="number"
              value={replicas}
              onChange={(e) => setReplicas(e.target.value)}
              required
              style={{ width: "90%", padding: "8px" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Port number
            </label>
            <input
              value={containerPort}
              onChange={(e) => setContainerPort(e.target.value)}
              required
              style={{ width: "90%", padding: "8px" }}
            />
          </div>
          <button
            type="submit"
            style={{
              gridColumn: "span 2",
              padding: "10px",
              backgroundColor: "#5557f4",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Deploy
          </button>
        </form>
      </div>

      <h3>Active Deployments </h3>
      {deployments.map((dep) => (
        <div
          key={dep._id}
          style={{
            border: "1px solid #ccc",
            padding: "20px",
            marginBottom: "20px",
            borderRadius: "8px",
            backgroundColor: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong style={{ fontSize: "18px" }}>{dep.name}</strong>
              <p style={{ margin: "5px 0", color: "#555" }}>
                Image: {dep.image} | Desired: {dep.replicas}
              </p>
            </div>
            <div>
              <button
                onClick={() => viewLogs(dep.name)}
                style={{
                  marginRight: "10px",
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                View Logs
              </button>
              <button
                onClick={() => handleDelete(dep.name)}
                style={{
                  backgroundColor: "#ff4d4d",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
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
                  style={{
                    textAlign: "left",
                    borderBottom: "2px solid #eee",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <th style={{ padding: "10px" }}>Pod Name</th>
                  <th style={{ padding: "10px" }}>Node</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Restarts</th>
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
                        style={{ borderBottom: "1px solid #f2f2f2" }}
                      >
                        <td style={{ padding: "10px" }}>
                          {pod.podName || pod.containerId.substring(0, 10)}
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            fontSize: "12px",
                            color: "#666",
                          }}
                        >
                          {pod.nodeId}
                        </td>
                        <td>{pod.status.toUpperCase()}</td>
                        <td style={{ padding: "10px" }}>{pod.restartCount}</td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      style={{
                        padding: "20px",
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
              paddingTop: "15px",
              borderTop: "1px solid #eee",
            }}
          >
            <label style={{ fontWeight: "bold" }}>Update Scale: </label>
            <input
              type="number"
              value={replicaInputs[dep.name] ?? dep.replicas}
              onChange={(e) =>
                setReplicaInputs({
                  ...replicaInputs,
                  [dep.name]: e.target.value,
                })
              }
              style={{ width: "60px", padding: "5px", marginRight: "10px" }}
            />
            <button
              onClick={() => handleScale(dep.name)}
              style={{ padding: "6px 12px", cursor: "pointer" }}
            >
              {" "}
              Scale
            </button>
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
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#1e1e1e",
              color: "white",
              padding: "20px",
              width: "85%",
              height: "80%",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <button
              onClick={() => setIsLogModalOpen(false)}
              style={{
                alignSelf: "flex-end",
                color: "white",
                marginBottom: "10px",
                backgroundColor: "transparent",
                border: "1px solid #fff",
                padding: "5px 15px",
                cursor: "pointer",
              }}
            >
              Close Logs
            </button>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                overflow: "auto",
                flex: 1,
                backgroundColor: "#000",
                padding: "15px",
                borderRadius: "4px",
                color: "white",
              }}
            >
              {selectedLogs || "Scanning..."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
