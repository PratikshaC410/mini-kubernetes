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
  const [envVars, setEnvVars] = useState([{ key: "", value: "" }]);
  const [secrets, setSecrets] = useState([{ key: "", value: "" }]);
  const [replicaInputs, setReplicaInputs] = useState({});

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [replicas, setReplicas] = useState(1);
  const [containerPort, setContainerPort] = useState("");
  const [namespace, setNamespace] = useState("");
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
  const handleAddEnv = () => setEnvVars([...envVars, { key: "", value: "" }]);
  const handleAddSecret = () =>
    setSecrets([...secrets, { key: "", value: "" }]);

  const updateEnv = (index, field, val) => {
    const updated = [...envVars];
    updated[index][field] = val;
    setEnvVars(updated);
  };

  const updateSecret = (index, field, val) => {
    const updated = [...secrets];
    updated[index][field] = val;
    setSecrets(updated);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    // Filter out any empty rows before sending
    const filteredEnv = envVars.filter((ev) => ev.key && ev.value);
    const filteredSecrets = secrets.filter((s) => s.key && s.value);

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
          namespace,
          envVars: filteredEnv, // Pass ConfigMaps
          secrets: filteredSecrets, // Pass Secrets
        }),
      });

      if (res.ok) {
        toast.success("Deployment Created");
        setName("");
        setImage("");
        setReplicas(1);
        setContainerPort("");
        setNamespace("");

        setEnvVars([{ key: "", value: "" }]);
        setSecrets([{ key: "", value: "" }]);

        fetchDeployments();
      } else {
        const errorData = await res.json();
        toast.error(`Server Error: ${errorData.message || "Internal Error"}`);
      }
    } catch (err) {
      toast.error("Network failed. Is the backend running?");
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
        body: JSON.stringify({
          name: depName,
          replicas: Number(newCount),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast("Scaling...");
        await fetchDeployments();
        await fetchPods();

        setTimeout(() => {
          fetchDeployments();
          fetchPods();
        }, 3000);
      } else {
        toast.error(`Error: ${data.error || data.msg}`);
      }
    } catch (err) {
      console.error("Frontend Scale Error:", err);
      toast("Network error: Could not reach the server");
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
          <div>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Namespace{" "}
            </label>
            <input
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              required
              style={{ width: "90%", padding: "8px" }}
            />
          </div>
          <div style={{ gridColumn: "span 2", marginTop: "10px" }}>
            <h4 style={{ marginBottom: "10px" }}>
              Environment Variables (ConfigMaps)
            </h4>
            {envVars.map((ev, index) => (
              <div
                key={index}
                style={{ display: "flex", gap: "10px", marginBottom: "5px" }}
              >
                <input
                  placeholder="KEY"
                  value={ev.key}
                  onChange={(e) => updateEnv(index, "key", e.target.value)}
                  style={{ flex: 1, padding: "5px" }}
                />
                <input
                  placeholder="VALUE"
                  value={ev.value}
                  onChange={(e) => updateEnv(index, "value", e.target.value)}
                  style={{ flex: 1, padding: "5px" }}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddEnv}
              style={{ fontSize: "12px", marginTop: "5px", cursor: "pointer" }}
            >
              + Add Variable
            </button>
          </div>

          <div style={{ gridColumn: "span 2", marginTop: "10px" }}>
            <h4 style={{ marginBottom: "10px" }}>
              Secrets (Encrypted Passwords)
            </h4>
            {secrets.map((s, index) => (
              <div
                key={index}
                style={{ display: "flex", gap: "10px", marginBottom: "5px" }}
              >
                <input
                  placeholder="SECRET_KEY"
                  value={s.key}
                  onChange={(e) => updateSecret(index, "key", e.target.value)}
                  style={{ flex: 1, padding: "5px" }}
                />
                <input
                  type="password"
                  placeholder="SECRET_VALUE"
                  value={s.value}
                  onChange={(e) => updateSecret(index, "value", e.target.value)}
                  style={{ flex: 1, padding: "5px" }}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddSecret}
              style={{ fontSize: "12px", marginTop: "5px", cursor: "pointer" }}
            >
              + Add Secret
            </button>
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
                {pods.filter((p) => p.deploymentName === dep.name).length >
                0 ? (
                  pods
                    .filter((p) => p.deploymentName === dep.name)
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
                backgroundColor: "#ff4d4d",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "4px",
                cursor: "pointer",
                alignSelf: "flex-end",
              }}
            >
              Close Logs
            </button>
            <pre
              style={{
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
