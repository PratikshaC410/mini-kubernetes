import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { toast } from "react-toastify";

const API = process.env.REACT_APP_BACKEND_BASEURL;

const Dashboard = () => {
  const { token, logoutuser } = useAuth();
  const navigate = useNavigate();

  const [deployments, setDeployments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [replicaInputs, setReplicaInputs] = useState({});

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
        toast.error(data.message || "Failed to fetch deployments");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }
  };

  useEffect(() => {
    if (token) fetchDeployments();
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

      const data = await res.json();

      if (res.ok) {
        toast.success("Deployment created!");
        setName("");
        setImage("");
        setReplicas(1);
        setContainerPort("");
        setShowForm(false);
        fetchDeployments();
      } else {
        toast.error(data.message || "Failed to create deployment");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating deployment");
    }
  };

  const handleDelete = async (depName) => {
    try {
      const res = await fetch(`${API}/api/auth/deployments/${depName}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success("Deployment deleted");
        fetchDeployments();
      } else {
        const data = await res.json();
        toast.error(data.message || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }
  };

  const handleLogout = () => {
    logoutuser();
    navigate("/");
  };

  return (
    <div>
      <div
        style={{
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Kubernetes Dashboard</h2>
        <div>
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "New Deployment"}
          </button>
          <button onClick={handleLogout} style={{ marginLeft: "10px" }}>
            Logout
          </button>
        </div>
      </div>

      <hr />

      {showForm && (
        <div
          style={{
            border: "1px ",
          }}
        >
          <h3>Create Deployment</h3>
          <form onSubmit={handleCreate}>
            <div>
              <label>Name: </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Image: </label>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Replicas: </label>
              <input
                type="number"
                min={1}
                value={replicas}
                onChange={(e) => setReplicas(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label>Port: </label>
              <input
                type="number"
                value={containerPort}
                onChange={(e) => setContainerPort(e.target.value)}
                required
              />
            </div>
            <button type="submit" style={{ marginTop: "10px" }}>
              Deploy
            </button>
          </form>
        </div>
      )}

      <div>
        <h3>your Deployments</h3>
        {deployments.length === 0 ? (
          <p>No deployments found</p>
        ) : (
          deployments.map((dep) => (
            <div
              key={dep.name}
              style={{
                border: "1px solid #eee",
                padding: "10px",
                margin: "10px 0",
              }}
            >
              <div>
                <h4>{dep.name}</h4>
                <p>
                  <strong>Image:</strong> {dep.image} | <strong>Status:</strong>{" "}
                  {dep.status}
                </p>
              </div>

              <div style={{ marginTop: "10px" }}>
                <input
                  type="number"
                  min={1}
                  value={replicaInputs[dep.name] ?? dep.replicas}
                  onChange={(e) =>
                    setReplicaInputs((prev) => ({
                      ...prev,
                      [dep.name]: e.target.value,
                    }))
                  }
                />
                <span> replicas </span>

                <button onClick={() => handleDelete(dep.name)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
