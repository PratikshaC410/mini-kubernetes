import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { toast } from "react-toastify";

const API = process.env.REACT_APP_BACKEND_BASEURL;

const Dashboard = () => {
  const { token, logoutuser } = useAuth();
  const navigate = useNavigate();

  const [deployments, setDeployments] = useState([]);
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
      } else {
        toast.error(data.message || "Failed to fetch");
      }
    } catch (err) {
      toast.error("Server error");
    }
  };

  useEffect(() => {
    if (token) {
      fetchDeployments();
      const interval = setInterval(fetchDeployments, 10000);
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
        toast.success("Created");
        setName("");
        setImage("");
        setReplicas(1);
        setContainerPort("");
        fetchDeployments();
      }
    } catch (err) {
      toast.error("Error creating");
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
        toast.info("Scaling...");
        fetchDeployments();
      }
    } catch (err) {
      toast.error("Scaling error");
    }
  };

  const handleDelete = async (depName) => {
    if (!window.confirm(`Delete ${depName}?`)) return;
    try {
      const res = await fetch(`${API}/api/auth/deployments/${depName}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchDeployments();
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
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h2>Kubernetes Dashboard</h2>
        <button
          onClick={() => {
            logoutuser();
            navigate("/");
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <form
          onSubmit={handleCreate}
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "300px",
          }}
        >
          <label style={{ marginBottom: "5px" }}>Deployment Name:</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "15px" }}
            required
          />

          <label style={{ marginBottom: "5px" }}>Container Image:</label>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            style={{ marginBottom: "15px" }}
            required
          />

          <label style={{ marginBottom: "5px" }}>Replicas:</label>
          <input
            type="number"
            value={replicas}
            onChange={(e) => setReplicas(e.target.value)}
            style={{ marginBottom: "15px" }}
            required
          />

          <label style={{ marginBottom: "5px" }}>Port:</label>
          <input
            value={containerPort}
            onChange={(e) => setContainerPort(e.target.value)}
            style={{ marginBottom: "15px" }}
            required
          />

          <button type="submit" style={{ width: "fit-content" }}>
            Deploy
          </button>
        </form>
      </div>

      <hr />
      <h3>Your Active Deployments</h3>

      <div>
        {deployments.map((dep) => (
          <div
            key={dep.name}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              margin: "10px 0",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <strong>{dep.name}</strong>
                <p style={{ margin: "5px 0" }}>
                  Image: {dep.image} | Status: {dep.actualStatus || dep.status}
                </p>
                <p style={{ margin: "5px 0" }}>
                  Pods: {dep.availableReplicas || 0} / {dep.replicas}
                </p>
              </div>
              <div>
                <button onClick={() => viewLogs(dep.name)}>View Logs</button>
                <button
                  onClick={() => handleDelete(dep.name)}
                  style={{ marginLeft: "10px" }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div
              style={{
                marginTop: "15px",
                paddingTop: "10px",
                borderTop: "1px solid #eee",
              }}
            >
              <label>Scale Replicas: </label>
              <input
                type="number"
                min={1}
                style={{ width: "50px", marginRight: "10px" }}
                value={replicaInputs[dep.name] ?? dep.replicas}
                onChange={(e) =>
                  setReplicaInputs({
                    ...replicaInputs,
                    [dep.name]: e.target.value,
                  })
                }
              />
              <button onClick={() => handleScale(dep.name)}>
                Update Scale
              </button>
            </div>
          </div>
        ))}
      </div>

      {isLogModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              width: "80%",
              height: "80%",
              overflow: "auto",
              border: "1px solid black",
            }}
          >
            <button
              onClick={() => setIsLogModalOpen(false)}
              style={{ marginBottom: "10px" }}
            >
              Close Logs
            </button>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
              {selectedLogs || "Fetching logs..."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
