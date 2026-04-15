import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { toast } from "react-toastify";

const API = process.env.REACT_APP_BACKEND_BASEURL;

const Dashboard = () => {
  const { token, logoutuser } = useAuth();
  const navigate = useNavigate();

  // State Management
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
      if (res.ok) setDeployments(data);
    } catch (err) {
      toast.error("Error fetching deployments");
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
      if (res.ok) {
        toast.success("Deployment Triggered");
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
    try {
      const res = await fetch(`${API}/api/auth/deployments/scale`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: depName, replicas: Number(newCount) }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.info("Scaling request sent");
        fetchDeployments();
      } else {
        toast.error(`Error: ${data.error || data.msg}`);
      }
    } catch (err) {
      toast.error("Network error connecting to backend");
    }
  };

  const handleDelete = async (depName) => {
    if (!window.confirm(`Are you sure you want to delete ${depName}?`)) return;
    try {
      const res = await fetch(`${API}/api/auth/deployments/${depName}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.warning("Deployment marked for deletion");
        fetchDeployments();
      }
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
      toast.error("Could not fetch logs");
    }
  };

  return (
    <div
      style={{
        padding: "30px",

        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "30px",
          borderBottom: "2px solid #333",
          paddingBottom: "10px",
        }}
      >
        <button
          onClick={() => {
            logoutuser();
            navigate("/");
          }}
          style={{ padding: "10px 20px", cursor: "pointer" }}
        >
          Logout
        </button>
      </div>

      <div
        style={{
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "40px",
        }}
      >
        <h3>Deploy New Application</h3>
        <form onSubmit={handleCreate}>
          <div>
            <label>Name:</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
              required
            />
          </div>
          <div>
            <label>Image:</label>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
              required
            />
          </div>
          <div>
            <label>Replicas:</label>
            <input
              type="number"
              value={replicas}
              onChange={(e) => setReplicas(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
              required
            />
          </div>
          <div>
            <label>Port:</label>
            <input
              value={containerPort}
              onChange={(e) => setContainerPort(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
              required
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "10px",

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
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
                {dep.name}
              </h4>
              <p style={{ margin: "5px 0" }}>
                Image: <code>{dep.image}</code>
              </p>
              <p style={{ margin: "5px 0" }}>
                Desired Replicas: <strong>{dep.replicas}</strong>
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
                  backgroundColor: "#dc3545",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "4px",
                }}
              >
                Delete
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: "20px",
              borderTop: "1px solid #f1f1f1",
              paddingTop: "15px",
            }}
          >
            <label style={{ fontSize: "14px", marginRight: "10px" }}>
              Update Desired Replicas:
            </label>
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
            <button onClick={() => handleScale(dep.name)}>Confirm Scale</button>
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
              color: "#fff",
              padding: "20px",
              width: "90%",
              height: "80%",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <h4> Logs</h4>
              <button
                onClick={() => setIsLogModalOpen(false)}
                style={{
                  background: "none",
                  color: "white",
                  border: "1px solid white",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
            <pre
              style={{
                flex: 1,
                overflow: "auto",

                padding: "15px",
                borderRadius: "4px",
                fontSize: "13px",
              }}
            >
              {selectedLogs || "Looking for logs..."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
